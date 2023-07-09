import { combineObject } from "@aelea/core"
import { fromPromise, map, switchLatest } from "@most/core"
import { ILogSubgraphType, ILogType, orderEvents } from "gmx-middleware-utils"
import * as store from "../storage/storeScope"
import { publicClient } from "../../wallet/walletLink"
import { IQuerySubgraphConfig, ISchema, ISchemaQuery, PrettifyReturn, querySubgraph } from "./subgraph"
import * as indexDB from "../storage/indexDB"


export interface IReplaySubgraphConfig extends IQuerySubgraphConfig {
  parentStoreScope: store.IStoreconfig<any>
}


export interface IReplaySubgraphQueryState<Type extends ILogType<any>, TQuery> {
  subgraph: string;
  schema: ISchema<Type>
  logHistory: PrettifyReturn<ISchemaQuery<Type, TQuery>[]>
  syncedBlock: bigint
}


export const replaySubgraphQuery = <Type extends ILogSubgraphType<any>, TQuery>(
  config: IReplaySubgraphConfig,
  schema: ISchema<Type>,
  query: TQuery
): store.IStoreScope<Type[]> => {

  const genesisSeed = {
    subgraph: config.subgraph,
    schema,
    logHistory: [],
    syncedBlock: 0n,
  }
  const indexDbParams = indexDB.createDb(schema.__typename + ':' + config.subgraph)


  const currentStoreKey = store.createStoreScope(config.parentStoreScope, schema.__typename as any, genesisSeed)
  const seedStoredData = store.read(currentStoreKey, genesisSeed)
  
  const syncLogs = switchLatest(map(params => {
    const startBlock = config.startBlock
      ? config.startBlock > params.seedStoredData.syncedBlock ? config.startBlock : params.seedStoredData.syncedBlock
      : params.seedStoredData.syncedBlock
    const history = params.seedStoredData.logHistory
    const newLogsFilter = querySubgraph({ ...config, startBlock }, schema, query)

    const latestPendingBlock = fromPromise(params.publicClient.getBlock({ blockTag: 'pending' }))

    const newHistoricLogs = map((syncParams) => {
      const newLogs = orderEvents(syncParams.newLogsFilter as any) as ISchemaQuery<Type, TQuery>[]
      const latestFinalizedBlockNumber = syncParams.latestPendingBlock.number || 1n
      const logHistory = [...history, ...newLogs]

      return { ...params.seedStoredData, logHistory, syncedBlock: latestFinalizedBlockNumber - 1n }
    }, combineObject({ newLogsFilter, latestPendingBlock }))


    return newHistoricLogs
  }, combineObject({ publicClient, seedStoredData })))


  const newLocal = store.replayWriteStoreScope(config.parentStoreScope, genesisSeed, syncLogs)
  return newLocal
}




function objectToGraphql<T extends object>(obj: T): string {
  let result = ''

  for (const key in obj) {
    let value: any = obj[key]

    if (typeof value === 'bigint') {
      value = value.toString()
    } else if (typeof value === 'string') {
      value = `"${value}"`
    }

    result += `${key}: ${value}, `
  }

  // Remove trailing comma and space
  result = result.slice(0, -2)

  return result
}


export function fillQuery(obj: any){
  return Object.keys(obj).reduce((acc, key) => {
    const value = obj[key]
    acc[key] = value instanceof Object ? fillQuery(value) : null
    return acc
  }, {} as any)
}


