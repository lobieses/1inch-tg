import { injectable } from 'inversify';
import { IComparedTokens, ITokenData, ITokensInCheck, ITokensList, ITokensMap, ITokensToFind, IUSDTTokenMap } from '@type/types';
import { findExtremes, percentageDifference } from './utils/math';
import { ALLOWABLE_PERCENTAGE_DIFFERENCE } from '@constants/constants';

export interface IPriceHandlerSvc {
    handleFetchedTokensMap: (
        data: ITokensList,
        tokensToFind: ITokensToFind,
    ) => {
        commonTokensMap: ITokensMap;
        USDTTokenMap: IUSDTTokenMap;
    };
    compareTokens: (tokens: ITokensInCheck) => IComparedTokens;
}

@injectable()
export class PriceHandlerSvc implements IPriceHandlerSvc {
    public handleFetchedTokensMap(data: ITokensList, tokensToFind: ITokensToFind) {
        const mapTemplate: ITokensMap = {};

        Object.keys(data).forEach((networkId) => {
            const networkTokens = Object.values(data[networkId]) as unknown as ITokenData[];
            Object.keys(tokensToFind).forEach((symbol) => {
                const foundSymbol = networkTokens.find((token) => {
                    return token.symbol === (tokensToFind[symbol][networkId] !== undefined ? tokensToFind[symbol][networkId] : symbol);
                });

                if (foundSymbol) {
                    mapTemplate[symbol] = {};
                    mapTemplate[symbol][networkId] = {
                        address: foundSymbol.address,
                        decimals: foundSymbol.decimals,
                        symbol: tokensToFind[symbol][networkId],
                    };
                }
            });
        });

        const result = Object.keys(mapTemplate).reduce<{
            USDTTokenMap: IUSDTTokenMap;
            commonTokensMap: ITokensMap;
        }>(
            (acc, symbol) => {
                if (symbol !== 'USDT') {
                    acc.commonTokensMap[symbol] = mapTemplate[symbol];
                } else {
                    acc.USDTTokenMap = mapTemplate[symbol];
                }

                return acc;
            },
            {
                commonTokensMap: {},
                USDTTokenMap: {},
            },
        );
        console.log('prepared tokens to fetch: ', Object.keys(result.commonTokensMap));

        return result;
    }

    public compareTokens(tokens: ITokensInCheck) {
        return Object.keys(tokens).reduce<IComparedTokens>((acc, tokenSymbol) => {
            const pricesArrForBuy = Object.values(tokens[tokenSymbol].buy);
            const extremesForBuy = findExtremes(pricesArrForBuy);
            console.log('buy extreme: ', extremesForBuy);
            const pricesArrForSell = Object.values(tokens[tokenSymbol].sell);
            const extremesForSell = findExtremes(pricesArrForSell);
            console.log('sell extreme: ', extremesForSell);
            const percentageDifferenceResult = percentageDifference(1000, extremesForSell[1]);
            console.log('difference: ', percentageDifferenceResult);
            const networkForBuy = Object.keys(tokens[tokenSymbol].buy).find((network) => tokens[tokenSymbol].buy[network] === extremesForBuy[1]) as unknown as string;
            const networkForSell = Object.keys(tokens[tokenSymbol].sell).find((network) => tokens[tokenSymbol].sell[network] === extremesForSell[1]) as unknown as string;
            if (percentageDifferenceResult >= ALLOWABLE_PERCENTAGE_DIFFERENCE && networkForBuy !== networkForSell) {
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
        }, {});
    }
}
