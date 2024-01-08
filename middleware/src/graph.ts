import { map, multicast } from '@most/core'
import { Stream } from '@most/types'
import { Client, createClient, fetchExchange } from '@urql/core'
import { makeDefaultStorage } from '@urql/exchange-graphcache/default-storage'
import { offlineExchange } from '@urql/exchange-graphcache'
import * as GMX from "gmx-middleware-const"
import { IPriceOracleMap, IPriceCandle, ISchema, schema as gmxSchema, groupArrayManyMap, periodicRun, querySignedPrices, querySubgraph, IPriceTickListMap, findClosest, unixTimestampNow } from "gmx-middleware-utils"
import * as viem from "viem"
import { replayLatest } from '@aelea/core'
import { schema } from './schema.js'

const storage = makeDefaultStorage({
  idbName: 'graphcache-v3', // The name of the IndexedDB database
  maxAge: 7, // The maximum age of the persisted data in days
})


const cache = offlineExchange({
  // schema,
  storage,
  updates: {
    /* ... */
  },
  optimistic: {
    /* ... */
  },
})


export const subgraphClient = createClient({
  url: 'https://api.studio.thegraph.com/query/112/puppet/v0.0.65',
  exchanges: [cache, fetchExchange],
  fetchSubscriptions: true,
  requestPolicy: 'cache-first',
})

interface IQueryTraderPositionOpen {
  trader: viem.Address
  blockTimestamp_gte?: number
}

interface IQueryPuppetTradeRoute {
  puppet: viem.Address
  activityTimeframe: GMX.IntervalTime
}

export async function queryTraderPositionOpen(filter: IQueryTraderPositionOpen) {

  const res = querySubgraph(subgraphClient, {
    schema: schema.mirrorPositionOpen,
    filter,
  })
  
  return res
}

export async function getTraderPositionSettled(filter: IQueryTraderPositionOpen) {
  const res = querySubgraph(subgraphClient, {
    schema: schema.mirrorPositionSettled,
    filter,
  })
  
  return res
}

export async function queryPuppetTradeRoute(filter: IQueryPuppetTradeRoute) {
  const timestamp_gte = unixTimestampNow() - filter.activityTimeframe

  const res = querySubgraph(subgraphClient, {
    schema: schema.puppetTradeRoute,
    filter: {
      puppet: filter.puppet,
      // timestamp_gte,
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


// "_meta": {
//   "block": {
//     "number": 166355087,
//     "timestamp": 1704208919
//   },
//   "hasIndexingErrors": false
// }

interface ISubgraphStatus {
  block: {
    number: number
    timestamp: number
  }
  hasIndexingErrors: boolean
}

export const subgraphStatus: Stream<ISubgraphStatus> = replayLatest(multicast(periodicRun({
  startImmediate: true,
  interval: 2500,
  actionOp: map(async count => {
    const newLocal = await subgraphClient.query(`
    {
      _meta {
        block {
          number
          timestamp
        }
        hasIndexingErrors
      }
    }
  `, {  }, { requestPolicy: 'network-only' }).toPromise()
    return newLocal.data._meta
  }),
})))

export async function queryLatestPriceTick(filter: IQueryLatestPriceTick, estTickAmout = 20): Promise<IPriceTickListMap> {
  const interval = findClosest(GMX.PRICEFEED_INTERVAL, filter.activityTimeframe / estTickAmout)
  const timestamp_gte = unixTimestampNow() - filter.activityTimeframe

  // const latestSeedQuery = querySubgraph(client, {
  //   schema: latestSeedSchema,
  //   filter: {
  //     token: filter.token,
  //   },
  // })

  const candleListQuery =  querySubgraph(subgraphClient, {
    schema: candleSchema,
    filter: {
      interval,
      timestamp_gte,
    },
    // orderBy: 'timestamp',
    orderDirection: 'desc',
  })

  const candleList = await candleListQuery
  const mapped: IPriceTickListMap = groupArrayManyMap(candleList, x => viem.getAddress(x.token), x => ({ timestamp: x.timestamp, price: x.c }))

  return mapped
}

export const latestPriceMap: Stream<IPriceOracleMap> = replayLatest(multicast(periodicRun({
  startImmediate: true,
  interval: 2500,
  actionOp: map(async count => {
    const newLocal = await querySignedPrices()
    return newLocal
  }),
})))

export async function queryLatestTokenPriceFeed(filter: IQueryPriceCandle = { interval: GMX.IntervalTime.MIN5 }) {
  const queryFeed = querySubgraph(subgraphClient, {
    schema: gmxSchema.priceCandle,
    filter,
  })

  const queryLatest = querySubgraph(subgraphClient, {
    schema: gmxSchema.priceCandleSeed,
    filter: filter,
  })

  const [feed, latest] = await Promise.all([queryFeed, queryLatest])
  const list = [...feed, latest[0] as any as IPriceCandle].sort((a, b) => a.timestamp - b.timestamp)

  return list 
}

export async function queryOpenPositionList() {
  const openPositionListQuery = querySubgraph(subgraphClient, {
    schema: schema.mirrorPositionOpen,
  })
  
  return openPositionListQuery
}

export async function querySettledPositionList() {
  const settledPositionListQuery = querySubgraph(subgraphClient, {
    schema: schema.mirrorPositionSettled,
    filter: {
      // blockTimestamp_gt: 0,
    }
  })

  return settledPositionListQuery
}

export async function queryLeaderboard() {
  const settledTradeListQuery = querySubgraph(subgraphClient, {
    schema: schema.mirrorPositionSettled,
    filter: {
      // blockTimestamp_gt: 0,
    }
  })
  const settledTradeOpenQuery = querySubgraph(subgraphClient, {
    schema: schema.mirrorPositionOpen,
  })

  const [settledTradeList, settledTradeOpen] = await Promise.all([settledTradeListQuery, settledTradeOpenQuery])
  const sortedList = [...settledTradeList, ...settledTradeOpen].sort((a, b) => Number(a.blockTimestamp - b.blockTimestamp))
  
  return sortedList
}

export async function queryRouteTypeList() {
  const query = querySubgraph(subgraphClient, {
    schema: schema.setRouteType,
  })

  return query
}
