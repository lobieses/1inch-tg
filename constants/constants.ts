import { IChainsData } from '@type/types';

export const ALLOWABLE_PERCENTAGE_DIFFERENCE = 1;

export const chainsData: IChainsData = {
    '1': {
        CHAIN_NAME: 'Ethereum',
    },
    '42161': {
        CHAIN_NAME: 'Arbitrum',
    },
    '43114': {
        CHAIN_NAME: 'Avalanche',
    },
    '137': {
        CHAIN_NAME: 'Polygon',
    },
    '250': {
        CHAIN_NAME: 'Fantom',
    },
    '56': {
        CHAIN_NAME: 'Binance',
    },
};

export const tokensToFind = {
    SPELL: {},
    wMEMO: {},
    WETH: {
        '250': 'ETH',
        '56': 'ETH',
        '43114': 'WETH.e',
        '137': 'ETH',
    },
    WBTC: {
        '250': 'BTC',
        '56': 'BTCB',
        '43114': 'WBTC.e',
    },
    ICE: {
        '137': 'ICE_3',
    },
    LINK: {
        '43114': 'LINK.e',
    },
    UNI: {},
    CRV: {},
    MULTI: {},
    FTM: {},
    USDT: {
        '43114': 'USDT.e',
        '250': 'fUSDT',
    },
};
