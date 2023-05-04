import https from 'https';
import { IncomingMessage } from 'http';
import { fetchTokens, requestQuote } from '../heplers/requestCreator';
import { tokensToFind } from '../1inchApiMaps/tokenAddresses';
import { withDecimals, withoutDecimals, percentageDifference, findExtremes } from '../heplers/math';
import { chainsData } from '../1inchApiMaps/networks';

import dotenv from 'dotenv';
import { IChainsData, IComparedTokens, IFetchedTokens, IFetchedTokensListByNetwork, ITokensData, ITokensToFetch, ITokensToFind, IUSDTTokensToFetch } from './modules';

dotenv.config();
const { QUEUE_STEP, SLEEP_PERIOD_AFTER_API_ERROR_IN_MS, CHECK_PERIOD_IN_MS, ACTIVE_WORK_PERIOD_IN_MS, REST_PERIOD_IN_MS, HTTP_PROXY } = process.env;

const allowablePercentageDifference = 1;

interface ITokenData {
    address: string;
    symbol: string;
    decimals: number;
}

class PriceCheckerSvc {
    tokensToFind: ITokensToFind;
    tokensToFetch: ITokensToFetch | null;
    USDTToFetch: IUSDTTokensToFetch | null;
    triggerFn: ((triggeredTokens: IComparedTokens) => void) | null;
    chainsData: IChainsData;
    queue: {
        current: number;
        max: number;
    };
    activeWorkTimer: Date;

    constructor() {
        this.tokensToFetch = null;
        this.USDTToFetch = null;
        this.tokensToFind = tokensToFind;
        this.triggerFn = null;
        this.chainsData = chainsData;
        this.queue = {
            current: 0,
            max: 0,
        };
        this.activeWorkTimer = new Date();
    }

    async fetchAddresses() {
        const tokens = Object.keys(this.chainsData).reduce((acc, networkId) => {
            acc[networkId] = {};
            return acc;
        }, {} as IFetchedTokensListByNetwork);


        const promises = Object.keys(this.chainsData).map((network) => {
            return new Promise<void>((resolve, reject) => {
                https.get(fetchTokens(network), (resp) => {
                    let response = '';
                    resp.setEncoding('utf8');
                    resp.on('data', (chunk) => {
                        response += chunk;
                    });
                    resp.on('end', () => {
                        const { statusCode } = resp;
                        const validResponse = (statusCode as number) >= 200 && (statusCode as number) <= 299;
                        if (!validResponse) {
                            reject();
                            return;
                        }
                        tokens[network] = JSON.parse(response).tokens as { [key: string]: ITokenData };
                        resolve();
                    });
                });
            });
        });

        Promise.all(promises)
            .catch(() => {
                throw Error("CAN'T LOAD TOKENS!");
            })
            .then(() => {
                this.prepareFetchedAddresses(tokens);
            });
    }

    prepareFetchedAddresses(data: IFetchedTokensListByNetwork) {
        const result = Object.keys(this.tokensToFind).reduce((acc, symbol) => {
            acc[symbol] = {};
            return acc;
        }, {} as ITokensToFetch);

        Object.keys(data).forEach((networkId) => {
            const networkTokens = Object.values(data[networkId]) as unknown as ITokenData[];
            Object.keys(this.tokensToFind).forEach((symbol) => {
                const foundSymbol = networkTokens.find((token) => {
                    return token.symbol === (this.tokensToFind[symbol][networkId] !== undefined ? this.tokensToFind[symbol][networkId] : symbol);
                });

                if (foundSymbol) {
                    result[symbol][networkId] = {
                        address: foundSymbol.address,
                        decimals: foundSymbol.decimals,
                        symbol: this.tokensToFind[symbol][networkId],
                    };
                }
            });
        });

        const { USDTToFetch, TokensToFetch } = Object.keys(result).reduce(
            (acc, symbol) => {
                if (symbol !== 'USDT') {
                    acc.TokensToFetch[symbol] = result[symbol];
                } else {
                    acc.USDTToFetch = result[symbol];
                }

                return acc;
            },
            {
                USDTToFetch: {},
                TokensToFetch: {},
            } as {
                USDTToFetch: IUSDTTokensToFetch;
                TokensToFetch: ITokensToFetch;
            },
        );

        console.log('prepared tokens to fetch: ', Object.keys(TokensToFetch));

        this.tokensToFetch = TokensToFetch;
        this.USDTToFetch = USDTToFetch;
        this.queue.max = Object.keys(this.tokensToFetch).length;
    }

