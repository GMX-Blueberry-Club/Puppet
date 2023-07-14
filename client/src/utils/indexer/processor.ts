import { awaitPromises, fromPromise, map, now } from "@most/core"
import { Stream } from "@most/types"
import { ILogEvent, ILogOrdered, ILogOrderedEvent, getEventOrderIdentifier, max, min, switchMap } from "gmx-middleware-utils"
import { zipArray } from "../../logic/utils"
import * as indexDB from "../storage/indexDB"
import * as store from "../storage/storeScope"
import { IIndexEventLogScopeParams, fetchTradesRecur } from "./rpc"
import { combineObject } from "@aelea/core"
import { publicClient } from "../../wallet/walletLink"
import * as viem from "viem"



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


export interface IProcessorConfig<TData, TParentScopeName extends string> {
  parentStoreScope: store.IStoreconfig<TParentScopeName>
  initialSeed: TData
  startBlock: bigint
  queryBlockSegmentLimit: bigint
}

export function processSources<TData, TProcessConfigList extends readonly ILogOrdered[], TParentScopeName extends string>(
  config: IProcessorConfig<TData, TParentScopeName>,
  ...processList: { [P in keyof TProcessConfigList]: IProcessSourceConfig<TProcessConfigList[P], TData>; }
): Stream<TData> {

  const scopeKey = processList.reduce((acc, next) => `${acc}:${next.source.eventName}`, `processor:${config.startBlock}`)
  const scope = store.createStoreScope(config.parentStoreScope, scopeKey)
  const seed = { data: config.initialSeed, event: null, orderId: Number(1000000n * config.startBlock), blockNumber: config.startBlock } as IProcessSync<TData>
  const processedData = store.get(scope, scopeKey, seed)
  const latestBlock = awaitPromises(map(pc => pc.getBlockNumber({ maxAge: 0 }), publicClient)) 

 
  const processWriteSources = switchMap(params => {
    const processNextLog = processList.map(processConfig => {
      const nextRangeKey = IDBKeyRange.bound(params.processedData.orderId + 1, 1e20, true)
      const nextStoredLog: Stream<ILogOrderedEvent[]> = indexDB.getAll(processConfig.source.scope, nextRangeKey)

      return switchMap(stored => {
        if (params.latestBlock === null) {
          throw new Error('cannot discover latest block')
        }

        const processedFromBlock = params.processedData.blockNumber

        const fstEvent: ILogOrderedEvent | undefined = stored[0]
        const lstEvent: ILogOrderedEvent | undefined = stored[stored.length - 1]

        const startGapBlockRange = [config.startBlock, fstEvent.blockNumber]
        const nextBlockRange = [max(processedFromBlock, lstEvent?.blockNumber || 0n), params.latestBlock]

        const prev = startGapBlockRange[0] < startGapBlockRange[1]
          ? fetchTradesRecur(
            {
              ...processConfig.source,
              fromBlock: startGapBlockRange[0],
              toBlock: startGapBlockRange[1],
              publicClient: params.publicClient,
              rangeSize: processConfig.rangeSize || config.queryBlockSegmentLimit,
            },
            reqParams => {
              const queryLogs = fromPromise(
                params.publicClient.createContractEventFilter({
                  abi: reqParams.abi,
                  address: reqParams.address,
                  eventName: reqParams.eventName,
                  fromBlock: reqParams.fromBlock,
                  toBlock: min(reqParams.toBlock, reqParams.fromBlock + reqParams.rangeSize),
                  strict: true
                }).then(filter => params.publicClient.getFilterLogs({ filter }))
              ) as Stream<ILogEvent[]>

              const storeMappedLogs = switchMap(logs => {
                const filtered =  logs
                  .map(ev => {
                    const storeObj = { args: ev.args, blockNumber: ev.blockNumber, orderId: getEventOrderIdentifier(ev), transactionHash: ev.transactionHash } as ILogOrderedEvent
                    return storeObj
                  })
                  .filter(ev => ev.orderId < fstEvent.orderId)

                return indexDB.add(processConfig.source.scope, filtered)
              }, queryLogs)

              return storeMappedLogs
            }
          )
          : now([])

        const next = nextBlockRange[0] < nextBlockRange[1]
          ? fetchTradesRecur(
            {
              ...processConfig.source,
              fromBlock: nextBlockRange[0],
              toBlock: nextBlockRange[1]!,
              publicClient: params.publicClient,
              rangeSize: processConfig.rangeSize || config.queryBlockSegmentLimit,
            },
            reqParams => {
              const queryLogs = fromPromise(
                params.publicClient.createContractEventFilter({
                  abi: reqParams.abi,
                  address: reqParams.address,
                  eventName: reqParams.eventName,
                  fromBlock: reqParams.fromBlock,
                  toBlock: min(reqParams.toBlock, reqParams.fromBlock + reqParams.rangeSize),
                  strict: true
                }).then(filter => params.publicClient.getFilterLogs({ filter }))
              ) as Stream<ILogEvent[]>

              const storeMappedLogs = switchMap(logs => {
                const filtered =  logs
                  .map(ev => {
                    const storeObj = { args: ev.args, blockNumber: ev.blockNumber, orderId: getEventOrderIdentifier(ev), transactionHash: ev.transactionHash } as ILogOrderedEvent
                    return storeObj
                  })
                  .filter(ev => ev.orderId > lstEvent.orderId)

                return indexDB.add(processConfig.source.scope, filtered)
              }, queryLogs)

              return storeMappedLogs
            }
          )
          : now([])

        return map(log => [...log.prev, ...stored, ...log.next], combineObject({ prev, next }))
      }, nextStoredLog)
    })

    const stepState = zipArray((...nextLogEvents) => {
      const orderedNextEvents = nextLogEvents.flat().sort((a, b) => a.orderId - b.orderId)
      const fstEvent = orderedNextEvents[0]
      let nextSeed = !fstEvent || fstEvent.blockNumber < params.processedData.blockNumber // if we have a gap in the log, start from the beginning
        ? params.processedData
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
  }, combineObject({ processedData, publicClient, latestBlock }))

  const process = indexDB.set(scope, scopeKey, processWriteSources)
  const data = map(x => x.data, process)
  return data
}
