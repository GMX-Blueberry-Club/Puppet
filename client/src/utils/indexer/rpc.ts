import { chain, constant, delay, join, map, now, recoverWith } from "@most/core"
import { Stream } from "@most/types"
import { ILogOrdered, ILogOrderedEvent } from "gmx-middleware-utils"
import * as viem from "viem"
import * as store from "../storage/storeScope.js"


export type IIndexRpcEventLogConfig<
  _TLog extends ILogOrdered, // used to infer log type
  TAbi extends viem.Abi,
  TEventName extends string,
  TParentScopeName extends string = string,
> = {
  address: viem.Address
  eventName: viem.InferEventName<TAbi, TEventName>
  args?: any
  abi: TAbi,
  parentScope: store.IStoreconfig<TParentScopeName>
  startBlock?: bigint
}

export type IIndexEventLogScopeParams<
  TLog extends ILogOrdered,
  TAbi extends viem.Abi,
  TEventName extends string,
  TParentScopeName extends string = string,
> = IIndexRpcEventLogConfig<TLog, TAbi, TEventName, TParentScopeName> & {
  scope: store.IStoreScope<`${TParentScopeName}.${viem.InferEventName<TAbi, TEventName>}:${bigint}:0x${string}${string}`, { readonly keyPath: "orderId" }>
}

export function createRpcLogEventScope<
  TLog extends ILogOrderedEvent<TAbi, TEventName>,
  TAbi extends viem.Abi,
  TEventName extends string,
  TParentScopeName extends string = string,
>(config: IIndexRpcEventLogConfig<TLog, TAbi, TEventName, TParentScopeName>): IIndexEventLogScopeParams<TLog, TAbi, TEventName, TParentScopeName> {

  const shortArgsHash = config.args ? Object.entries(config.args).reduce((acc, [key, val]) => `${acc}:${getShortHash(key, val)}`, '') : ''
  const scopeName = `${config.eventName}:${config.startBlock || 0n}:${config.address}${shortArgsHash}` as const
  const scope = store.createStoreScope(config.parentScope, scopeName, { keyPath: 'orderId' } as const)
  
  return { ...config, scope }
}


export type IFilterLogsParams<
  TLog extends ILogOrderedEvent<TAbi, TEventName>,
  TAbi extends viem.Abi,
  TEventName extends string,
  TParentScopeName extends string = string,
> = IIndexEventLogScopeParams<TLog, TAbi, TEventName, TParentScopeName> & {
  rangeBlockQuery?: bigint,
  fromBlock: bigint
  toBlock: bigint
  publicClient: viem.PublicClient
  // iteration: number
}

export const fetchTradesRecur = <
  TReturn extends ILogOrderedEvent<TAbi, TEventName>,
  TAbi extends viem.Abi,
  TEventName extends string,
  TParentScopeName extends string,
>(
  params: IFilterLogsParams<TReturn, TAbi, TEventName, TParentScopeName>,
  getList: (req: viem.GetLogsParameters) => Stream<TReturn[]>
): Stream<TReturn[]> => {

  let retryAmount = 1
  let nextRangeBlockQuery = params.rangeBlockQuery || 0n


  const tryGetLog = recoverWith<TReturn[], Error & { code: number }>((err): Stream<TReturn[]> => {
    console.warn(`fetchTradesRecur error: ${err.message} ${err.code} retrying in ${retryAmount} seconds`)

    if (retryAmount > 3) throw err

    retryAmount = retryAmount + 1

    // @ts-ignore
    const causeArgs = err?.cause?.cause?.cause?.data
    if (err.code === -32005 && causeArgs) {
      if (causeArgs.from && causeArgs.to) {
        nextRangeBlockQuery = BigInt(causeArgs.to) - BigInt(causeArgs.from)
      }
    } else {
      nextRangeBlockQuery = (params.rangeBlockQuery || 200000n) / BigInt(retryAmount)
    }

    const nextToBlock = params.fromBlock + nextRangeBlockQuery
    const req = tryGetLog(getList({ ...params, toBlock: nextToBlock }))

    return delayEvent(retryAmount * 2000, req)
  })

  const nextToBlock = params.rangeBlockQuery ? params.fromBlock + params.rangeBlockQuery : undefined

  const nextLog = tryGetLog(getList({ ...params, toBlock: nextToBlock }))

  return chain(res => {
    console.log('fetchTradesRecur', params.fromBlock, nextToBlock, params.rangeBlockQuery)
    const nextfromBlock = params.fromBlock + nextRangeBlockQuery

    if (!params.rangeBlockQuery && !nextRangeBlockQuery || nextfromBlock >= params.toBlock) {
      return now(res)
    }

    const newPage = fetchTradesRecur({ 
      ...params,
      rangeBlockQuery: nextRangeBlockQuery,
      fromBlock: nextfromBlock,
    }, getList)

    return map(
      nextPage => [...res, ...nextPage],
      newPage
    )
  }, nextLog)
}


function getShortHash(name: string, obj: any) {
  const str = JSON.stringify(obj)
  let hash = 0

  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0 // Convert to 32bit integer
  }
    
  return `${name}-${hash.toString(16)}`
}


function delayEvent <T>(time: number, src: Stream<T>) {
  const delayTime = delay(time, now(null))

  return join(constant(src, delayTime))
}
