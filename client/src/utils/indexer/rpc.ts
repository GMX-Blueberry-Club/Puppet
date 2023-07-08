import { combineObject } from "@aelea/core"
import { fromPromise, map, switchLatest } from "@most/core"
import { AbiEvent, ExtractAbiEvent } from "abitype"
import { ILogEvent, ILogIndex, getEventOrderIdentifier, orderEvents, parseJsonAbiEvent } from "gmx-middleware-utils"
import * as viem from "viem"
import * as database from "../storage/browserDatabaseScope"
import { publicClient } from "../../wallet/walletLink"
import * as indexDB from "../storage/indexDB"


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



type IIndexerState<
  TAbi extends viem.Abi,
  TEventName extends string,
> = {
  eventName: viem.InferEventName<TAbi, TEventName>
  address: `0x${string}`
  args: viem.GetEventArgs<TAbi, TEventName, { EnableUnion: true }>
  head: ILogIndex
  log: ILogEvent<TAbi, TEventName>[]
}

export function replayRpcEvent<
  TAbi extends viem.Abi,
  TEventName extends string,
  TArgs extends MaybeExtractEventArgsFromAbi<TAbi, TEventName>,
>(config: IEventIndexerConfig<TAbi, TEventName, TArgs>): database.IStoreScope<IIndexerState<TAbi, TEventName>> {

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
    args: config.args as any,
    log: [],
    orderIdentifier: 0,
  }

  const currentStoreKey = database.getStoreKey(config.parentStoreScope, genesisSeed)
  const seedStoredData = database.getStoredData(currentStoreKey, genesisSeed)


  
  const syncLogs = switchLatest(map(params => {
    const history = params.seedStoredData.log

    const newLogsQuery = fromPromise(params.publicClient.createContractEventFilter({
      abi: config.abi,
      address: config.address,
      eventName: config.eventName,
      strict: true
      // args: {}
    } as any).then(filter => params.publicClient.getFilterLogs({ filter })))

    // const latestPendingBlock = fromPromise(params.publicClient.getBlock({ blockTag: 'pending' }))

    const newHistoricLogs = map((syncParams): IIndexerState<TAbi, TEventName> => {
      const newLogs = orderEvents(syncParams.newLogsQuery as any).map(ev => parseJsonAbiEvent(eventAbiManifest, ev)) as viem.Log<bigint, number, ExtractAbiEvent<TAbi, TEventName>, true>[]
      const lst = newLogs[newLogs.length - 1]
      const orderIdentifier = getEventOrderIdentifier(lst)
      const head: ILogIndex = { blockNumber, logIndex, transactionIndex }

      const log = [...history, ...newLogs]

      return { ...genesisSeed, head, log }
    }, combineObject({ newLogsQuery }))


    return newHistoricLogs
  }, combineObject({ publicClient, seedStoredData })))


  const scope = database.replayWriteStoreScope(config.parentStoreScope, genesisSeed, syncLogs)
  return scope
  // return map(ev => ev.log, newLocal)
}

