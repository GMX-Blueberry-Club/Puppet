import { awaitPromises, map, now } from "@most/core"
import { Stream } from "@most/types"
import { ILogOrdered, ILogOrderedEvent, max, min, switchMap } from "gmx-middleware-utils"
import { zipArray } from "../../logic/utils"
import * as indexDB from "../storage/indexDB"
import * as store from "../storage/storeScope"
import { IIndexEventLogScopeParams, queryEventLog } from "./rpc"
import { combineObject } from "@aelea/core"
import { publicClient } from "../../wallet/walletLink"


// export interface IProcessParams<TData, TProcessConfigList extends readonly ILogOrdered[], TParentScopeName extends string> {
//   data: Stream<TData>
//   process: Stream<IProcessSync<TData>>
//   config: IProcessConfig<TData, TParentScopeName>
//   processList: { [P in keyof TProcessConfigList]: IProcessSourceConfig<TProcessConfigList[P], TData>; }
// }

export interface IProcessSync<T> {
  data: T
  blockNumber: bigint
  orderId: number
  event: ILogOrdered | null
}


export interface IProcessSourceConfig<TLog extends ILogOrdered, TData> {
  rangeSize?: bigint
  source: IIndexEventLogScopeParams<TLog, any, any>
  step: (seed: TData, value: TLog) => TData
}


export interface IProcessConfig<TData, TParentScopeName extends string> {
  parentStoreScope: store.IStoreconfig<TParentScopeName>
  initialSeed: TData
  startBlock: bigint
}

export function processSources<TData, TProcessConfigList extends readonly ILogOrdered[], TParentScopeName extends string>(
  config: IProcessConfig<TData, TParentScopeName>,
  ...processList: { [P in keyof TProcessConfigList]: IProcessSourceConfig<TProcessConfigList[P], TData>; }
): Stream<TData> {
// ): IProcessParams<TData, TProcessConfigList, TParentScopeName> {
  

  const scopeKey = processList.reduce((acc, next) => `${acc}:${next.source.eventName}:${config.startBlock}`, 'processor')
  const scope = store.createStoreScope(config.parentStoreScope, scopeKey)
  const seed = { data: config.initialSeed, event: null, orderId: Number(1000000n * config.startBlock), blockNumber: config.startBlock } as IProcessSync<TData>
  const storedData = store.get(scope, scopeKey, seed)
  const latestBlock = awaitPromises(map(pc => pc.getBlock({ blockTag: 'latest' }), publicClient))


 
  const processWriteSources = switchMap(params => { 

    const processNextLog = processList.map(processConfig => {
      const nextRangeKey = IDBKeyRange.bound(params.storedData.orderId, 1000000000000000000)
      const storedLog: Stream<ILogOrderedEvent[]> = indexDB.getAll(processConfig.source.scope, nextRangeKey)

      return switchMap(stored => {
        if (params.latestBlock.number === null) {
          throw new Error('cannot discover latest block')
        }

        const processedFromBlock = params.storedData.blockNumber

        const prevRange = [min(processedFromBlock, stored[0]?.blockNumber || processedFromBlock), processedFromBlock]
        const nextRange = [max(processedFromBlock, stored[stored.length - 1]?.blockNumber || processedFromBlock), params.latestBlock.number]

        const prev = prevRange[0] < prevRange[1]
          ? queryEventLog({
            ...processConfig.source,
            fromBlock: prevRange[0],
            toBlock: prevRange[1],
            publicClient: params.publicClient,
            rangeSize: processConfig.rangeSize || 151204n,
            orderId: stored[0]!.orderId
          })
          : now([])

        const next = nextRange[0] < nextRange[1]
          ? queryEventLog({
            ...processConfig.source,
            fromBlock: nextRange[0],
            toBlock: nextRange[1]!,
            publicClient: params.publicClient,
            rangeSize: processConfig.rangeSize || 151204n,
            orderId: stored[stored.length - 1]!.orderId
          })
          : now([])

        return map(log => [...log.prev, ...stored, ...log.next], combineObject({ prev, next }))
      }, storedLog)
    })

    const stepState = zipArray((...nextLogEvents) => {
      const orderedNextEvents = nextLogEvents.flat().sort((a, b) => a.orderId - b.orderId)
      const fstEvent = orderedNextEvents[0]
      let nextSeed = fstEvent.blockNumber < params.storedData.blockNumber // if we have a gap in the log, start from the beginning
        ? params.storedData
        : { data: config.initialSeed, event: fstEvent, orderId: fstEvent.orderId, blockNumber: fstEvent.blockNumber }
      let hasThrown = false

      for (let evIdx = 0; evIdx < orderedNextEvents.length; evIdx++) {
        const nextEvent = orderedNextEvents[evIdx]
        if (hasThrown) break

        for (let processIdx = 0; processIdx < processList.length; processIdx++) {
          const processState = nextLogEvents[processIdx]
          const processSrc = processList[processIdx]

          if (processState.includes(nextEvent)) {
            try {
              const nextStepState = processSrc.step(nextSeed.data, nextEvent)
              nextSeed = { data: nextStepState, event: nextEvent, orderId: nextEvent.orderId, blockNumber: nextEvent.blockNumber }
            } catch (err){
              console.error('Error processing event ', nextEvent, err)
              hasThrown = true
              break
            }
          }
        }
      }

      return nextSeed
    }, ...processNextLog)

    return stepState
  }, combineObject({ storedData, publicClient, latestBlock }))

  // return store.replayWrite(scope, currentStoreKey, processWriteSources)

  const process = indexDB.set(scope, scopeKey, processWriteSources)
  const data = map(x => x.data, process)
  return data

  // return { config, data, process, processList }
}