    startPriceChecking(sendPriceDifferenceTrigger: (triggeredTokens: IComparedTokens) => void) {
        this.triggerFn = sendPriceDifferenceTrigger;
        this.checkPricesByQueue();
    }

    async checkPricesByQueue() {
        setTimeout(async () => {
            if (!this.triggerFn) return;
            await this.checkOnRestPeriod();
            const prices = await this.checkPrices();
            if (!prices) return;
            const comparedPrices = this.comparePrices(prices);
            console.log('triggered', comparedPrices);
            if (Object.keys(comparedPrices).length) this.triggerFn(comparedPrices);
        }, CHECK_PERIOD_IN_MS as unknown as number);
    }

    async sendRequests(
        tokensToFetch: string[],
        tokensData: {
            [key: string]: {
                [key: string]: {
                    from: any;
                    to: any;
                };
            };
        },
    ) {
        const responseData = tokensToFetch.reduce(
            (acc, symbol) => {
                acc[symbol] = {};
                return acc;
            },
            {} as {
                [key: string]: {
                    [key: string]: number;
                };
            },
        );

        const promises = tokensToFetch.reduce((acc, tokenSymbol) => {
            return [
                ...acc,
                ...Object.keys(this.tokensToFetch ? this.tokensToFetch[tokenSymbol] : []).map<any>((chainId) => {
                    if (!tokensData[tokenSymbol][chainId]) return;

                    const fromTokenData = tokensData[tokenSymbol][chainId].from;
                    const toTokenData = tokensData[tokenSymbol][chainId].to;
                    return this.createRequest(
                        chainId as unknown as string,
                        fromTokenData.address,
                        toTokenData.address,
                        withDecimals(fromTokenData.amount, fromTokenData.decimals),
                        (resp, resolve, reject) => {
                            let response = '';
                            resp.setEncoding('utf8');
                            resp.on('data', (chunk: string) => {
                                response += chunk;
                            });
                            resp.on('end', () => {
                                const { statusCode } = resp;
                                const validResponse = (statusCode as number) >= 200 && (statusCode as number) <= 299;
                                if (!validResponse) {
                                    reject({
                                        statusCode,
                                        token: tokenSymbol,
                                        network: this.chainsData[chainId].CHAIN_NAME,
                                    });
                                    return;
                                }

                                responseData[tokenSymbol][this.chainsData[chainId].CHAIN_NAME] = withoutDecimals(JSON.parse(response).toTokenAmount, toTokenData.decimals);
                                resolve();
                            });
                        },
                    );
                }),
            ];
        }, [] as (Promise<void> | void)[]);

        await Promise.all(promises);
        return responseData;
    }

