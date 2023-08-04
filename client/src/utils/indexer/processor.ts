import { combineObject } from "@aelea/core"
import { fromPromise, map, now, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { ILogEvent, ILogOrdered, ILogOrderedEvent, getEventOrderIdentifier, max, min, switchMap } from "gmx-middleware-utils"
import * as viem from "viem"
import { zipArray } from "../../logic/utils"
import * as indexDB from "../storage/indexDB"
import * as store from "../storage/storeScope"
import { IIndexEventLogScopeParams, fetchTradesRecur } from "./rpc"


export interface IProcessedStore<T> {
  seed: T
  blockNumber: bigint
  orderId: number
  chainId: number
}


export interface IProcessSourceConfig<TLog extends ILogOrdered, TState> {
  rangeSize?: bigint
  source: IIndexEventLogScopeParams<TLog, any, any>
  step: (seed: TState, value: TLog) => TState
}


export interface IProcessorConfig<TSeed, TParentName extends string> {
  parentScope: store.IStoreconfig<TParentName>,
  startBlock: bigint,
  genesisSeed: TSeed,
  chainId: number,
  queryBlockSegmentLimit: bigint
}




export interface IProcessParams<TSeed, TProcessConfigList extends ILogOrdered[], TParentName extends string> extends IProcessorConfig<TSeed, TParentName> {
  scope: store.IStoreScope<`${TParentName}.${string}`, any>
  processList: { [P in keyof TProcessConfigList]: IProcessSourceConfig<TProcessConfigList[P], TSeed> }
  state: Stream<IProcessedStore<TSeed>>
  seed: Stream<TSeed>
}

export function defineProcess<TSeed, TProcessConfigList extends ILogOrdered[], TParentName extends string >(
  config: IProcessorConfig<TSeed, TParentName>,
  ...processList: { [P in keyof TProcessConfigList]: IProcessSourceConfig<TProcessConfigList[P], TSeed>; }
): IProcessParams<TSeed, TProcessConfigList, TParentName> {

  const scopeKey = processList.reduce((acc, next) => `${acc}:${next.source.eventName}`, `processor:${config.startBlock}`)
  const scope = store.createStoreScope(config.parentScope, scopeKey)

  const storeState: IProcessedStore<TSeed> = {
    seed: config.genesisSeed,
    chainId: config.chainId,
    orderId: Number(1000000n * config.startBlock),
    blockNumber: config.startBlock,
  }

  const state = store.get(scope, storeState)
  const seed = map(s => s.seed, state)
  
  return {  ...config, processList, scope, state, seed  }
}


export interface IProcessorSeedConfig<TSeed, TProcessConfigList extends ILogOrdered[], TParentName extends string> extends IProcessParams<TSeed, TProcessConfigList, TParentName> {
  publicClient: viem.PublicClient<viem.Transport, viem.Chain>
  endBlock: bigint
}


export function syncProcess<TSeed, TProcessConfigList extends ILogOrdered[], TParentName extends string>(
  config: IProcessorSeedConfig<TSeed, TProcessConfigList, TParentName>,
): Stream<IProcessedStore<TSeed>> {
 
  const sync = switchMap(params => {
    const processNextLog = config.processList.map(processConfig => {
      const rangeKey = IDBKeyRange.bound(params.processState.orderId, 1e20)
      const nextStoredLog: Stream<ILogOrderedEvent[]> = indexDB.getAll(processConfig.source.scope, rangeKey)

      return switchMap(stored => {
        const fstEvent = stored[0] as ILogOrderedEvent | undefined
        const lstEvent = stored[stored.length - 1] as ILogOrderedEvent | undefined

        const startGapBlockRange = fstEvent ? config.startBlock - fstEvent.blockNumber : 0n
        const event = processConfig.source.abi.find((ev: any) => ev.type === 'event' && ev.name === processConfig.source.eventName)

        const prev = startGapBlockRange > 0n
          ? fetchTradesRecur(
            {
              ...processConfig.source,
              fromBlock: config.startBlock,
              toBlock: config.startBlock + startGapBlockRange,
              publicClient: config.publicClient,
              rangeSize: processConfig.rangeSize || config.queryBlockSegmentLimit,
            },
            reqParams => {
              const queryLogs = fromPromise(
                config.publicClient.getLogs({
                  event,
                  address: reqParams.address,
                  fromBlock: reqParams.fromBlock,
                  strict: true,
                  toBlock: min(reqParams.toBlock, reqParams.fromBlock + reqParams.rangeSize),
                })
              ) as Stream<ILogEvent[]>


              const storeMappedLogs = switchMap(logs => {
                const filtered =  logs
                  .map(ev => {
                    const storeObj = { ...ev, orderId: getEventOrderIdentifier(ev) } as ILogOrderedEvent
                    return storeObj
                  })
                  .filter(ev => ev.orderId < fstEvent!.orderId)

                return indexDB.add(processConfig.source.scope, filtered)
              }, queryLogs)

              return storeMappedLogs
            }
          )
          : now([])

        const fromBlock = max(config.startBlock, max(params.processState.blockNumber, lstEvent ? lstEvent.blockNumber : 0n))

        const next = fromBlock < config.endBlock
          ? fetchTradesRecur(
            {
              ...processConfig.source,
              fromBlock: fromBlock,
              toBlock: config.endBlock,
              publicClient: config.publicClient,
              rangeSize: processConfig.rangeSize || config.queryBlockSegmentLimit,
            },
            reqParams => {
              const queryLogs = fromPromise(
                config.publicClient.getLogs({
                  event,
                  address: reqParams.address,
                  fromBlock: reqParams.fromBlock,
                  strict: true,
                  toBlock: min(reqParams.toBlock, reqParams.fromBlock + reqParams.rangeSize),
                })
              ) as Stream<ILogEvent[]>

              const storeMappedLogs = switchMap(logs => {
                const filtered = logs
                  .map(ev => {
                    const storeObj = {  ...ev, orderId: getEventOrderIdentifier(ev) } as ILogOrderedEvent
                    return storeObj
                  })
                  .filter(ev => ev.orderId > (lstEvent ? lstEvent.orderId : params.processState.orderId))

                return indexDB.add(processConfig.source.scope, filtered)
              }, queryLogs)

              return storeMappedLogs
            }
          )
          : now([])

        return map(log => [...log.prev, ...stored, ...log.next], combineObject({ prev, next }))
      }, nextStoredLog)
    })

    return switchLatest(zipArray((...nextLogEvents) => {
      const orderedNextEvents = nextLogEvents.flat().sort((a, b) => a.orderId - b.orderId)

      let processState = params.processState

      let hasThrown = false

      for (let evIdx = 0; evIdx < orderedNextEvents.length; evIdx++) {
        const nextEvent = orderedNextEvents[evIdx]
        if (hasThrown) break

        for (let processIdx = 0; processIdx < config.processList.length; processIdx++) {
          const processEventLogList = nextLogEvents[processIdx]
          const processSrc = config.processList[processIdx]

          if (processEventLogList.includes(nextEvent)) {
            try {
              const nextStepState = processSrc.step(processState.seed, nextEvent)
              processState = { seed: nextStepState, chainId: config.publicClient.chain.id, orderId: nextEvent.orderId, blockNumber: config.endBlock }
            } catch (err){
              console.error('Error processing event ', nextEvent, err)
              hasThrown = true
              break
            }
          }
        }
      }

      return indexDB.set(config.scope, processState)
    }, ...processNextLog))

  }, combineObject({ processState: config.state }))

  return sync
}
