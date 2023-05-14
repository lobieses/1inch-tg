import https from 'https';
import { IncomingMessage } from 'http';
import { injectable, inject } from 'inversify';
import { fetchTokens, requestQuote } from './utils/requestCreator';
import { withDecimals, withoutDecimals, findExtremes } from './utils/math';

import { IChainsData, IComparedTokens, ITokensInCheck, ITokensList, ITokenData, ITokensData, ITokensMap, IUSDTTokenMap, ITokensToFind } from '@type/types';
import { TYPES } from '../../DI/types';
import { IPriceHandlerSvc } from '@services/priceChecker/priceHandlerSvc';

export interface IPriceCheckerSvc {
    prepareAddressesMap: (
        chainIds: string[],
        tokensToFind: ITokensToFind,
    ) => Promise<{
        commonTokensMap: ITokensMap;
        USDTTokenMap: IUSDTTokenMap;
    }>;
    checkPrices: (nextQueue: string[], commonTokensMap: ITokensMap, USDTTokenMap: IUSDTTokenMap, chainsData: IChainsData) => Promise<IComparedTokens>;
}

@injectable()
export class PriceCheckerSvc implements IPriceCheckerSvc {
    constructor(@inject(TYPES.IPriceHandlerSvc) private readonly priceHandlerSvc: IPriceHandlerSvc) {}

    public async prepareAddressesMap(chainIds: string[], tokensToFind: ITokensToFind) {
        const tokens = chainIds.reduce((acc, networkId) => {
            acc[networkId] = {};
            return acc;
        }, {} as ITokensList);

        const promises = chainIds.map((network) => {
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
                            reject(statusCode);
                            return;
                        }
                        tokens[network] = JSON.parse(response).tokens as { [key: string]: ITokenData };
                        resolve();
                    });
                });
            });
        });

        await Promise.all(promises).catch((e) => {
            console.log('LOAD ERROR:', e);
            throw Error("CAN'T LOAD TOKENS!");
        });

        return this.priceHandlerSvc.handleFetchedTokensMap(tokens, tokensToFind);
    }

    public async checkPrices(nextQueue: string[], commonTokensMap: ITokensMap, USDTTokenMap: IUSDTTokenMap, chainsData: IChainsData) {
        const responseData = nextQueue.reduce<ITokensInCheck>((acc, symbol) => {
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
                Object.keys(commonTokensMap ? commonTokensMap[tokenSymbol] : []).forEach((chainId) => {
                    acc.buy[tokenSymbol][chainId] = {
                        from: {
                            decimals: USDTTokenMap?.[chainId].decimals as unknown as number,
                            address: USDTTokenMap?.[chainId].address as unknown as string,
                            amount: 1000,
                        },
                        to: {
                            ...commonTokensMap?.[tokenSymbol][chainId],
                        },
                    };

                    acc.sell[tokenSymbol][chainId] = {
                        from: {
                            ...commonTokensMap?.[tokenSymbol][chainId],
                            amount: null,
                        },
                        to: {
                            decimals: USDTTokenMap?.[chainId].decimals as unknown as number,
                            address: USDTTokenMap?.[chainId].address as unknown as string,
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

        const buyFetchedPrices = await this.sendRequests(nextQueue, buy, commonTokensMap, chainsData);

        //NEED TO FIX
        const sellDataWithCorrectedAmount = Object.keys(sell).reduce((acc, tokenSymbol) => {
            Object.keys(sell[tokenSymbol]).forEach((chainId) => {
                const largestPriceForBuy = findExtremes(Object.values(buyFetchedPrices[tokenSymbol]))[1];
                acc[tokenSymbol][chainId].from.amount = largestPriceForBuy;
            });
            return acc;
        }, sell);

        const sellFetchedPrices = await this.sendRequests(nextQueue, sellDataWithCorrectedAmount, commonTokensMap, chainsData);

        const finishResponse = Object.keys(responseData).reduce((responses, symbol) => {
            responses[symbol].buy = buyFetchedPrices[symbol];
            responses[symbol].sell = sellFetchedPrices[symbol];

            return responses;
        }, responseData);

        return this.priceHandlerSvc.compareTokens(finishResponse);
    }

    private async sendRequests(
        tokensToFetch: string[],
        tokensData: {
            [key: string]: {
                [key: string]: {
                    from: any;
                    to: any;
                };
            };
        },
        commonTokensMap: ITokensMap,
        chainsData: IChainsData,
    ) {
        const responseData = tokensToFetch.reduce<{
            [key: string]: {
                [key: string]: number;
            };
        }>((acc, symbol) => {
            acc[symbol] = {};
            return acc;
        }, {});

        const promises = tokensToFetch.reduce((acc, tokenSymbol) => {
            return [
                ...acc,
                ...Object.keys(commonTokensMap[tokenSymbol]).map<any>((chainId) => {
                    if (!tokensData[tokenSymbol][chainId]) return;

                    const fromTokenData = tokensData[tokenSymbol][chainId].from;
                    const toTokenData = tokensData[tokenSymbol][chainId].to;
                    return this.createRequest(
                        chainId,
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
                                        network: chainsData[chainId].CHAIN_NAME,
                                    });
                                    return;
                                }

                                responseData[tokenSymbol][chainsData[chainId].CHAIN_NAME] = withoutDecimals(JSON.parse(response).toTokenAmount, toTokenData.decimals);
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

    private createRequest(
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
}