    async checkPrices() {
        if (!this.tokensToFetch || !this.USDTToFetch) {
            this.rollbackQueue();
            this.checkPricesByQueue();
            return null;
        }

        const nextQueue = this.nextQueueStep();
        console.log(nextQueue);

        const responseData = nextQueue.reduce<IFetchedTokens>((acc, symbol) => {
            acc[symbol] = {
                buy: {},
                sell: {},
            };
            return acc;
        }, {});

        const { buy, sell } = nextQueue.reduce(
            (acc, tokenSymbol) => {
                acc.sell[tokenSymbol] = {};
                acc.buy[tokenSymbol] = {};
                Object.keys(this.tokensToFetch ? this.tokensToFetch[tokenSymbol] : []).forEach((chainId) => {
                    acc.buy[tokenSymbol][chainId] = {
                        from: {
                            decimals: this.USDTToFetch?.[chainId].decimals as unknown as number,
                            address: this.USDTToFetch?.[chainId].address as unknown as string,
                            amount: 1000,
                        },
                        to: {
                            ...this.tokensToFetch?.[tokenSymbol][chainId],
                        },
                    };

                    acc.sell[tokenSymbol][chainId] = {
                        from: {
                            ...this.tokensToFetch?.[tokenSymbol][chainId],
                            amount: null,
                        },
                        to: {
                            decimals: this.USDTToFetch?.[chainId].decimals as unknown as number,
                            address: this.USDTToFetch?.[chainId].address as unknown as string,
                        },
                    };
                });

                return acc;
            },
            {
                buy: {},
                sell: {},
            } as ITokensData,
        );

        try {
            const buyFetchedPrices = await this.sendRequests(nextQueue, buy);
            const sellDataWithCorrectedAmount = Object.keys(sell).reduce((acc, tokenSymbol) => {
                Object.keys(sell[tokenSymbol]).forEach((chainId) => {
                    const largestPriceForBuy = findExtremes(Object.values(buyFetchedPrices[tokenSymbol]))[1];
                    acc[tokenSymbol][chainId].from.amount = largestPriceForBuy;
                });
                return acc;
            }, sell);

            const sellFetchedPrices = await this.sendRequests(nextQueue, sellDataWithCorrectedAmount);

            const finishResponse = Object.keys(responseData).reduce((responses, symbol) => {
                responses[symbol].buy = buyFetchedPrices[symbol];
                responses[symbol].sell = sellFetchedPrices[symbol];

                return responses;
            }, responseData);

            this.checkPricesByQueue();

            return finishResponse;
        } catch (e) {
            console.log('CAUGHT ERROR', e);
            this.rollbackQueue();
            console.warn('startSleep');
            await this.sleep(+(SLEEP_PERIOD_AFTER_API_ERROR_IN_MS as string) - +(CHECK_PERIOD_IN_MS as string));
            console.warn('endSleep');
            this.checkPricesByQueue();
            return null;
        }
    }

    createRequest(
        chainId: string,
        fromAddress: string,
        toAddress: string,
        amount: number,
        responseFn: (resp: IncomingMessage, resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => void,
    ) {
        return new Promise<void>((resolve, reject) => {
            try {
                https.get(requestQuote(chainId, fromAddress, toAddress, amount), (resp) => {
                    responseFn(resp, resolve, reject);
                });
            } catch (e) {
                console.warn(e);
            }
        });
    }

    comparePrices(data: IFetchedTokens) {
        return Object.keys(data).reduce((acc, tokenSymbol) => {
            const pricesArrForBuy = Object.values(data[tokenSymbol].buy);
            const extremesForBuy = findExtremes(pricesArrForBuy);
            const pricesArrForSell = Object.values(data[tokenSymbol].sell);
            const extremesForSell = findExtremes(pricesArrForSell);
            const percentageDifferenceResult = percentageDifference(1000, extremesForSell[1]);
            const networkForBuy = Object.keys(data[tokenSymbol].buy).find((network) => data[tokenSymbol].buy[network] === extremesForBuy[1]) as unknown as string;
            const networkForSell = Object.keys(data[tokenSymbol].sell).find((network) => data[tokenSymbol].sell[network] === extremesForSell[1]) as unknown as string;
            if (percentageDifferenceResult >= allowablePercentageDifference && networkForBuy !== networkForSell) {
                acc[tokenSymbol] = {
                    min: {
                        network: networkForBuy,
                        priceInUsdt: 1000,
                        willGetInToken: extremesForBuy[1],
                    },
                    max: {
                        network: networkForSell,
                        price: extremesForSell[1],
                    },
                };
            }
            return acc;
        }, {} as IComparedTokens);
    }

    async checkOnRestPeriod() {
        if (new Date().getTime() - this.activeWorkTimer.getTime() >= +(ACTIVE_WORK_PERIOD_IN_MS as string)) {
            console.log('START REST PERIOD');
            await this.sleep(+(REST_PERIOD_IN_MS as string));
            this.activeWorkTimer = new Date();
            console.log('END REST PERIOD');
        }
    }

    sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    nextQueueStep() {
        const nextQueue = Object.keys(this.tokensToFetch || []).slice(
            this.queue.current,
            this.queue.current + Number(QUEUE_STEP) >= this.queue.max ? this.queue.max : this.queue.current + Number(QUEUE_STEP),
        );

        this.queue.current = this.queue.current + Number(QUEUE_STEP) >= this.queue.max ? 0 : this.queue.current + Number(QUEUE_STEP);

        return nextQueue;
    }

    rollbackQueue() {
        this.queue.current = this.queue.current - Number(QUEUE_STEP);
    }
}

export default new PriceCheckerSvc();
