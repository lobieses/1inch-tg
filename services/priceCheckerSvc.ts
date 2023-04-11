import https from 'https';
import {fetchTokens, requestQuote} from '../heplers/requestCreator';
import {TokenAddresses, USDTAddresses, tokensToFind, TTokensToFind} from '../1inchApiMaps/tokenAddresses';
import {withDecimals, withoutDecimals, percentageDifference, findExtremes} from '../heplers/math';
import {chainsData} from '../1inchApiMaps/networks';

import dotenv from 'dotenv';
import {TFetchedTokensListByNetwork, TTokensToFetch} from './modules';

dotenv.config();
const {QUEUE_STEP, SLEEP_PERIOD_IN_MS, CHECK_PERIOD_IN_MS} = process.env;

const allowablePercentageDifference = 1;

interface ITokenData {
  address: string
  symbol: string
  decimals: number
}

class PriceCheckerSvc {
  needToCheckPrices: boolean;
  fetchedAddresses;
  tokenAddresses: any;
  USDTAddresses;
  tokensToFind: typeof tokensToFind;
  triggerFn: any;
  chainsData: typeof chainsData;
  queue: any;

  constructor() {
    this.needToCheckPrices = false;
    this.fetchedAddresses = {};
    this.tokenAddresses = TokenAddresses;
    this.USDTAddresses = USDTAddresses;
    this.tokensToFind = tokensToFind
    this.triggerFn = null;
    this.chainsData = chainsData;
    this.queue = {
      current: 0,
      max: Object.keys(TokenAddresses).length
    }
  }

  async fetchAddresses() {
    const tokens = (Object.keys(this.chainsData) as (keyof typeof chainsData)[]).reduce((acc, networkId) => {
      acc[networkId] = {};
      return acc;
    }, {} as TFetchedTokensListByNetwork)

    const promises = (Object.keys(this.chainsData) as (keyof typeof chainsData)[]).map((network) => {
      return new Promise<void>((resolve, reject) => {
        https.get(fetchTokens(network), (resp) => {
          let response = '';
          resp.setEncoding('utf8');
          resp.on('data', (chunk) => {
            response += chunk;
          });
          resp.on('end', () => {
            const {statusCode} = resp;
            const validResponse = statusCode as number >= 200 && statusCode as number <= 299;
            if (!validResponse) {
              reject();
              return
            }
            tokens[network] = JSON.parse(response).tokens as ITokenData
            resolve();
          });
        })
      })
    });

    Promise.all(promises).catch(() => {
        throw Error("CAN'T LOAD TOKENS!")
      }
    ).then(() => {
      this.prepareFetchedAddresses(tokens)
    });
  }

  prepareFetchedAddresses(data: TFetchedTokensListByNetwork) {
    const networkIds = Object.keys(this.chainsData) as (keyof typeof chainsData)[];

    const result = (Object.keys(this.tokensToFind) as (keyof typeof tokensToFind)[]).reduce((acc, symbol) => {
      acc[symbol] = {};
      return acc;
    }, {} as TTokensToFetch);

    (Object.keys(data) as (keyof typeof chainsData)[]).forEach((networkId) => {
      const networkTokens = Object.values(data[networkId]) as unknown as ITokenData[];
      (Object.keys(this.tokensToFind) as (keyof typeof tokensToFind)[]).forEach(symbol => {
        const foundSymbol = networkTokens.find(
          (token) => {
            // @ts-ignore
            return token.symbol === (this.tokensToFetch[symbol][networkId] !== undefined ? this.tokensToFetch[symbol][networkId] : symbol)
          }
        )
        // if (networkId === '1' && foundSymbol) {
        //   result[symbol].de = foundSymbol.
        // }
        //
        // if (foundSymbol) {
        //   result[symbol] =
        // }

        console.log(foundSymbol);
      })
    })

    console.log(data);
    // Object.keys(data).reduce((acc, {address, symbol, decimals}) => {
    //
    // }, {})
  }

  sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  changeNeedToCheckPrices(bol: boolean) {
    this.needToCheckPrices = bol;
  }

  nextQueueStep() {
    const nextQueue = (Object.keys(this.tokenAddresses) as (keyof typeof TokenAddresses)[]).slice(
      this.queue.current,
      this.queue.current + Number(QUEUE_STEP) >= this.queue.max ? this.queue.max : this.queue.current + Number(QUEUE_STEP)
    );

    this.queue.current = this.queue.current + Number(QUEUE_STEP) >= this.queue.max ? 0 : this.queue.current + Number(QUEUE_STEP);

    return nextQueue;
  }

