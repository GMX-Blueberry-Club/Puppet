import { replayLatest } from '@aelea/core'
import { map, multicast } from '@most/core'
import { Stream } from '@most/types'
import { Client, createClient, fetchExchange } from '@urql/core'
import { makeDefaultStorage } from '@urql/exchange-graphcache/default-storage'
import { IntervalTime, combineState, getClosestNumber, groupArrayManyMap, periodicRun, unixTimestampNow } from 'common-utils'
import * as GMX from "gmx-middleware-const"
import { IPriceCandle, IPriceOracleMap, IPriceTickListMap, ISchema, schema as gmxSchema, parseQueryResults, querySignedPrices, querySubgraph } from "gmx-middleware-utils"
import * as viem from "viem"
import __tempTradeRouteDoc from './__temp_tradeRouteDoc.js'
import { schema } from './schema.js'
import { IPuppetTradeRoute, ISetRouteType } from './types.js'
import { cacheExchange } from '@urql/exchange-graphcache'


const storage = makeDefaultStorage({
  idbName: 'graphcache-v3', // The name of the IndexedDB database
  maxAge: 7, // The maximum age of the persisted data in days
})


// A simple in-memory cache object
// const cache = {}

// A utility function to hash queries for caching purposes
// const hashQuery = (operation: Operation<any, AnyVariables>) => {
//   // Implement a hashing function suitable for your queries
// }

// // Custom exchange
// const immutableCacheExchange: Exchange = ({ forward }) => (ops$) => {
//   return pipe(
//     ops$,
//     tap(operation => {
//       const { key, query, variables, kind, context, } = operation
      
//       const hashedQuery = hashQuery(query.kind)

//       if (!operation.context.skipCache && cache[hashedQuery]) {
//         // If there's a cached response and we're not skipping cache, use it
//         operation.data = cache[hashedQuery]
//       }
//     }),
//     forward,
//     tap(result => {
//       const { operation, data } = result
//       const { query, variables } = operation
//       const hashedQuery = hashQuery(query)

//       if (data && data.blockTimestamp) {
//         // If the latest blockTimestamp is newer than the cached one, update the cache
//         if (!cache[hashedQuery] || cache[hashedQuery].blockTimestamp < data.blockTimestamp) {
//           cache[hashedQuery] = data
//         }
//       }
//     }),
//     filter(result => {
//       // Filter out the operations that were served from the cache
//       const { operation } = result
//       const hashedQuery = hashQuery(operation.query)
//       return !operation.data || (cache[hashedQuery] && operation.data.blockTimestamp < cache[hashedQuery].blockTimestamp)
//     })
//   )
// }


const cache = cacheExchange({
  storage,
})



export const subgraphClient = createClient({
  url: 'https://api.studio.thegraph.com/query/112/puppet/version/latest',
  exchanges: [cache, fetchExchange],
  fetchSubscriptions: true,
  requestPolicy: 'cache-first',
})



type IQueryPosition = {
  address: viem.Address
  selectedTradeRouteList?: Stream<ISetRouteType[]>
}

type IQueryTraderPositionOpen = IQueryPosition
type IQueryPuppetTradeRoute = IQueryPosition & { activityTimeframe: Stream<IntervalTime> }
type IQueryTraderPositionSettled = IQueryPosition & { activityTimeframe: Stream<IntervalTime> }

export function queryTraderPositionOpen(queryParams: IQueryTraderPositionOpen, ) {
  return map(async params => {
    const list = await querySubgraph(subgraphClient, {
      schema: schema.mirrorPositionOpen,
      filter: {
        trader: params.address
      },
    }, { requestPolicy: 'network-only' })

    if (params.selectedTradeRouteList?.length) {
      const routeTypeKeyList = params.selectedTradeRouteList.map(route => route.routeTypeKey)

      return list.filter(position => routeTypeKeyList.indexOf(position.routeTypeKey) !== -1)
    }

    return list
  }, combineState(queryParams))
}

