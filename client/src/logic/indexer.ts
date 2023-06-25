import { combineArray, combineObject, fromCallback } from "@aelea/core"
import { at, awaitPromises, empty, fromPromise, loop, map, mergeArray, now, scan, switchLatest } from "@most/core"
import { AbiEvent, ExtractAbiEvent } from "abitype"
import * as viem from "viem"
import { publicClient } from "../wallet/walletLink"
import { listenContract } from "./common"
import * as database from "./database"
import { createSubgraphClient, switchMap } from "gmx-middleware-utils"
import * as GMX from "gmx-middleware-const"
import * as PUPPET from "puppet-middleware-const"
import { Stream } from "@most/types"
import { SeedValue } from "@most/core/dist/combinator/loop"
import { request, gql } from 'graphql-request'

type MaybeExtractEventArgsFromAbi<
  TAbi extends viem.Abi,
  TEventName extends string,
> = TEventName extends string ? viem.GetEventArgs<TAbi, TEventName> : undefined

type ILogIndexMetric = {
  transactionIndex: number | bigint
  logIndex: number | bigint
  blockNumber: bigint
}


export type IIndexerConfig<
  TAbi extends viem.Abi,
  TEventName extends string,
> = {
  address: viem.Address
  eventName: viem.InferEventName<TAbi, TEventName>
  abi: TAbi,
  store: database.IStoreScope<any>
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
  const store = database.createStoreScope(config.store, storeParams)

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


    const storedNewEvents = map(ev => ev.logHistory[ev.logHistory.length - 1], database.streamSaveStore(store.db, store.key, syncNewEvents))



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
  TArgs extends viem.GetEventArgs<TAbi, TEventName, {}>,
> = IIndexerConfig<TAbi, TEventName> & {
  subgraph: string
  args: TArgs
}

export function replaySubgraphEvent<
  TAbi extends viem.Abi,
  TEventName extends string,
  TArgs extends viem.GetEventArgs<TAbi, TEventName, {}>,
  TReturn extends viem.GetEventArgs<TAbi, TEventName, { Required: true }> & ILogIndexMetric
>(config: ISubgraphConfig<TAbi, TEventName, TArgs>): Stream<TReturn> {

  const eventAbiManifest = config.abi.find((x): x is AbiEvent => {
    if ('name' in x && x.type === 'event' && x.name === config.eventName) {
      return true
    }

    return false
  })

  if (!eventAbiManifest) {
    throw new Error(`No event ${config.eventName} found in abi`)
  }

  const storeParams = {
    abi: config.abi,
    eventName: config.eventName,
    address: config.address,
    args: config.subgraph,
    logHistory: [] as viem.Log[],
    syncedBlock: 0n,
    latestIndexMetric: {
      transactionIndex: 0n,
      logIndex: 0n,
      blockNumber: 0n
    }
  }

  const graphDocumentIdentifier = `${config.eventName.charAt(0).toLowerCase() + config.eventName.slice(1)}s`






  const store = database.createStoreScope(config.store, storeParams)

  const sss = switchLatest(awaitPromises(map(async params => {
    const startBlock = config.startBlock
      ? config.startBlock > params.store.syncedBlock ? config.startBlock : params.store.syncedBlock
      : params.store.syncedBlock
    const history = params.store.logHistory

    const getEventParams = {
      abi: config.abi,
      address: config.address,
      eventName: config.eventName,
      args: config.args,
    }

    const document = gql`{
      ${graphDocumentIdentifier} ( where: { _change_block: { number_gte: ${startBlock} }, ${objectToGraphql(getEventParams.args)} } ) {
        ${eventAbiManifest.inputs.map(x => x.name).join('\n')}
        transactionIndex
        logIndex
        blockNumber
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
      return list.map(obj => alignGqlResponeWithAbi(eventAbiManifest, obj))
    }))

    const latestPendingBlock = fromPromise(params.publicClient.getBlock({ blockTag: 'pending' }))


    const newHistoricLogs = switchMap(syncParams => {
      if (syncParams.newLogsFilter.length === 0) {
        return empty()
      }

      const orderedEvents = orderEvents(syncParams.newLogsFilter as any) as viem.Log[]
      const latestFinalizedBlockNumber = syncParams.latestPendingBlock.number || 1n
      const logs = [...history, ...orderedEvents]

      const { transactionIndex, blockNumber, logIndex } = orderedEvents[orderedEvents.length - 1]
      const latestIndexMetric = { transactionIndex, logIndex, blockNumber }
      const data = { logHistory: logs, latestIndexMetric, syncedBlock: latestFinalizedBlockNumber - 1n }

      const storedLogs = database.transact(syncParams.db, storeObj => storeObj.put({ id: store.key, data }))

      return switchMap(storeKey => mergeArray(syncParams.newLogsFilter.map(ev => {

        const orderIdentifier = getEventOrderIdentifier(ev)

        return at(-Number(orderIdentifier), ev)
      })), storedLogs)
    }, combineObject({ db: store.db, newLogsFilter, latestPendingBlock }))


    const newEvent: Stream<viem.Log> = fromCallback(emitCb => {
      const listener = params.publicClient.watchContractEvent<TAbi, TEventName>({
        ...getEventParams,
        strict: true,
        // pollingInterval: 1000,
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


    const syncNewEvents = map((syncParams) => {
      const syncedBlock = syncParams.newEvent.blockNumber || syncParams.latestPendingBlock.number || 1n
      const logHistory = [...history, ...syncParams.newLogsFilter, syncParams.newEvent]
      const { transactionIndex, blockNumber, logIndex } = syncParams.newEvent
      const latestIndexMetric = { transactionIndex, logIndex, blockNumber }
      const value = { logHistory, latestIndexMetric, syncedBlock }

      return value
    }, combineObject({ newEvent, newLogsFilter, latestPendingBlock }))

    const storedNewEvents = map(ev => ev.logHistory[ev.logHistory.length - 1], database.streamSaveStore(store.db, store.key, syncNewEvents))


    console.log(config.eventName)
    return mergeArray([
      mergeArray(history.map(ev => {

        // console.log(performance.now())
        const oi = getEventOrderIdentifier(ev)
        const n = Number(oi)
        const scheduleTime = n / Math.pow(10, n.toString().length) * 10000

        return at(scheduleTime, ev)
      })),
      newHistoricLogs,
      storedNewEvents
    ])
  }, combineObject({ publicClient, store }))))


  return sss

  // return {
  //   run(sink, scheduler) {
  //     return sss.run(sink, scheduler)
  //   },
  //   config
  // }
}



export interface IProcessConfig<TReturn, TEvent extends ILogIndexMetric> {
  source: Stream<TEvent>
  step: (seed: TReturn, value: TEvent) => TReturn
}

export function processSources<
  TReturn,
  TSource extends ILogIndexMetric,
  TProcess extends readonly IProcessConfig<TReturn, TSource>[],
// TAbi extends viem.Abi,
// TEventName extends string,
// TArgs extends MaybeExtractEventArgsFromAbi<TAbi, TEventName>,
>(initialState: TReturn, ...processList: TProcess): Stream<TReturn> {

  const combinedSources = processList.map((processConfig) => {

    return scan((seed, next) => processConfig.step(seed, next), initialState, processConfig.source)
  })

  return mergeArray(combinedSources)
}


function orderEvents<T extends ILogIndexMetric>(arr: T[]): T[] {
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

export function getEventOrderIdentifier(logMetric: ILogIndexMetric): bigint {
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


function alignGqlResponeWithAbi(abiEvent: AbiEvent, obj: any) {

  const bigIntKeys = [
    'blockNumber', 'transactionIndex', 'logIndex',
    ...abiEvent.inputs.filter(x => x.type === 'uint256').map(x => x.name)
  ]

  const jsonObj: any = {}

  for (const key in obj) {
    const value = bigIntKeys.includes(key) ? BigInt(obj[key]) : obj[key]
    jsonObj[key] = value

  }

  return jsonObj
}
