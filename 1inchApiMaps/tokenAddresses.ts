export const tokensToFind = {
  SPELL: {},
  wMEMO: {},
  WETH: {
    '250': 'ETH',
    '56': 'ETH',
    '43114': 'WETH.e',
    '137': 'ETH'
  },
  WBTC: {
    '250': 'BTC',
    '56': 'BTCB',
    '43114': 'WBTC.e'
  },
  ICE: {
    '137': 'ICE_3'
  },
  LINK: {
    '43114': 'LINK.e'
  },
  UNI: {},
  CRV: {},
  MULTI:{},
  FTM: {},
  USDT: {
    '43114': 'USDT.e',
    '250': 'fUSDT'
  },

}

export const TokenAddresses = {
  WETH: {
    decimals: 18,
    addresses: {
      '1': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      '42161': '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      '43114': '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB',
      '137': '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
      '250': {
        address: '0x74b23882a30290451A17c44f4F05243b6b58C76d',
        symbol: 'ETH',
        decimals: 18
      },
      '56': {
        address: '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
        symbol: 'ETH',
        decimals: 18
      }
    }

  },
  WBTC: {
    decimals: 8,
    addresses: {
      '1': '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
      '42161': '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
      '43114': '0x50b7545627a5162F82A992c33b87aDc75187B218',
      '137': '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
      '250': {
        address: '0x321162Cd933E2Be498Cd2267a90534A804051b11',
        symbol: 'BTC',
        decimals: 8
      },
      '56': {
        address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
        symbol: 'BTCB',
        decimals: 18
      }
    }
  },
  ICE: {
    decimals: 18,
    addresses: {
      '1': '0xf16e81dce15B08F326220742020379B855B87DF9',
      '137': '0x4e1581f01046efdd7a1a2cdb0f82cdd7f71f2e59',
      '250': '0xf16e81dce15b08f326220742020379b855b87df9',
      '56': '0xf16e81dce15b08f326220742020379b855b87df9'
    }
  },
  LINK: {
    decimals: 18,
    addresses: {
      '1': '0x514910771af9ca656af840dff83e8264ecf986ca',
      '42161': '0xf97f4df75117a78c1a5a0dbb814af92458539fb4',
      '43114': {
        address: '0x5947bb275c521040051d82396192181b413227a3',
        symbol: 'LINK.e',
        decimals: 18
      },
      '137': '0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39',
      '250': '0xb3654dc3d10ea7645f8319668e8f54d2574fbdc8',
      '56': '0xf8a0bf9cf54bb92f17374d9e9a321e6a111a51bd'
    }
  },
  UNI: {
    decimals: 18,
    addresses: {
      '1': '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
      '42161': '0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0',
      '137': '0xb33eaad8d922b1083446dc23f610c2567fb5180f',
      '56': '0xbf5140a22578168fd562dccf235e5d43a02ce9b1'
    }
  },
  CRV: {
    decimals: 18,
    addresses: {
      '1': '0xd533a949740bb3306d119cc777fa900ba034cd52',
      '42161': '0x11cdb42b0eb46d95f990bedd4695a6e3fa034978',
      '137': '0x172370d5cd63279efa6d502dab29171933a610af',
      '250': '0x1e4f97b9f9f913c46f1632781732927b9019c68b',
    }
  },
  MULTI: {
    decimals: 18,
    addresses: {
      '1': '0x65ef703f5594d2573eb71aaf55bc0cb548492df4',
      '250': '0x9fb9a33956351cf4fa040f65a13b835a3c8764e3',
      '56': '0x9fb9a33956351cf4fa040f65a13b835a3c8764e3'
    }
  },
  FTM: {
    decimals: 18,
    addresses: {
      '1': '0x4e15361fd6b4bb609fa63c81a2be19d873717870',
      '250': '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      '56': '0xad29abb318791d579433d831ed122afeaf29dcfe'
    }
  }
}

export const USDTAddresses = {
  decimals: 6,
  addresses: {
    '1': '0xdac17f958d2ee523a2206206994597c13d831ec7',
    '42161': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    '43114': '0xc7198437980c041c805A1EDcbA50c1Ce5db95118',
    '137': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    '250': '0x049d68029688eAbF473097a2fC38ef61633A3C7A',
    '56': {
      address: '0x55d398326f99059fF775485246999027B3197955',
      decimals: 18
    }
  }
}