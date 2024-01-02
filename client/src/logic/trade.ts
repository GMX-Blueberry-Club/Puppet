
import { replayLatest } from "@aelea/core"
import { http, observer } from "@aelea/ui-components"
import { empty, fromPromise, map, mergeArray, multicast, now, scan, skip } from "@most/core"
import { Stream } from "@most/types"
import { fetchBalance, readContract } from "@wagmi/core"
import { erc20Abi } from "abitype/abis"
import * as GMX from "gmx-middleware-const"
import {
  IPriceCandleDto, IRequestPricefeedApi, ITokenDescription, ITokenSymbol,
  filterNull, getDenominator, getMappedValue, getTokenDescription, parseFixed, periodicRun, resolveAddress
} from "gmx-middleware-utils"
import * as viem from "viem"
import { } from "viem"
import { ISupportedChain } from "../wallet/walletLink.js"





export interface ITokenPoolInfo {
  cumulativeRate: bigint
  reservedAmount: bigint
  poolAmounts: bigint
  usdgAmounts: bigint
  maxUsdgAmounts: bigint
  tokenWeights: bigint
}

export interface ITokenInfo {
  availableLongLiquidityUsd: bigint
  availableShortLiquidityUsd: bigint
  weight: bigint
  bufferAmounts: bigint
  usdgAmounts: bigint
  poolAmounts: bigint
  reservedAmounts: bigint
  guaranteedUsd: bigint
  globalShortSizes: bigint
  maxGlobalShortSizes: bigint
  maxGlobalLongSizes: bigint
}


const derievedSymbolMapping: { [k: string]: ITokenSymbol } = {
  [GMX.TOKEN_SYMBOL.WETH]: GMX.TOKEN_SYMBOL.ETH,
  [GMX.TOKEN_SYMBOL.WBTC]: GMX.TOKEN_SYMBOL.BTC,
  [GMX.TOKEN_SYMBOL.BTCB]: GMX.TOKEN_SYMBOL.BTC,
  [GMX.TOKEN_SYMBOL.WBTCE]: GMX.TOKEN_SYMBOL.BTC,
  [GMX.TOKEN_SYMBOL.WAVAX]: GMX.TOKEN_SYMBOL.AVAX,
  [GMX.TOKEN_SYMBOL.SOL]: GMX.TOKEN_SYMBOL.SOL,
}

const gmxIoPricefeedIntervalLabel = {
  [GMX.TIME_INTERVAL_MAP.MIN5]: '5m',
  [GMX.TIME_INTERVAL_MAP.MIN15]: '15m',
  [GMX.TIME_INTERVAL_MAP.MIN60]: '1h',
  [GMX.TIME_INTERVAL_MAP.HR4]: '4h',
  [GMX.TIME_INTERVAL_MAP.HR24]: '1d',
}


const GMX_URL_CHAIN = {
  [GMX.CHAIN.ARBITRUM]: 'https://gmx-server-mainnet.uw.r.appspot.com',
  [GMX.CHAIN.AVALANCHE]: 'https://gmx-avax-server.uc.r.appspot.com',
}

const gmxIOPriceMapSource = {
  [GMX.CHAIN.ARBITRUM]: replayLatest(multicast(observer.duringWindowActivity(periodicRun({
    interval: 2000,
    actionOp: map(async time => getGmxIOPriceMap(GMX_URL_CHAIN[GMX.CHAIN.ARBITRUM] + '/prices'))
  })))),
  [GMX.CHAIN.AVALANCHE]: replayLatest(multicast(observer.duringWindowActivity(periodicRun({
    interval: 2000,
    actionOp: map(async time => getGmxIOPriceMap(GMX_URL_CHAIN[GMX.CHAIN.AVALANCHE] + '/prices'))
  })))),
}

