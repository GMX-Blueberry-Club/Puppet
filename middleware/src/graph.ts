import { Client } from '@urql/core'
import * as GMX from "gmx-middleware-const"
import { IPriceCandle, IPricetickListMap, IPricetickMap, ISchema, schema as gmxSchema, groupArrayByKey, groupArrayByKeyMap, groupArrayManyMap, periodicRun, querySubgraph } from "gmx-middleware-utils"
import * as viem from "viem"
import { schema } from "./schema.js"
import { Stream } from '@most/types'
import { map } from '@most/core'


interface IQueryTraderPositionOpen {
  trader: viem.Address
  blockTimestamp_gte?: number
}

interface IQueryPuppetTradeRoute {
  puppet: viem.Address
}

export async function queryTraderPositionOpen(client: Client, filter: IQueryTraderPositionOpen) {
  const res = querySubgraph(client, {
    schema: schema.mirrorPositionOpen,
    filter,
  })
  
  return res
}

export async function getTraderPositionSettled(client: Client, filter: IQueryTraderPositionOpen) {
  const res = querySubgraph(client, {
    schema: schema.mirrorPositionSettled,
    filter,
  })
  
  return res
}


export async function queryPuppetPositionOpen(client: Client, filter: IQueryTraderPositionOpen) {
  const res = querySubgraph(client, {
    schema: schema.puppetPositionOpen,
    filter,
  })
  
  return res
}

export async function queryPuppetTradeRoute(client: Client, filter: IQueryPuppetTradeRoute) {
  const res = querySubgraph(client, {
    schema: schema.puppetTradeRoute,
    filter,
  })
  
  return res
}


interface IQueryPriceCandle {
  interval: GMX.IntervalTime
  token?: viem.Address
}

export function streamCandleSeedMap(
  client: Client,
  filter: IQueryPriceCandle = { interval: GMX.TIME_INTERVAL_MAP.MIN5 }
): Stream<IPricetickMap> {
  return periodicRun({
    interval: 5000,
    actionOp: map(async count => {
      const res = await  querySubgraph(client, {
        schema: gmxSchema.priceCandleSeed,
        filter,
      })

      const mapCandles = groupArrayByKeyMap(res, x => x.token, x => ({ timestamp: x.timestamp, price: x.c, token: x.token }))

      return mapCandles
    }),
  })
}

export async function queryLatestPriceTicks(client: Client, filter: IQueryPriceCandle = { interval: GMX.TIME_INTERVAL_MAP.MIN5 }) {
  const latestSeedSchema: ISchema<{ id: string, timestamp: number; c: bigint; __typename: 'PriceCandle', token: viem.Address} > = {
    id: 'string',
    timestamp: 'int',
    token: 'address',
    c: 'int',
    __typename: 'PriceCandleLatest',
  }

  const latestSeedQuery = querySubgraph(client, {
    schema: latestSeedSchema,
    filter,
  })

  const candleSchema: ISchema<{ id: string, timestamp: number; c: bigint; __typename: 'PriceCandle', token: viem.Address} > = {
    id: 'string',
    timestamp: 'int',
    token: 'address',
    c: 'int',
    __typename: 'PriceCandle',
  }

  const candleListQuery = querySubgraph(client, {
    schema: candleSchema,
    filter,
    // orderBy: 'timestamp',
    orderDirection: 'desc',
  })

  const [latestSeed, candleList] = await Promise.all([latestSeedQuery, candleListQuery])
  const all = [...candleList, ...latestSeed]

  const map: IPricetickListMap = groupArrayManyMap(all, x => viem.getAddress(x.token), x => ({ timestamp: x.timestamp, price: x.c, token: x.token }))

  return map
}

export async function queryLatestTokenPriceFeed(client: Client, filter: IQueryPriceCandle = { interval: GMX.TIME_INTERVAL_MAP.MIN5 }) {
  const queryFeed = querySubgraph(client, {
    schema: gmxSchema.priceCandle,
    filter,
  })

  const queryLatest = querySubgraph(client, {
    schema: gmxSchema.priceCandleSeed,
    filter: { interval: GMX.TIME_INTERVAL_MAP.MIN5, token: filter.token },
  })

  const [feed, latest] = await Promise.all([queryFeed, queryLatest])
  const list = [...feed, latest[0] as any as IPriceCandle].sort((a, b) => a.timestamp - b.timestamp)

  return list 
}

export async function queryLeaderboard(client: Client) {
  const settledTradeListQuery = querySubgraph(client, {
    schema: schema.mirrorPositionSettled,
    filter: {
      // blockTimestamp_gt: 0,
    }
  })
  const settledTradeOpenQuery = querySubgraph(client, {
    schema: schema.mirrorPositionOpen,
  })

  const [settledTradeList, settledTradeOpen] = await Promise.all([settledTradeListQuery, settledTradeOpenQuery])
  const sortedList = [...settledTradeList, ...settledTradeOpen].sort((a, b) => Number(a.blockTimestamp - b.blockTimestamp))
  
  return sortedList
}