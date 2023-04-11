export const fetchTokens = (network: string) => (
    `https://api.1inch.io/v5.0/${network}/tokens`
)

export const requestQuote = (chain_id: string, fromAddress: string, toAddress: string, amount: number) => (
    `https://api.1inch.io/v5.0/${chain_id}/quote?fromTokenAddress=${fromAddress}&toTokenAddress=${toAddress}&amount=${amount}`
)
