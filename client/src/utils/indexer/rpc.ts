import { combineObject } from "@aelea/core"
import { fromPromise, map, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { AbiEvent, ExtractAbiEvent } from "abitype"
import { ILogEvent, ILogOrdered, getEventOrderIdentifier, orderEvents, switchMap } from "gmx-middleware-utils"
import * as viem from "viem"
import { publicClient } from "../../wallet/walletLink"
import * as indexDB from "../storage/indexDB"
import * as store from "../storage/storeScope"
import { PrettifyReturn } from "./subgraph"



export type IIndexerConfig<
  TAbi extends viem.Abi,
  TEventName extends string,
  TScopeName extends string = string,
  TStartBlock extends number = number,
> = {
  address: viem.Address
  eventName: viem.InferEventName<TAbi, TEventName>
  abi: TAbi,
  parentStoreScope: store.IStoreconfig<TScopeName>
  startBlock: TStartBlock
}

// type MaybeExtractEventArgsFromAbi<
//   TAbi extends viem.Abi,
//   TEventName extends string,
// > = TEventName extends string ? viem.GetEventArgs<TAbi, TEventName> : undefined
// export type IEventIndexerConfig<
//   TAbi extends viem.Abi,
//   TEventName extends string,
//   TArgs extends MaybeExtractEventArgsFromAbi<TAbi, TEventName>,
//   TScopeName extends string,
//   TStartBlock extends bigint,
// > = IIndexerConfig<TAbi, TEventName, TScopeName, TStartBlock> & (MaybeExtractEventArgsFromAbi<TAbi, TEventName> extends infer TEventFilterArgs
//   ? { args?: TEventFilterArgs | (TArgs extends TEventFilterArgs ? TArgs : never) }
//   : { args?: never })

export type IFilterLogsParams<
  TValue extends ILogOrdered,
  TAbi extends viem.Abi,
  TEventName extends string,
  TScopeName extends string = string,
  TStartBlock extends number = number,
  // TScopeName extends string,
> = IIndexerConfig<TAbi, TEventName, TScopeName, TStartBlock> & {
  abiEvent: AbiEvent
  scope: store.IStoreScope<`${TScopeName}:${TEventName}:${viem.Address}:${TStartBlock}`, { readonly keyPath: "orderIdentifier" }>
  // log: Stream<TValue[]>
}

// store.IStoreScope<`${TScopeName}.${TEventName}:${viem.Address}:${bigint}`, {readonly keyPath: "orderIdentifier"}>
export function replayRpcLog<
  TValue extends ILogOrdered,
  TAbi extends viem.Abi,
  TEventName extends string,
  TScopeName extends string,
  TStartBlock extends number,
  // TArgs extends MaybeExtractEventArgsFromAbi<TAbi, TEventName>,
>(config: IIndexerConfig<TAbi, TEventName, TScopeName, TStartBlock>): IFilterLogsParams<TValue, TAbi, TEventName, TScopeName, TStartBlock> {

  const abiEvent = config.abi.find((x): x is AbiEvent => {
    if ('name' in x && x.type === 'event' && x.name === config.eventName) {
      return true
    }

    return false
  })

  if (!abiEvent) {
    throw new Error(`No event ${config.eventName} found in abi`)
  }

  const newLocal = `${config.eventName as TEventName}:${config.address}:${config.startBlock}` as const
  // store.IStoreScope<`${TScopeName}.${TEventName}:0x${string}`, {readonly keyPath: "orderIdentifier"}>
  const scope = store.createStoreScope(config.parentStoreScope, newLocal, { keyPath: 'orderIdentifier' } as const)
  
  // const parseSeedData: Stream<any[]> = map(res => {
  //   return res === null ? [] : res
  // }, seedStoredData)

  // const log = syncLogs
  // const log = mergeArray([parseSeedData, syncLogs])
  // const scope = store.replayWriteStoreScope(config.parentStoreScope, genesisSeed, syncLogs)
  return { ...config, scope, abiEvent }
}

export function filterLogs<
  TValue extends ILogOrdered,
  TAbi extends viem.Abi,
  TEventName extends string,
  TScopeName extends string,
  TStartBlock extends number,
  TReturn extends ILogEvent<TAbi, TEventName> & ILogOrdered,
>(config: IFilterLogsParams<TValue, TAbi, TEventName, TScopeName, TStartBlock>): Stream<TReturn[]> {
  return switchLatest(map(params => {
    const newLogsQuery: Stream<viem.Log<bigint, number, ExtractAbiEvent<TAbi, TEventName>, true, TAbi, TEventName>[]> = fromPromise(params.publicClient.createContractEventFilter({
      abi: config.abi,
      address: config.address,
      eventName: config.eventName,
      strict: true,
      fromBlock: config.startBlock,
      // args: {}
    } as any).then(filter => params.publicClient.getFilterLogs({ filter })))


    const newHistoricLogs = switchMap((syncParams) => {
      const newLogs = orderEvents(syncParams.newLogsQuery)
        .map(ev => {
          const orderIdentifier = getEventOrderIdentifier(ev as any)
          const blockNumber = BigInt(ev.blockNumber!)
          const transactionIndex = Number(ev.transactionIndex!)
          const logIndex = Number(ev.logIndex!)
          return { ...ev.args, blockNumber, transactionIndex, logIndex, orderIdentifier }
        })

      return indexDB.add(config.scope, newLogs)
    }, combineObject({ newLogsQuery }))

    return newHistoricLogs
  }, combineObject({ publicClient })))
}