export function latestPriceFromExchanges(tokendescription: ITokenDescription): Stream<bigint> {
  const symbol = derievedSymbolMapping[tokendescription.symbol]

  if (symbol === null) {
    console.warn(`no symbol ${symbol} found in mapping`)
    return empty()
  }

  const binance = http.fromWebsocket('wss://stream.binance.com:9443/ws', now({ params: [`${symbol}usdt@trade`.toLowerCase()], method: "SUBSCRIBE", id: 1 }))
  const bitfinex = http.fromWebsocket('wss://api-pub.bitfinex.com/ws/2', now({ symbol: `${symbol}USD`, event: "subscribe", channel: "ticker" }))
  const coinbase = http.fromWebsocket('wss://ws-feed.pro.coinbase.com', now({ product_ids: [`${symbol}-USD`], type: "subscribe", channels: ["ticker"] }))
  const kraken = http.fromWebsocket('wss://ws.kraken.com', now({ event: 'subscribe', pair: [`${symbol.toUpperCase()}/USD`], subscription: { name: 'ticker' } }))

  const allSources: Stream<number> = filterNull(mergeArray([
    map((ev: any) => {
      if ('p' in ev) {
        return Number(ev.p)
      }
      // console.warn(ev)
      return null
    }, binance),
    map((data: any) => {
      if (data[2] && data[2] === 'ticker') {
        return Number(data[1].c[0])

      }
      // console.warn(ev)

      return null
    }, kraken),
    map((ev: any) => {
      if (Array.isArray(ev) && ev.length === 2 && Array.isArray(ev[1]) && ev[1].length === 10) {
        // console.log(Number(ev[1][6]))
        return ev[1][6]
      }
      // console.warn(ev)
      return null
    }, bitfinex),
    map((ev: any) => {
      if ('price' in ev) {
        // console.log(Number(ev.price))

        return Number(ev.price)
      }
      // console.warn(ev)
      return null
    }, coinbase),
  ]))

  const avgPrice = skip(1, scan((prev, next) => {
    return prev === 0 ? next : (prev + next) / 2
  }, 0, allSources))

  return map(ev => parseFixed(ev, GMX.USD_DECIMALS) / getDenominator(tokendescription.decimals), avgPrice)
}


export function getWalletErc20Balance(chain: ISupportedChain, token: viem.Address | typeof GMX.ADDRESS_ZERO, walletAddress: viem.Address): Stream<bigint> {

  if (token === GMX.ADDRESS_ZERO) {
    return fromPromise(fetchBalance({ address: walletAddress }).then(res => res.value))
  }

  const contractMapping = getMappedValue(GMX.TRADE_CONTRACT_MAPPING, chain.id)

  if (!contractMapping) {
    return now(0n)
  }

  const tokenAddress = resolveAddress(chain, token)

  const erc20 = readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [walletAddress]
  })

  return fromPromise(erc20)
}



export const exchangesWebsocketPriceSource = (token: viem.Address) => {
  const existingToken = getMappedValue(GMX.TOKEN_ADDRESS_DESCRIPTION_MAP, token)

  return latestPriceFromExchanges(existingToken)
  // const source = gmxIOPriceMapSource[chain.id]

  // if (!source) {
  //   throw new Error(`no price mapping exists for chain ${chain} ${chain}`)
  // }

  // return map(pmap => {
  //   const val = pmap[token as keyof typeof pmap]

  //   return BigInt(val)
  // }, source)
}


export async function getGmxIOPriceMap(url: string): Promise<{ [key in viem.Address]: bigint }> {
  const res = await fetch(url)
  const json = await res.json()


  // @ts-ignore
  return Object.keys(json).reduce((seed, key) => {
    // @ts-ignore
    seed[key] = json[key]
    return seed
  }, {})
}



export const getGmxIoPricefeed = async (queryParams: IRequestPricefeedApi): Promise<IPriceCandleDto[]> => {
  const tokenDesc = getTokenDescription(queryParams.tokenAddress)
  const intervalLabel = getMappedValue(gmxIoPricefeedIntervalLabel, queryParams.interval)
  const symbol = derievedSymbolMapping[tokenDesc.symbol] || tokenDesc.symbol
  const res = fetch(`https://stats.gmx.io/api/candles/${symbol}?preferableChainId=${queryParams.chain}&period=${intervalLabel}&from=${queryParams.from}&preferableSource=fast`)
    .then(async res => {
      const parsed = await res.json()
      return parsed.prices.map((json: any) => ({ o: parseFixed(json.o, 30), h: parseFixed(json.h, 30), l: parseFixed(json.l, 30), c: parseFixed(json.c, 30), timestamp: json.t }))
    })
  return res
}

