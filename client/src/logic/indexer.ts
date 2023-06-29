import { combineArray, combineObject, fromCallback } from "@aelea/core"
import { at, awaitPromises, combine, concatMap, constant, empty, fromPromise, loop, map, mergeArray, now, scan, switchLatest, tap } from "@most/core"
import { AbiEvent, ExtractAbiEvent } from "abitype"
import * as viem from "viem"
import { publicClient } from "../wallet/walletLink"
import { listenContract } from "./common"
import * as database from "./browserDatabaseScope"
import { IEntityIndexed, IIndexedLogType, createSubgraphClient, filterNull, switchMap } from "gmx-middleware-utils"
import * as GMX from "gmx-middleware-const"
import * as PUPPET from "puppet-middleware-const"
import { Stream } from "@most/types"
import { SeedValue } from "@most/core/dist/combinator/loop"
import { request, gql } from 'graphql-request'
import { zipArray } from "./utils"

type MaybeExtractEventArgsFromAbi<
  TAbi extends viem.Abi,
  TEventName extends string,
> = TEventName extends string ? viem.GetEventArgs<TAbi, TEventName> : undefined



export type ILogIndexEvent<
  TAbi extends viem.Abi,
  TEventName extends string
> = IIndexedLogType<TEventName> & viem.GetEventArgs<TAbi, TEventName, { Required: true }>


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


export function syncEvent<
  TAbi extends viem.Abi,
  TEventName extends string,
  TArgs extends MaybeExtractEventArgsFromAbi<TAbi, TEventName>,
>(config: IEventIndexerConfig<TAbi, TEventName, TArgs>): Stream<viem.Log<bigint, number, ExtractAbiEvent<TAbi, TEventName>, true>> {


  const storeParams = {
    abi: config.abi,
    eventName: config.eventName,
    address: config.address,
    args: config.args,
    logHistory: [] as viem.Log[],
    syncedBlock: 0n,
  }
  const store = database.storeScope(config.parentStoreScope, storeParams)

  const sss = switchLatest(awaitPromises(map(async params => {
    const history = params.store.logHistory

    const getEventParams = {
      abi: config.abi,
      address: config.address,
      eventName: config.eventName,
      args: config.args,
    }

    const startBlock = !config.startBlock || params.store.syncedBlock > config.startBlock ? params.store.syncedBlock : config.startBlock

    // const newLogsFilter = fromPromise(params.publicClient.getLogs({
    //   address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
    //   event: parseAbiItem('event Transfer(address indexed, address indexed, uint256)'),
    //   args: {
    //     from: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
    //     to: '0xa5cc3c03994db5b0d9a5eedd10cabab0813678ac'
    //   },
    //   fromBlock: 16330000n,
    //   toBlock: 16330050n
    // }))
    // listenContract({
    //   address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
    //   args: {
    //     from: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
    //     to: '0xa5cc3c03994db5b0d9a5eedd10cabab0813678ac'
    //   },
    //   fromBlock: 16330000n,
    //   toBlock: 16330050n
    // })(getEventParams.eventName, {})
    const newLogsFilter = fromPromise(params.publicClient.createContractEventFilter({
      ...getEventParams as any,
      fromBlock: startBlock,
      strict: true,
    }).then(filter => params.publicClient.getFilterLogs({ filter })))

    const latestPendingBlock = fromPromise(params.publicClient.getBlock({ blockTag: 'pending' }))


    const fullSyncedLog = switchMap(syncParams => {
      const latestPendingBlockNumber = syncParams.latestPendingBlock.number || 1n
      const logs = [...history, ...syncParams.newLogsFilter]
      const data = { logHistory: logs, syncedBlock: latestPendingBlockNumber - 1n }

      const storedLogs = database.transact(syncParams.db, storeObj => storeObj.put({ id: store.key, data }))

      return switchMap(storeKey => mergeArray(syncParams.newLogsFilter.map(x => now(x))), storedLogs)
    }, combineObject({ db: store.db, newLogsFilter, latestPendingBlock }))


    // publicClient.watchContractEvent({
    //   address: '0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2',
    //   abi: wagmiAbi,
    //   eventName: 'Transfer',
    //   args: { from: '0xc961145a54C96E3aE9bAA048c4F4D6b04C13916b' },
    //   onLogs: logs => console.log(logs)
    // })



    const newEvent: Stream<viem.Log> = fromCallback(emitCb => {
      console.log(getEventParams)

      const listener = params.publicClient.watchContractEvent<TAbi, TEventName>({
        ...getEventParams,
        onLogs: (logs: any) => {
          for (const key in logs) {
            if (Object.prototype.hasOwnProperty.call(logs, key)) {

              const failFilter = Object.entries(getEventParams.args || {}).some(([argKey, argValue]) => {
                return logs[key].args[argKey] !== argValue
              })

              if (!failFilter) {
                emitCb(logs[key])
              }

            }
          }
        }
      } as any)

      return listener
    })



    // const eventStream = listenContract({ ...getEventParams })(getEventParams.eventName, getEventParams.args as any)

    const syncNewEvents = loop((seed, syncParams) => {
      const logs = [...seed, ...syncParams.newLogsFilter]
      const latestPendingBlockNumber = syncParams.latestPendingBlock.number || 1n

      const syncedBlock = latestPendingBlockNumber > params.store.syncedBlock ? latestPendingBlockNumber - 1n : params.store.syncedBlock
      const logHistory = [...logs, syncParams.newEvent]

      const value = { syncedBlock, logHistory }

      return { seed: logHistory, value }
    }, history, combineObject({ newEvent, newLogsFilter, latestPendingBlock }))


    const storedNewEvents = map(ev => ev.logHistory[ev.logHistory.length - 1], database.writeStore(store, syncNewEvents))



    return mergeArray([
      mergeArray(history.map(x => now(x))),
      fullSyncedLog,
      storedNewEvents
    ])
  }, combineObject({ publicClient, store }))))


  return sss
}



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
  logHistory: ILogIndexEvent<TAbi, TEventName>[]
  lastStoredCount: number
}

