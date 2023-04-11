import {chainsData} from '../1inchApiMaps/networks';
import {tokensToFind} from '../1inchApiMaps/tokenAddresses';

export interface ITokenData {
  address: string
  symbol: string
  decimals: number
}

export type TFetchedTokensListByNetwork = {
  [key in keyof typeof chainsData]: {
    [key: string]: ITokenData
  }
}

export type TTokensToFetch = {
  [key in keyof typeof tokensToFind]: {
    [key in keyof typeof chainsData]: { address: string, decimals: number }
  }
}

