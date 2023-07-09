import { combineObject } from "@aelea/core"
import { fromPromise, map, mergeArray, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { AbiEvent } from "abitype"
import { ILogEvent, ILogOrdered, getEventOrderIdentifier, orderEvents, parseJsonAbiEvent, switchMap } from "gmx-middleware-utils"
import * as viem from "viem"
import { publicClient } from "../../wallet/walletLink"
import * as indexDB from "../storage/indexDB"
import * as store from "../storage/storeScope"


type MaybeExtractEventArgsFromAbi<
  TAbi extends viem.Abi,
  TEventName extends string,
> = TEventName extends string ? viem.GetEventArgs<TAbi, TEventName> : undefined

export type IIndexerConfig<
  TAbi extends viem.Abi,
  TEventName extends string,
  TScopeName extends string
> = {
  address: viem.Address
  eventName: viem.InferEventName<TAbi, TEventName>
  abi: TAbi,
  parentStoreScope: store.IStoreconfig<TScopeName>
  startBlock?: bigint
} 
export type IEventIndexerConfig<
  TAbi extends viem.Abi,
  TEventName extends string,
  TArgs extends MaybeExtractEventArgsFromAbi<TAbi, TEventName>,
  TScopeName extends string
> = IIndexerConfig<TAbi, TEventName, TScopeName> & (MaybeExtractEventArgsFromAbi<TAbi, TEventName> extends infer TEventFilterArgs
  ? { args?: TEventFilterArgs | (TArgs extends TEventFilterArgs ? TArgs : never) }
  : { args?: never })


type IRpcLogType<TAbi extends viem.Abi, TEventName extends string> = ILogOrdered & ILogEvent<TAbi, TEventName>

export type IReplayRpcStore<
  // TAbi extends viem.Abi,
  // TEventName extends string,
  TValue extends ILogOrdered,
  // TScopeName extends string,
> = {
  // scope: store.IStoreScope<`${TScopeName}.${TEventName}:${viem.Address}`, {readonly keyPath: "orderIdentifier"}>
  scope: store.IStoreScope<string, {readonly keyPath: "orderIdentifier"}>
  log: Stream<TValue[]>
}

export function replayRpcLog<
  TAbi extends viem.Abi,
  TEventName extends string,
  TScopeName extends string,
  TArgs extends MaybeExtractEventArgsFromAbi<TAbi, TEventName>,
>(config: IEventIndexerConfig<TAbi, TEventName, TArgs, TScopeName>): IReplayRpcStore<IRpcLogType<TAbi, TEventName>> {

  const eventAbiManifest = config.abi.find((x): x is AbiEvent => {
    if ('name' in x && x.type === 'event' && x.name === config.eventName) {
      return true
    }

    return false
  })

  if (!eventAbiManifest) {
    throw new Error(`No event ${config.eventName} found in abi`)
  }

  const tableKey = `${config.eventName}:${config.address}:${config.startBlock}` as const
  // store.IStoreScope<`${TScopeName}.${TEventName}:0x${string}`, {readonly keyPath: "orderIdentifier"}>
  const scope = store.createStoreScope(config.parentStoreScope, tableKey, { keyPath: 'orderIdentifier' } as const)
  const seedStoredData = indexDB.getRange(scope, [Number(config.startBlock || 0), Number(1000000000000000000n)])
  const parseSeedData: Stream<any[]> = map(res => {
    return res === null ? [] : res
  }, seedStoredData)
  
  const syncLogs = switchLatest(map(params => {
    const newLogsQuery = fromPromise(params.publicClient.createContractEventFilter({
      abi: config.abi,
      address: config.address,
      eventName: config.eventName,
      strict: true,
      fromBlock: config.startBlock,
      // args: {}
    } as any).then(filter => params.publicClient.getFilterLogs({ filter })))


    const newHistoricLogs = switchMap((syncParams) => {
      const newLogs = orderEvents(syncParams.newLogsQuery as any)
        .map(ev => {
          return { ...parseJsonAbiEvent(eventAbiManifest, ev), orderIdentifier: getEventOrderIdentifier(ev as any) }
        })

      return indexDB.add(scope, newLogs)
    }, combineObject({ newLogsQuery }))


    return newHistoricLogs
  }, combineObject({ publicClient, parseSeedData })))

  const log = syncLogs
  // const log = mergeArray([parseSeedData, syncLogs])
  // const scope = store.replayWriteStoreScope(config.parentStoreScope, genesisSeed, syncLogs)
  return { log, scope }
}