export function replaySubgraphEvent<
  TAbi extends viem.Abi,
  TEventName extends string,
  TArgs extends viem.GetEventArgs<TAbi, TEventName, { EnableUnion: true }>,
  TReturn extends viem.GetEventArgs<TAbi, TEventName, { Required: true }> & IIndexedLogType<TEventName>,
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
      lastStoredCount: 0,
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
        return list.map(obj => parseGqlRespone(eventAbiManifest, obj))
      }))

      const latestPendingBlock = fromPromise(params.publicClient.getBlock({ blockTag: 'pending' }))


      const newHistoricLogs = map((syncParams): IIndexerState<TAbi, TEventName> => {
        const newLogs = orderEvents(syncParams.newLogsFilter as any) as TReturn[]
        const latestFinalizedBlockNumber = syncParams.latestPendingBlock.number || 1n
        const logHistory = [...history, ...newLogs]
        const latestAddedBatchCount = newLogs.length

        return { ...params.seedStoredData, logHistory, lastStoredCount: latestAddedBatchCount, syncedBlock: latestFinalizedBlockNumber - 1n }
      }, combineObject({ newLogsFilter, latestPendingBlock }))


      return newHistoricLogs
    }, combineObject({ publicClient, seedStoredData })))


    return database.replayWriteStoreScope(config.parentStoreScope, genesisSeed, syncLogs)
  }
}



export interface IProcessConfig<
  TReturn,
  TAbi extends viem.Abi,
  TEventName extends string,
  TEvent extends ILogIndexEvent<TAbi, TEventName>,
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
  TEvent1 extends ILogIndexEvent<TAbi1, TEventName1>,

  TAbi2 extends viem.Abi,
  TEventName2 extends string,
  TEvent2 extends ILogIndexEvent<TAbi2, TEventName2>,

  TAbi3 extends viem.Abi,
  TEventName3 extends string,
  TEvent3 extends ILogIndexEvent<TAbi3, TEventName3>,

  TAbi4 extends viem.Abi,
  TEventName4 extends string,
  TEvent4 extends ILogIndexEvent<TAbi4, TEventName4>,

  TAbi5 extends viem.Abi,
  TEventName5 extends string,
  TEvent5 extends ILogIndexEvent<TAbi5, TEventName5>,
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


function orderEvents<T extends IIndexedLogType<any>>(arr: T[]): T[] {
  return arr.sort((a, b) => {

    if (a.blockNumber === null || b.blockNumber === null) throw new Error('blockNumber is null')

    const order = a.blockNumber === b.blockNumber // same block?, compare transaction index
      ? a.transactionIndex === b.transactionIndex //same transaction?, compare log index
        ? Number(a.logIndex) - Number(b.logIndex)
        : Number(a.transactionIndex) - Number(b.transactionIndex)
      : Number(a.blockNumber - b.blockNumber) // compare block number

    return order
  }
  )
}

const CONTRACTS_PER_BLOCK_PRECISION = 10_000n
const EVENTS_PER_TRANSACTION_PRECISION = 1_000n

export function getEventOrderIdentifier<T extends IIndexedLogType<any>>(logMetric: T): bigint {
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


function parseGqlRespone(abiEvent: AbiEvent, obj: any) {
  const bigIntKeys = [
    'blockNumber', 'transactionIndex', 'logIndex',
    ...abiEvent.inputs.filter(x => x.type === 'uint256' || x.type === 'int256').map(x => x.name)
  ]

  const jsonObj: any = {}

  for (const key in obj) {
    const value = bigIntKeys.includes(key) ? BigInt(obj[key]) : obj[key]
    jsonObj[key] = value

  }

  return jsonObj
}
