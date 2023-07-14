import { chain, fromPromise, map, now, recoverWith } from "@most/core"
import { Stream } from "@most/types"
import { ILogOrdered, ILogOrderedEvent, getEventOrderIdentifier, min, orderEvents, switchMap } from "gmx-middleware-utils"
import * as viem from "viem"
import * as indexDB from "../storage/indexDB"
import * as store from "../storage/storeScope"


export type IIndexRpcEventLogConfig<
  _TLog extends ILogOrdered, // used to infer log type
  TAbi extends viem.Abi,
  TEventName extends string,
  TParentScopeName extends string = string,
> = {
  address: viem.Address
  eventName: viem.InferEventName<TAbi, TEventName>
  abi: TAbi,
  parentScope: store.IStoreconfig<TParentScopeName>
}

export type IIndexEventLogScopeParams<
  TLog extends ILogOrdered,
  TAbi extends viem.Abi,
  TEventName extends string,
  TParentScopeName extends string = string,
> = IIndexRpcEventLogConfig<TLog, TAbi, TEventName, TParentScopeName> & {
  scope: store.IStoreScope<`${TParentScopeName}.${viem.InferEventName<TAbi, TEventName>}:0x${string}`, { readonly keyPath: "orderId" }>
}

export function createRpcLogEventScope<
  TLog extends ILogOrderedEvent<TAbi, TEventName>,
  TAbi extends viem.Abi,
  TEventName extends string,
  TParentScopeName extends string = string,
>(config: IIndexRpcEventLogConfig<TLog, TAbi, TEventName, TParentScopeName>): IIndexEventLogScopeParams<TLog, TAbi, TEventName, TParentScopeName> {
  const scopeName = `${config.eventName}:${config.address}` as const
  const scope = store.createStoreScope(config.parentScope, scopeName, { keyPath: 'orderId' } as const)
  
  return { ...config, scope }
}


export type IFilterLogsParams<
  TLog extends ILogOrderedEvent<TAbi, TEventName>,
  TAbi extends viem.Abi,
  TEventName extends string,
  TParentScopeName extends string = string,
> = IIndexEventLogScopeParams<TLog, TAbi, TEventName, TParentScopeName> & {
  orderId: number
  rangeSize: bigint,
  fromBlock: bigint
  toBlock: bigint
  publicClient: viem.PublicClient
}

export function queryEventLog<
  TReturn extends ILogOrderedEvent<TAbi, TEventName>,
  TAbi extends viem.Abi,
  TEventName extends string,
  TParentScopeName extends string,
>(config: IFilterLogsParams<TReturn, TAbi, TEventName, TParentScopeName>): Stream<TReturn[]> {

  return fetchTradesRecur(
    config,
    async reqParams => {
      const filter = await config.publicClient.createContractEventFilter({
        abi: reqParams.abi,
        address: reqParams.address,
        eventName: reqParams.eventName,
        fromBlock: reqParams.fromBlock,
        toBlock: min(reqParams.toBlock, reqParams.fromBlock + reqParams.rangeSize),
        strict: true
      } as viem.CreateContractEventFilterParameters<TAbi, TEventName, undefined, true>)
      const logs = await config.publicClient.getFilterLogs({ filter }) as any as TReturn[]

      return logs.map(ev => ({ ...ev, orderId: getEventOrderIdentifier(ev) }))
    }
  )
}


export const fetchTradesRecur = <
  TReturn extends ILogOrderedEvent<TAbi, TEventName>,
  TAbi extends viem.Abi,
  TEventName extends string,
  TParentScopeName extends string,
>(
  params: IFilterLogsParams<TReturn, TAbi, TEventName, TParentScopeName>,
  getList: (req: IFilterLogsParams<TReturn, TAbi, TEventName, TParentScopeName>) => Promise<TReturn[]>
): Stream<TReturn[]> => {

  const nextBatch = fromPromise(getList(params))
  const recoverByLoweringRange = recoverWith(err => {
    const reducedRange = params.rangeSize - params.rangeSize / 3n
    return fetchTradesRecur({ ...params, rangeSize: reducedRange }, getList)
  }, nextBatch)

  const filterAndStoreResponse = switchMap(res => {
    const orderFilter = orderEvents(res).filter(ev => ev.orderId > params.orderId)
    return indexDB.add(params.scope, orderFilter)
  }, recoverByLoweringRange)

  const nextBatchResponse = chain(res => {
    const nextToBlock = params.fromBlock + params.rangeSize

    if (nextToBlock >= params.toBlock) {
      return now(res)
    }

    const newPage = fetchTradesRecur({ ...params, fromBlock: nextToBlock }, getList)

    return map(nextPage => [...res, ...nextPage], newPage)
  }, filterAndStoreResponse)

  return nextBatchResponse
}

