import { chain, delay, map, now, recoverWith } from "@most/core"
import { Stream } from "@most/types"
import { ILogOrdered, ILogOrderedEvent } from "gmx-middleware-utils"
import * as viem from "viem"
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
  rangeSize: bigint,
  fromBlock: bigint
  toBlock: bigint
  publicClient: viem.PublicClient
}

export const fetchTradesRecur = <
  TReturn extends ILogOrderedEvent<TAbi, TEventName>,
  TAbi extends viem.Abi,
  TEventName extends string,
  TParentScopeName extends string,
>(
  params: IFilterLogsParams<TReturn, TAbi, TEventName, TParentScopeName>,
  getList: (req: IFilterLogsParams<TReturn, TAbi, TEventName, TParentScopeName>) => Stream<TReturn[]>
): Stream<TReturn[]> => {

  let retryAmount = 0
  let delayTime = 0

  const nextBatchResponse = chain(res => {
    const nextToBlock = params.fromBlock + params.rangeSize

    if (nextToBlock >= params.toBlock) {
      return now(res)
    }

    const newPage = fetchTradesRecur({ ...params, fromBlock: nextToBlock }, getList)

    return map(nextPage => [...res, ...nextPage], newPage)
  }, getList(params))



  return recoverWith<TReturn[], Error & { code: number }, TReturn[]>((err): Stream<TReturn[]> => {
    if (err.code === 429) {
      delayTime += 1000

      const delayEvent = delay(delayTime, now(null))
      return chain(() => fetchTradesRecur({ ...params }, getList), delayEvent)
    }

    if (err.code !== -32602 || retryAmount > 3) {
      throw new Error(`Failed to fetch trades after 3 retries`)
    }

    retryAmount++
    const reducedRange = params.rangeSize - params.rangeSize / 3n

    return fetchTradesRecur({ ...params, rangeSize: reducedRange }, getList)
  }, nextBatchResponse)
}
