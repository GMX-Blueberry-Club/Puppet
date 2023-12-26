import { querySubgraph, schema as gmxSchema, groupArrayByKey, groupArrayByKeyMap, IOraclePrice, IPriceMinMax, IPriceCandle, IPriceLatestMap } from "gmx-middleware-utils"
import * as viem from "viem"
import { schema } from "./schema.js"
import * as GMX from "gmx-middleware-const"

const subgraphUrl = 'https://api.studio.thegraph.com/query/112/puppet/v0.0.36'


export async function getAccountMirrorPositionOpenList(trader: viem.Address) {
  const res = querySubgraph({
    url: subgraphUrl,
    schema: schema.mirrorPositionOpen,
    filter: { trader },
  })
  
  return res
}


export async function queryLatestCandleList() {
  const res = await querySubgraph({
    url: subgraphUrl,
    schema: gmxSchema.priceCandleLatest,
    filter: { interval: GMX.TIME_INTERVAL_MAP.MIN5 },
  })

  return res
}

export async function queryLatestPriceMap() {
  const res = await querySubgraph({
    url: subgraphUrl,
    schema: gmxSchema.priceCandleLatest,
    filter: { interval: GMX.TIME_INTERVAL_MAP.MIN5 },
  })
  const map: IPriceLatestMap = groupArrayByKeyMap(res, x => viem.getAddress(x.token), x => ({ max: x.h, min: x.l }))

  return map
}

export async function queryPriceFeed(token: viem.Address, interval: GMX.IntervalTime) {
  const queryFeed = querySubgraph({
    url: subgraphUrl,
    schema: gmxSchema.priceCandle,
    filter: { token, interval },
  })

  const queryLatest = querySubgraph({
    url: subgraphUrl,
    schema: gmxSchema.priceCandleLatest,
    filter: { interval: GMX.TIME_INTERVAL_MAP.MIN5, token },
  })

  const [feed, latest] = await Promise.all([queryFeed, queryLatest])
  const list = [...feed, latest[0] as any as IPriceCandle].sort((a, b) => a.timestamp - b.timestamp)

  return list 
}


export async function queryLeaderboard() {
  const settledTradeListQuery = querySubgraph({
    url: subgraphUrl,
    schema: schema.mirrorPositionSettled,
    filter: {
      // blockTimestamp_gt: 0,
    }
  })
  const settledTradeOpenQuery = querySubgraph({
    url: subgraphUrl,
    schema: schema.mirrorPositionOpen,
  })

  const [settledTradeList, settledTradeOpen] = await Promise.all([settledTradeListQuery, settledTradeOpenQuery])

  return [...settledTradeList, ...settledTradeOpen].sort((a, b) => a.blockTimestamp - b.blockTimestamp)
}