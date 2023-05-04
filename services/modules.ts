export interface ITokensToFind {
    [key: string]: {
        [key: string]: string;
    };
}

export interface ITokenData {
    address: string;
    symbol: string;
    decimals: number;
}

export interface IFetchedTokensListByNetwork {
    [key: string]: {
        [key: string]: ITokenData;
    };
}

export interface ITokensToFetch {
    [key: string]: {
        [key: string]: {
            address: string;
            decimals: number;
            symbol: string | undefined;
        };
    };
}

export interface IUSDTTokensToFetch {
    [key: string]: {
        address: string;
        decimals: number;
    };
}

export interface IChainsData {
    [key: string]: {
        CHAIN_NAME: string;
    };
}

export interface IFetchedTokens {
    [key: string]: {
        buy: {
            [key: string]: number;
        };
        sell: {
            [key: string]: number;
        };
    };
}

export interface IComparedTokens {
    [key: string]: {
        min: {
            network: string;
            priceInUsdt: number;
            willGetInToken: number;
        };
        max: {
            network: string;
            price: number;
        };
    };
}

export interface ITokensData {
    buy: {
        [key: string]: {
            [key: string]: {
                from: any;
                to: any;
            };
        };
    };
    sell: {
        [key: string]: {
            [key: string]: {
                from: any;
                to: any;
            };
        };
    };
}
