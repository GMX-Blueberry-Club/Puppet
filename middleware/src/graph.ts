import { map, multicast } from '@most/core'
import { Stream } from '@most/types'
import { Client } from '@urql/core'
import * as GMX from "gmx-middleware-const"
import { IPriceOracleMap, IPriceCandle, ISchema, schema as gmxSchema, groupArrayManyMap, periodicRun, querySignedPrices, querySubgraph, IPriceTickListMap, findClosest, unixTimestampNow } from "gmx-middleware-utils"
import * as viem from "viem"
import { replayLatest } from '@aelea/core'
import { schema } from './schema.js'


interface IQueryTraderPositionOpen {
  trader: viem.Address
  blockTimestamp_gte?: number
}

interface IQueryPuppetTradeRoute {
  puppet: viem.Address
  activityTimeframe: GMX.IntervalTime
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

export async function queryPuppetTradeRoute(client: Client, filter: IQueryPuppetTradeRoute) {
  const timestamp_gte = unixTimestampNow() - filter.activityTimeframe

  const res = querySubgraph(client, {
    schema: schema.puppetTradeRoute,
    filter: {
      puppet: filter.puppet,
      timestamp_gte,
    },
  })
  
  return res
}


interface IQueryLatestPriceTick {
  token?: viem.Address
  activityTimeframe: GMX.IntervalTime
}

interface IQueryPriceCandle {
  interval: GMX.IntervalTime
  token?: viem.Address
  timestamp_gte?: number
}

const latestSeedSchema: ISchema<{ id: string, timestamp: number; c: bigint; __typename: 'PriceCandle', token: viem.Address} > = {
  id: 'string',
  timestamp: 'int',
  token: 'address',
  c: 'int',
  __typename: 'PriceCandleSeed',
}
const candleSchema: ISchema<{ id: string, timestamp: number; c: bigint; __typename: 'PriceCandle', token: viem.Address} > = {
  id: 'string',
  timestamp: 'int',
  token: 'address',
  c: 'int',
  __typename: 'PriceCandle',
}

export async function queryLatestPriceTick(client: Client, filter: IQueryLatestPriceTick, estTickAmout = 20): Promise<IPriceTickListMap> {
  const interval = findClosest(GMX.PRICEFEED_INTERVAL, filter.activityTimeframe / estTickAmout)
  const timestamp_gte = unixTimestampNow() - filter.activityTimeframe

  const latestSeedQuery = querySubgraph(client, {
    schema: latestSeedSchema,
    filter: {
      token: filter.token,
    },
  })

  const candleListQuery = querySubgraph(client, {
    schema: candleSchema,
    filter: {
      interval,
      timestamp_gte,
    },
    // orderBy: 'timestamp',
    orderDirection: 'desc',
  })

  const [latestSeed, candleList] = await Promise.all([latestSeedQuery, candleListQuery])
  const all = [...candleList, ...latestSeed]
  const mapped: IPriceTickListMap = groupArrayManyMap(all, x => viem.getAddress(x.token), x => ({ timestamp: x.timestamp, price: x.c }))

  return mapped
}

export const latestPriceMap: Stream<IPriceOracleMap> = replayLatest(multicast(periodicRun({
  startImmediate: true,
  interval: 2500,
  actionOp: map(async count => {
    return querySignedPrices()
  }),
})))

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

export async function queryOpenPositionList(client: Client) {
  const openPositionListQuery = querySubgraph(client, {
    schema: schema.mirrorPositionOpen,
  })
  
  return openPositionListQuery
}

export async function querySettledPositionList(client: Client) {
  const settledPositionListQuery = querySubgraph(client, {
    schema: schema.mirrorPositionSettled,
    filter: {
      // blockTimestamp_gt: 0,
    }
  })

  return settledPositionListQuery
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

export async function queryRouteTypeList(client: Client) {
  const query = querySubgraph(client, {
    schema: schema.setRouteType,
  })

  return query
}