export function queryTraderPositionSettled(queryParams: IQueryTraderPositionSettled) {
  return map(async params => {
    const blockTimestamp_gt = unixTimestampNow() - params.activityTimeframe
    
    const list = await querySubgraph(subgraphClient, {
      schema: schema.mirrorPositionSettled,
      filter: {
        trader: params.address,
        blockTimestamp_gt
      },
    }, { requestPolicy: 'network-only' })

    if (params.selectedTradeRouteList && params.selectedTradeRouteList.length > 0) {
      const routeTypeKeyList = params.selectedTradeRouteList.map(route => route.routeTypeKey)

      return list.filter(position => routeTypeKeyList.indexOf(position.routeTypeKey) !== -1)
    }
    
    return list
  }, combineState(queryParams))
}

export function queryPuppetTradeRoute(queryParams: IQueryPuppetTradeRoute) {
  return map(async params => {
    const list = await subgraphClient.query(__tempTradeRouteDoc(queryParams.address, params.activityTimeframe), {  }).toPromise().then(res => {
      const puppetTradeRoutes = res.data.puppetTradeRoutes as any[]
      return puppetTradeRoutes.map(item => parseQueryResults(item, schema.puppetTradeRoute))
    }) as IPuppetTradeRoute[]

    if (params.selectedTradeRouteList && params.selectedTradeRouteList.length > 0) {
      const routeTypeKeyList = params.selectedTradeRouteList.map(route => route.routeTypeKey)
      return list.filter(position => routeTypeKeyList.indexOf(position.routeTypeKey) !== -1)
    }
    
    return list
  }, combineState(queryParams))
}


interface IQueryLatestPriceTick {
  token?: viem.Address
  activityTimeframe: Stream<IntervalTime>
}

interface IQueryPriceCandle {
  interval: IntervalTime
  token?: viem.Address
  timestamp_gte?: number
}



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


type IQueryMarketHistory = {
  selectedTradeRouteList: Stream<ISetRouteType[]>
  activityTimeframe: Stream<IntervalTime>
}

const candleSchema: ISchema<{ id: string, timestamp: number; c: bigint; __typename: 'PriceCandle', token: viem.Address} > = {
  id: 'string',
  timestamp: 'int',
  token: 'address',
  c: 'int',
  __typename: 'PriceCandle',
}
  
export function queryLatestPriceTick(queryParams: IQueryMarketHistory, estTickAmout = 20) {
  return map(async params => {
    const interval = getClosestNumber(GMX.PRICEFEED_INTERVAL, params.activityTimeframe / estTickAmout)
    const timestamp_gte = unixTimestampNow() - params.activityTimeframe
    const signedPricesQuery = querySignedPrices()
  
    const candleListQuery =  querySubgraph(subgraphClient, {
      schema: candleSchema,
      filter: {
        interval,
        timestamp_gte,
      },
      orderBy: 'timestamp',
      orderDirection: 'desc',
    })

    const candleList = [...await candleListQuery, ...Object.values(await signedPricesQuery).map(x => ({ timestamp: Number(x.timestamp), c: x.max, token: x.token }))]
    const mapped: IPriceTickListMap = groupArrayManyMap(candleList, x => viem.getAddress(x.token), x => {
      return { timestamp: Number(x.timestamp), price: x.c }
    })

    return mapped
  }, combineState(queryParams))

}

export const latestPriceMap: Stream<IPriceOracleMap> = replayLatest(multicast(periodicRun({
  startImmediate: true,
  interval: 2500,
  actionOp: map(async count => {
    const newLocal = await querySignedPrices()
    return newLocal
  }),
})))

export async function queryLatestTokenPriceFeed(filter: IQueryPriceCandle = { interval: IntervalTime.MIN5 }) {
  const queryFeed = querySubgraph(subgraphClient, {
    orderBy: 'timestamp',
    orderDirection: 'desc',
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
  const query = await querySubgraph(subgraphClient, {
    schema: schema.setRouteType,
  })

  return query.filter(x => x.collateralToken === GMX.ARBITRUM_ADDRESS.USDC)
}

export type { Client }

