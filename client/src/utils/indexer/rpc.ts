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

  let retryAmount = 0
  let newRangeBlockQuery = 0n

  // const getParams = { ...params, toBlock: retryAmount === 0 ? undefined : nextfromBlock }

  const parseResp = recoverWith<TReturn[], Error & { code: number }>(err => {
    console.warn(`fetchTradesRecur error: ${err.message} ${err.code} retrying in ${retryAmount} seconds`)

    if (retryAmount > 3) throw err

    retryAmount = retryAmount + 1
    
    if (err.code === -32602) {
      newRangeBlockQuery = (params.rangeBlockQuery || 100000n) / BigInt(retryAmount)
    }

    if (err.code === -32005) {
      // @ts-ignore
      const causeArgs = err?.cause?.cause?.cause?.data
      if (causeArgs.from && causeArgs.to) {
        newRangeBlockQuery = BigInt(causeArgs.to) - BigInt(causeArgs.from)
      }
    } else {
      newRangeBlockQuery = (params.rangeBlockQuery || 100000n) / 2n
    }

    const req = getList({ ...params, toBlock: params.fromBlock + newRangeBlockQuery })

    return delayEvent(retryAmount * 2000, req)
  }, getList(params))

  return chain(res => {
    const nextfromBlock = params.rangeBlockQuery ? params.fromBlock + newRangeBlockQuery : params.toBlock

    if (nextfromBlock >= params.toBlock) return now(res)

    const rangeBlockQuery = newRangeBlockQuery
    const fromBlock = nextfromBlock + rangeBlockQuery

    const newPage = fetchTradesRecur({ ...params, rangeBlockQuery, fromBlock }, getList)

    return map(
      nextPage => [...res, ...nextPage],
      newPage
    )
  }, delayEvent(1000, parseResp))
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
