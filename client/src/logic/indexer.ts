import { combineObject } from "@aelea/core"
import { fromPromise, map, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { AbiEvent } from "abitype"
import { ILogEvent, ILogIndexIdentifier, ILogType, getMappedValue, orderEvents, switchMap } from "gmx-middleware-utils"
import { gql, request } from 'graphql-request'
import * as viem from "viem"
import { publicClient } from "../wallet/walletLink"
import * as database from "./browserDatabaseScope"
import { IQuerySubgraphConfig, ISchema, ISchemaQuery, PrettifyReturn, parseTypeFnMap, querySubgraph } from "./querySubgraph"
import { zipArray } from "./utils"

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


export const replaySubgraphQuery = <Type extends ILogType<any>, TQuery>(
  config: IReplaySubgraphConfig,
  schema: ISchema<Type>,
  query: TQuery
): database.IStoreScope<IReplaySubgraphQueryState<Type, TQuery>> => {

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



export interface IProcessConfig<
  TReturn,
  TAbi extends viem.Abi,
  TEventName extends string,
  TEvent extends ILogEvent<TAbi, TEventName>,
> {
  source: database.IStoreScope<IIndexerState<TAbi, TEventName>>
  step: (seed: TReturn, value: TEvent) => TReturn
}

interface IProcessStep<T> {
  data: T
  indexedCountMap: Record<string, number>
}

export function processSources<
  TReturn,

  TAbi1 extends viem.Abi,
  TEventName1 extends string,
  TEvent1 extends ILogEvent<TAbi1, TEventName1>,

  TAbi2 extends viem.Abi,
  TEventName2 extends string,
  TEvent2 extends ILogEvent<TAbi2, TEventName2>,

  TAbi3 extends viem.Abi,
  TEventName3 extends string,
  TEvent3 extends ILogEvent<TAbi3, TEventName3>,

  TAbi4 extends viem.Abi,
  TEventName4 extends string,
  TEvent4 extends ILogEvent<TAbi4, TEventName4>,

  TAbi5 extends viem.Abi,
  TEventName5 extends string,
  TEvent5 extends ILogEvent<TAbi5, TEventName5>,
>(
  parentStoreScope: database.IStoreScope<any>,
  scopeState: TReturn,
  // the rest is used for type inference
  process1: IProcessConfig<TReturn, TAbi1, TEventName1, TEvent1>,
  process2?: IProcessConfig<TReturn, TAbi2, TEventName2, TEvent2>,
  process3?: IProcessConfig<TReturn, TAbi3, TEventName3, TEvent3>,
  process4?: IProcessConfig<TReturn, TAbi4, TEventName4, TEvent4>,
  process5?: IProcessConfig<TReturn, TAbi5, TEventName5, TEvent5>,
): Stream<TReturn> {


  // eslint-disable-next-line prefer-rest-params
  const processList: IProcessConfig<TReturn, any, any, any>[] = [...arguments].slice(2)
  const sourceEventList = processList.map(x => x.source as database.IStoreScope<IIndexerState<viem.Abi, string>>)

  const storeScopeSeed = sourceEventList.reduce((seed, next) => {
    seed.indexedCountMap[next.key] = 0
    return seed
  }, { indexedCountMap: {}, data: scopeState } as IProcessStep<TReturn>)

  const currentStoreKey = database.getStoreKey(parentStoreScope, storeScopeSeed)
  const seedStoredData = database.getStoredSeedData(currentStoreKey, storeScopeSeed)

  const processWriteSources = switchMap(storeState => {
    const nextSeed = storeState
    const stepState = zipArray((...nextLogEvents) => {

      const nextEvents = nextLogEvents.flatMap((state, processIdx) => {
        const processKey = processList[processIdx].source.key
        const totalLogCount = state.logHistory.length
        const deltaStoreCount = state.logHistory.length - nextSeed.indexedCountMap[processKey]

        nextSeed.indexedCountMap[processKey] = totalLogCount

        return deltaStoreCount
          ? state.logHistory.slice(-deltaStoreCount)
          : []
      })
      const orderedNextEvents = orderEvents(nextEvents)

      for (let index = 0; index < orderedNextEvents.length; index++) {
        const sourceConfig = orderedNextEvents[index]

        for (let processIdx = 0; processIdx < processList.length; processIdx++) {
          const processState = nextLogEvents[processIdx]

          if (processState.logHistory.includes(sourceConfig)) {
            const processSrc = processList[processIdx]
            nextSeed.data = processSrc.step(nextSeed.data, sourceConfig)
          }
        }
      }

      return nextSeed
    }, ...sourceEventList)

    return stepState
  }, seedStoredData)

  const store = database.writeStoreData(currentStoreKey, processWriteSources)

  return map(s => s.data, store)
}


const CONTRACTS_PER_BLOCK_PRECISION = 10_000n
const EVENTS_PER_TRANSACTION_PRECISION = 1_000n

export function getEventOrderIdentifier<T extends ILogIndexIdentifier>(logMetric: T): bigint {
  const paddedBlockNumber = logMetric.blockNumber * CONTRACTS_PER_BLOCK_PRECISION
  const paddedTxIndex = BigInt(logMetric.transactionIndex) * EVENTS_PER_TRANSACTION_PRECISION
  return paddedBlockNumber + paddedTxIndex + BigInt(logMetric.logIndex)
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
