import { combineObject } from "@aelea/core"
import { fromPromise, map, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { AbiEvent } from "abitype"
import { ILogEvent, ILogSubgraphType, ILogType, getMappedValue, orderEvents } from "gmx-middleware-utils"
import { gql, request } from 'graphql-request'
import * as viem from "viem"
import * as database from "../logic/browserDatabaseScope"
import { publicClient } from "../wallet/walletLink"
import { IQuerySubgraphConfig, ISchema, ISchemaQuery, PrettifyReturn, parseTypeFnMap, querySubgraph } from "./subgraph"

type MaybeExtractEventArgsFromAbi<
  TAbi extends viem.Abi,
  TEventName extends string,
> = TEventName extends string ? viem.GetEventArgs<TAbi, TEventName> : undefined




export type IIndexerConfig<
  TAbi extends viem.Abi,
  TEventName extends string,
> = {
  address: viem.Address
  eventName: viem.InferEventName<TAbi, TEventName>
  abi: TAbi,
  parentStoreScope: database.IStoreScope<any>
  startBlock?: bigint
}

export type IEventIndexerConfig<
  TAbi extends viem.Abi,
  TEventName extends string,
  TArgs extends MaybeExtractEventArgsFromAbi<TAbi, TEventName>,
> = IIndexerConfig<TAbi, TEventName> & (MaybeExtractEventArgsFromAbi<TAbi, TEventName> extends infer TEventFilterArgs
  ? { args?: TEventFilterArgs | (TArgs extends TEventFilterArgs ? TArgs : never) }
  : { args?: never })



export type ISubgraphConfig<
  TAbi extends viem.Abi,
  TEventName extends string,
> = IIndexerConfig<TAbi, TEventName> & {
  subgraph: string
}

type IIndexerState<
  TAbi extends viem.Abi,
  TEventName extends string,
> = {
  eventName: viem.InferEventName<TAbi, TEventName>
  address: `0x${string}`
  args: viem.GetEventArgs<TAbi, TEventName, { EnableUnion: true }>
  syncedBlock: bigint
  logHistory: ILogEvent<TAbi, TEventName>[]
}

export function replaySubgraphEvent<
  TAbi extends viem.Abi,
  TEventName extends string,
  TArgs extends viem.GetEventArgs<TAbi, TEventName, { EnableUnion: true }>,
  TReturn extends ILogEvent<TAbi, TEventName>,
>(config: ISubgraphConfig<TAbi, TEventName>): <TExtendArgs>(args: TArgs, extendArgs?: TExtendArgs) => database.IStoreScope<IIndexerState<TAbi, TEventName>> {

  return (args: TArgs) => {
    const eventAbiManifest = config.abi.find((x): x is AbiEvent => {
      if ('name' in x && x.type === 'event' && x.name === config.eventName) {
        return true
      }

      return false
    })

    if (!eventAbiManifest) {
      throw new Error(`No event ${config.eventName} found in abi`)
    }

    const genesisSeed: IIndexerState<TAbi, TEventName> = {
      eventName: config.eventName,
      address: config.address,
      args: args,
      logHistory: [],
      syncedBlock: 0n,
    }


    const currentStoreKey = database.getStoreKey(config.parentStoreScope, genesisSeed)
    const seedStoredData = database.getStoredSeedData(currentStoreKey, genesisSeed)

    const graphDocumentIdentifier = `${config.eventName.charAt(0).toLowerCase() + config.eventName.slice(1)}s`

    const syncLogs = switchLatest(map(params => {
      const startBlock = config.startBlock
        ? config.startBlock > params.seedStoredData.syncedBlock ? config.startBlock : params.seedStoredData.syncedBlock
        : params.seedStoredData.syncedBlock
      const history = params.seedStoredData.logHistory

      const getEventParams = {
        abi: config.abi,
        address: config.address,
        eventName: config.eventName,
        args: args,
      }

      const document = gql`{
      ${graphDocumentIdentifier} ( where: { _change_block: { number_gte: ${startBlock} }, ${objectToGraphql(getEventParams.args || {})} } ) {
        ${eventAbiManifest.inputs.map(x => x.name).join('\n')}
        transactionIndex
        logIndex
        blockNumber
        blockTimestamp
        __typename
      }
}`


      const newLogsFilter: Stream<TReturn[]> = fromPromise(request({
        document,
        url: config.subgraph
      }).then((x: any) => {

        if (!(graphDocumentIdentifier in x)) {
          throw new Error(`No ${graphDocumentIdentifier} found in subgraph response`)
        }

        const list: any[] = x[graphDocumentIdentifier]
        return list.map(obj => parseJsonAbiEvent(eventAbiManifest, obj))
      }))

      const latestPendingBlock = fromPromise(params.publicClient.getBlock({ blockTag: 'pending' }))


      const newHistoricLogs = map((syncParams): IIndexerState<TAbi, TEventName> => {
        const newLogs = orderEvents(syncParams.newLogsFilter as any) as TReturn[]
        const latestFinalizedBlockNumber = syncParams.latestPendingBlock.number || 1n
        const logHistory = [...history, ...newLogs]

        return { ...params.seedStoredData, logHistory, syncedBlock: latestFinalizedBlockNumber - 1n }
      }, combineObject({ newLogsFilter, latestPendingBlock }))


      return newHistoricLogs
    }, combineObject({ publicClient, seedStoredData })))


    return database.replayWriteStoreScope(config.parentStoreScope, genesisSeed, syncLogs)
  }
}


export interface IReplaySubgraphConfig extends IQuerySubgraphConfig {
  parentStoreScope: database.IStoreScope<any>
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
): database.IStoreScope<Type[]> => {

  const genesisSeed = {
    subgraph: config.subgraph,
    schema,
    logHistory: [],
    syncedBlock: 0n,
  }


  const currentStoreKey = database.getStoreKey(config.parentStoreScope, genesisSeed)
  const seedStoredData = database.getStoredSeedData(currentStoreKey, genesisSeed)
  
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


  const newLocal = database.replayWriteStoreScope(config.parentStoreScope, genesisSeed, syncLogs)
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


function parseJsonAbiEvent(abiEvent: AbiEvent, obj: any) {
  const bigIntKeys = [
    'blockNumber', 'transactionIndex', 'logIndex',
    ...abiEvent.inputs.filter(x => x.type === 'uint256' || x.type === 'int256').map(x => x.name)
  ]

  const jsonObj: any = {}

  for (const key in obj) {
    const jsonValue = obj[key]
    const value = bigIntKeys.includes(key)
      ? getMappedValue(parseTypeFnMap, jsonValue)(jsonValue)
      : obj[key]
    jsonObj[key] = value

  }

  return jsonObj
}