  rollbackQueue() {
    this.queue.current = this.queue.current - Number(QUEUE_STEP);
  }

  startPriceChecking(sendPriceDifferenceTrigger: any) {
    this.triggerFn = sendPriceDifferenceTrigger;
    this.checkPricesByQueue();
  }

  checkPricesByQueue() {
    if (!this.needToCheckPrices || !this.triggerFn) return;
    setTimeout(async () => {
      const prices = await this.checkPrices();
      // console.log('prices', prices);
      const comparedPrices = this.comparePrices(prices);
      if (Object.keys(comparedPrices).length) this.triggerFn(comparedPrices);
    }, CHECK_PERIOD_IN_MS as unknown as number);
  }

  async checkPrices() {
    const nextQueue = this.nextQueueStep();
    console.log(nextQueue);

    const responseData = nextQueue.reduce((acc, elem) => {
      acc[elem] = {};
      return acc;
    }, {} as any);

    let hasErrors = false;

    const promises = nextQueue.reduce((acc, tokenSymbol) => {
      return [...acc, ...(Object.keys(this.tokenAddresses[tokenSymbol].addresses) as (keyof typeof chainsData)[]).map<Promise<void>>(netId => {
        const fromTokenData = typeof (this.tokenAddresses[tokenSymbol].addresses[netId]) === 'object'
          ? this.tokenAddresses[tokenSymbol].addresses[netId]
          : {
            decimals: this.tokenAddresses[tokenSymbol].decimals,
            address: this.tokenAddresses[tokenSymbol].addresses[netId]
          }

        const toTokenData: any = typeof (this.USDTAddresses.addresses[netId]) === 'object'
          ? this.USDTAddresses.addresses[netId]
          : {
            decimals: this.USDTAddresses.decimals,
            address: this.USDTAddresses.addresses[netId]
          }


        return new Promise<void>((resolve, reject) => {
          https.get(requestQuote(
            netId, fromTokenData.address, toTokenData.address, withDecimals(1, fromTokenData.decimals)
          ), (resp) => {
            let response = '';
            resp.setEncoding('utf8');
            resp.on('data', (chunk) => {
              response += chunk;
            });
            resp.on('end', () => {
              const {statusCode} = resp;
              const validResponse = statusCode as number >= 200 && statusCode as number <= 299;
              if (!validResponse) {
                reject({
                  statusCode,
                  token: tokenSymbol,
                  network: this.chainsData[netId].CHAIN_NAME
                });
                return
              }
              responseData[tokenSymbol][`${this.chainsData[netId].CHAIN_NAME}${fromTokenData.symbol ? '(' + (fromTokenData.symbol) + ')' : ''}`] = withoutDecimals(JSON.parse(response).toTokenAmount, toTokenData.decimals);
              resolve();
            });
          })
        }).catch(({statusCode, token, network}) => {
          console.log('getError', `${statusCode} ${token} ${network}`);
          hasErrors = true;
        })
      })]
    }, [] as Promise<void>[]);

    await Promise.all(promises)

    if (hasErrors) {
      this.rollbackQueue();
      console.warn('startSleep')
      await this.sleep((SLEEP_PERIOD_IN_MS as unknown as number) - (CHECK_PERIOD_IN_MS as unknown as number));
      console.warn('endSleep')
    }


    this.checkPricesByQueue();
    const response = hasErrors ? {} : responseData;
    console.log('responseData', response);
    return response;
  }

  comparePrices(data: any) {
    return Object.keys(data).reduce((acc, tokenSymbol) => {
      const pricesArr = Object.values(data[tokenSymbol]);
      const extremes = findExtremes(pricesArr as any);
      const percentageDifferenceResult = percentageDifference(extremes[0], extremes[1]);
      if (percentageDifferenceResult >= allowablePercentageDifference) {
        acc[tokenSymbol] = {
          min: {
            network: Object.keys(data[tokenSymbol]).find(network => data[tokenSymbol][network] === extremes[0]),
            price: extremes[0]
          },
          max: {
            network: Object.keys(data[tokenSymbol]).find(network => data[tokenSymbol][network] === extremes[1]),
            price: extremes[1]
          }
        };
      }
      return acc;
    }, {} as any)
  }
}

export default new PriceCheckerSvc();