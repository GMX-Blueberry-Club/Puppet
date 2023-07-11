import { combineObject } from "@aelea/core"
import { continueWith, fromPromise, map, now, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { ILogOrdered, ILogOrderedEvent, getEventOrderIdentifier, orderEvents, switchMap } from "gmx-middleware-utils"
import * as viem from "viem"
import { publicClient } from "../../wallet/walletLink"
import * as indexDB from "../storage/indexDB"
import * as store from "../storage/storeScope"


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

export type IIndexRpcEventLogConfig<
  _TLog extends ILogOrdered, // used to infer log type
  TAbi extends viem.Abi,
  TEventName extends string,
  TStartBlock extends bigint = bigint,
  TParentScopeName extends string = string,
> = {
  address: viem.Address
  eventName: viem.InferEventName<TAbi, TEventName>
  abi: TAbi,
  parentScope: store.IStoreconfig<TParentScopeName>
  startBlock: TStartBlock
}


export type IIndexEventLogScopeParams<
  TLog extends ILogOrdered,
  TAbi extends viem.Abi,
  TEventName extends string,
  TStartBlock extends bigint = bigint,
  TParentScopeName extends string = string,
> = IIndexRpcEventLogConfig<TLog, TAbi, TEventName, TStartBlock, TParentScopeName> & {
  scope: store.IStoreScope<`${TParentScopeName}.${viem.InferEventName<TAbi, TEventName>}:0x${string}:${TStartBlock}`, { readonly keyPath: "orderId" }>
}

export function createRpcLogEventScope<
  TLog extends ILogOrderedEvent<TAbi, TEventName>,
  TAbi extends viem.Abi,
  TEventName extends string,
  TParentScopeName extends string = string,
  TStartBlock extends bigint = bigint,
  // TArgs extends MaybeExtractEventArgsFromAbi<TAbi, TEventName>,
>(config: IIndexRpcEventLogConfig<TLog, TAbi, TEventName, TStartBlock, TParentScopeName>): IIndexEventLogScopeParams<TLog, TAbi, TEventName, TStartBlock, TParentScopeName> {
  const scopeName = `${config.eventName}:${config.address}:${config.startBlock}` as const
  const scope = store.createStoreScope(config.parentScope, scopeName, { keyPath: 'orderId' } as const)
  
  return { ...config, scope }
}


export type IFilterLogsParams<
  TLog extends ILogOrderedEvent<TAbi, TEventName>,
  TAbi extends viem.Abi,
  TEventName extends string,
  TStartBlock extends bigint = bigint,
  TParentScopeName extends string = string,
> = IIndexEventLogScopeParams<TLog, TAbi, TEventName, TStartBlock, TParentScopeName> & {
  orderId: number
}

export function filterEventLogs<
  TReturn extends ILogOrderedEvent<TAbi, TEventName>,
  TAbi extends viem.Abi,
  TEventName extends string,
  TParentScopeName extends string,
  TStartBlock extends bigint,
>(config: IFilterLogsParams<TReturn, TAbi, TEventName, TStartBlock, TParentScopeName>): Stream<TReturn[]> {

  const unprocessedStoredEvents: Stream<ILogOrderedEvent[]> = indexDB.getRange(config.scope, [Number(config.orderId), Number(1000000000000000000n)])

  return switchLatest(map(params => {
    const lastUnprocessedEvent = params.unprocessedStoredEvents.length > 0 ? params.unprocessedStoredEvents[params.unprocessedStoredEvents.length - 1] : null
    const fromBlock = lastUnprocessedEvent ? lastUnprocessedEvent.blockNumber : config.startBlock
    const orderId = lastUnprocessedEvent ? getEventOrderIdentifier(lastUnprocessedEvent) : config.orderId

    const newLogsQuery: Stream<TReturn[]> = fromPromise(params.publicClient.createContractEventFilter({
      fromBlock,
      abi: config.abi,
      address: config.address,
      eventName: config.eventName,
      strict: true,
      // args: {}
    } as any).then(filter => params.publicClient.getFilterLogs({ filter })))

    const newHistoricLogs = switchMap((syncParams) => {
      const newLogs = orderEvents(syncParams.newLogsQuery)
        .map(ev => {
          return { ...ev, orderId: getEventOrderIdentifier(ev) }
        })
        .filter(ev => ev.orderId > orderId)

      const queryFilteredLogs = indexDB.add(config.scope, newLogs)
      return continueWith(() => queryFilteredLogs, now(params.unprocessedStoredEvents)) // emit two events, stored, then queried filtered logs
    }, combineObject({ newLogsQuery }))

    return newHistoricLogs
  }, combineObject({ publicClient, unprocessedStoredEvents })))
}

