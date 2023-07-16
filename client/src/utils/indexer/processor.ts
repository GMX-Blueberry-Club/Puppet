import { awaitPromises, fromPromise, map, now } from "@most/core"
import { Stream } from "@most/types"
import { ILogEvent, ILogOrdered, ILogOrderedEvent, getEventOrderIdentifier, max, min, switchMap } from "gmx-middleware-utils"
import { zipArray } from "../../logic/utils"
import * as indexDB from "../storage/indexDB"
import * as store from "../storage/storeScope"
import { IIndexEventLogScopeParams, fetchTradesRecur } from "./rpc"
import { combineObject } from "@aelea/core"
import { publicClient } from "../../wallet/walletLink"


export interface IProcessSync<T> {
  data: T
  blockNumber: bigint
  orderId: number
  event: ILogOrdered | null
}


export interface IProcessSourceConfig<TLog extends ILogOrdered, TState> {
  rangeSize?: bigint
  source: IIndexEventLogScopeParams<TLog, any, any>
  step: (seed: TState, value: TLog) => TState
}


export interface IProcessorConfig<TState, TParentScopeName extends string> {
  parentStoreScope: store.IStoreconfig<TParentScopeName>
  initialSeed: TState
  startBlock: bigint
  queryBlockSegmentLimit: bigint
}

export function processSources<TState, TProcessConfigList extends readonly ILogOrdered[], TParentScopeName extends string>(
  config: IProcessorConfig<TState, TParentScopeName>,
  ...processList: { [P in keyof TProcessConfigList]: IProcessSourceConfig<TProcessConfigList[P], TState>; }
): Stream<TState> {

  const scopeKey = processList.reduce((acc, next) => `${acc}:${next.source.eventName}`, `processor:${config.startBlock}`)
  const scope = store.createStoreScope(config.parentStoreScope, scopeKey)
  const seed = { data: config.initialSeed, event: null, orderId: Number(1000000n * config.startBlock), blockNumber: config.startBlock } as IProcessSync<TState>
  const processedData = store.get(scope, scopeKey, seed)
  const latestBlock = awaitPromises(map(pc => pc.getBlockNumber(), publicClient)) 

 
  const processWriteSources = switchMap(params => {

    const processNextLog = processList.map(processConfig => {
      const nextRangeKey = IDBKeyRange.bound(params.processedData.orderId + 1, 1e20)
      const nextStoredLog: Stream<ILogOrderedEvent[]> = indexDB.getAll(processConfig.source.scope, nextRangeKey)

      return switchMap(stored => {
        if (params.latestBlock === null) {
          throw new Error('cannot discover new events without knowing most recent block')
        }

        const fstEvent = stored[0] as ILogOrderedEvent | undefined
        const lstEvent = stored[stored.length - 1] as ILogOrderedEvent | undefined

        const startGapBlockRange = fstEvent ? params.processedData.blockNumber - fstEvent.blockNumber : 0n
        const event = processConfig.source.abi.find(ev => ev.type === 'event' && ev.name === processConfig.source.eventName)

        const prev = startGapBlockRange > 0n
          ? fetchTradesRecur(
            {
              ...processConfig.source,
              fromBlock: config.startBlock,
              toBlock: config.startBlock + startGapBlockRange,
              publicClient: params.publicClient,
              rangeSize: processConfig.rangeSize || config.queryBlockSegmentLimit,
            },
            reqParams => {
              const queryLogs = fromPromise(
                params.publicClient.getLogs({
                  event,
                  address: reqParams.address,
                  fromBlock: reqParams.fromBlock,
                  strict: true,
                  toBlock: min(reqParams.toBlock, reqParams.fromBlock + reqParams.rangeSize),
                })
              ) as Stream<ILogEvent[]>

              // const queryLogs = fromPromise(
              //   params.publicClient.createContractEventFilter({
              //     abi: reqParams.abi,
              //     address: reqParams.address,
              //     eventName: reqParams.eventName,
              //     fromBlock: reqParams.fromBlock,
              //     toBlock: min(reqParams.toBlock, reqParams.fromBlock + reqParams.rangeSize),
              //     strict: true
              //   }).then(filter => params.publicClient.getFilterLogs({ filter }))
              // ) as Stream<ILogEvent[]>

              const storeMappedLogs = switchMap(logs => {
                const filtered =  logs
                  .map(ev => {
                    const storeObj = { args: ev.args, blockNumber: ev.blockNumber, orderId: getEventOrderIdentifier(ev), transactionHash: ev.transactionHash } as ILogOrderedEvent
                    return storeObj
                  })
                  .filter(ev => ev.orderId < fstEvent!.orderId)

                return indexDB.add(processConfig.source.scope, filtered)
              }, queryLogs)

              return storeMappedLogs
            }
          )
          : now([])

        const fromBlock = max(params.processedData.blockNumber, lstEvent ? lstEvent.blockNumber : 0n)
        const lastKnownStoredEvent = Math.max(params.processedData.orderId, lstEvent?.orderId || 0)

        const next = fromBlock < params.latestBlock
          ? fetchTradesRecur(
            {
              ...processConfig.source,
              fromBlock: fromBlock,
              toBlock: params.latestBlock,
              publicClient: params.publicClient,
              rangeSize: processConfig.rangeSize || config.queryBlockSegmentLimit,
            },
            reqParams => {
              const queryLogs = fromPromise(
                params.publicClient.getLogs({
                  event,
                  address: reqParams.address,
                  fromBlock: reqParams.fromBlock,
                  strict: true,
                  toBlock: min(reqParams.toBlock, reqParams.fromBlock + reqParams.rangeSize),
                })
              ) as Stream<ILogEvent[]>
              // const queryLogs = fromPromise(
              //   params.publicClient.createContractEventFilter({
              //     abi: reqParams.abi,
              //     address: reqParams.address,
              //     eventName: reqParams.eventName,
              //     fromBlock: reqParams.fromBlock,
              //     toBlock: min(reqParams.toBlock, reqParams.fromBlock + reqParams.rangeSize),
              //     strict: true
              //   }).then(filter => params.publicClient.getFilterLogs({ filter }))
              // ) as Stream<ILogEvent[]>

              const storeMappedLogs = switchMap(logs => {
                const filtered = logs
                  .map(ev => {
                    const storeObj = { 
                      args: ev.args, blockNumber: ev.blockNumber, orderId: getEventOrderIdentifier(ev), transactionHash: ev.transactionHash,
                      address: ev.address, eventName: ev.eventName, blockHash: ev.blockHash, logIndex: ev.logIndex,
                      removed: ev.removed, transactionIndex: ev.transactionIndex, topics: ev.topics
                    } as ILogOrderedEvent
                    return storeObj
                  })
                  .filter(ev => ev.orderId > lastKnownStoredEvent)

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

      let nextSeed = params.processedData
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
