import { combineObject } from "@aelea/core"
import { fromPromise, map, now, switchLatest, tap } from "@most/core"
import { Stream } from "@most/types"
import { ILogEvent, ILogOrdered, ILogOrderedEvent, Optional, getEventOrderIdentifier, max, min, switchMap } from "gmx-middleware-utils"
import * as viem from "viem"
import { zipArray } from "../../logic/utils"
import * as indexDB from "../storage/indexDB"
import * as store from "../storage/storeScope"
import { IIndexEventLogScopeParams, fetchTradesRecur } from "./rpc"

export interface IProcessedStore<T> {
  state: T
  orderId: number
  startBlock: bigint
  endBlock: bigint
  chainId: number
}


export interface IProcessSourceConfig<TLog extends ILogOrdered, TState> {
  rangeSize?: bigint
  source: IIndexEventLogScopeParams<TLog, any, any>
  step: (seed: TState, value: TLog) => TState
}


export interface IProcessorConfig<TSeed, TParentName extends string> {
  seedFile: Stream<IProcessedStore<TSeed>>,
  blueprint: IProcessedStore<TSeed>,

  parentScope: store.IStoreconfig<TParentName>,
  queryBlockSegmentLimit: bigint
}




export interface IProcessParams<TState, TProcessConfigList extends ILogOrdered[], TParentName extends string> extends IProcessorConfig<TState, TParentName> {
  scopeKey: string
  scope: store.IStoreScope<`${TParentName}.${string}`, any>
  processList: { [P in keyof TProcessConfigList]: IProcessSourceConfig<TProcessConfigList[P], TState> }
  state: Stream<TState>
}

export function defineProcess<TSeed, TProcessConfigList extends ILogOrdered[], TParentName extends string >(
  config: IProcessorConfig<TSeed, TParentName>,
  ...processList: { [P in keyof TProcessConfigList]: IProcessSourceConfig<TProcessConfigList[P], TSeed>; }
): IProcessParams<TSeed, TProcessConfigList, TParentName> {

  const scopeKey = processList.reduce((acc, next) => `${acc}:${next.source.eventName}`, `processor:${config.blueprint.chainId}:${config.blueprint.startBlock}`)
  const scope = store.createStoreScope(config.parentScope, scopeKey)

  const seed = switchMap(seedEvent => {
    const storeState: IProcessedStore<TSeed> = {
      ...seedEvent,
      // orderId: Number(1000000n * config.startBlock), blockNumber: config.startBlock,
    }

    return store.get(scope, storeState)
  }, config.seedFile)
  const state = map(s => s.state, seed)
  
  return {  ...config, processList, scope, state, seedFile: seed, scopeKey  }
}


export interface IProcessorSeedConfig<TSeed, TProcessConfigList extends ILogOrdered[], TParentName extends string> extends IProcessParams<TSeed, TProcessConfigList, TParentName> {
  publicClient: viem.PublicClient<viem.Transport, viem.Chain>
  syncBlock: bigint
}


export function syncProcess<TSeed, TProcessConfigList extends ILogOrdered[], TParentName extends string>(
  config: IProcessorSeedConfig<TSeed, TProcessConfigList, TParentName>,
): Stream<IProcessedStore<TSeed>> {
 
  const sync = switchMap(params => {
    const startblock = params.processState.startBlock
    const processNextLog = config.processList.map(processConfig => {
      const rangeKey = IDBKeyRange.bound(params.processState.orderId, 1e20)
      const nextStoredLog: Stream<ILogOrderedEvent[]> = indexDB.getAll(processConfig.source.scope, rangeKey)

      return switchMap(stored => {
        const fstEvent = stored[0] as ILogOrderedEvent | undefined
        const lstEvent = stored[stored.length - 1] as ILogOrderedEvent | undefined

        const startGapBlockRange = fstEvent ? startblock - fstEvent.blockNumber : 0n
        const event = processConfig.source.abi.find((ev: any) => ev.type === 'event' && ev.name === processConfig.source.eventName)

        const prev = startGapBlockRange > 0n
          ? fetchTradesRecur(
            {
              ...processConfig.source,
              fromBlock: startblock,
              toBlock: startblock + startGapBlockRange,
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

        const fromBlock = max(startblock, max(params.processState.endBlock, lstEvent ? lstEvent.blockNumber : 0n))

        const next = fromBlock < config.syncBlock
          ? fetchTradesRecur(
            {
              ...processConfig.source,
              fromBlock: fromBlock,
              toBlock: config.syncBlock,
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
              const nextStepState = processSrc.step(processState.state, nextEvent)
              processState = { 
                state: nextStepState,
                orderId: nextEvent.orderId,
                chainId: processState.chainId,
                startBlock: processState.startBlock,
                endBlock: nextEvent.blockNumber 
              }
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

  }, combineObject({ processState: config.seedFile }))

  return sync
}




export async function getBlobHash(blob: Blob) {
  const data = await blob.arrayBuffer()
  const hash = await window.crypto.subtle.digest('SHA-256', data)

  let binary = ''
  const bytes = new Uint8Array(hash)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }

  const hashBase64 = window.btoa(binary)
  return 'sha256-' + hashBase64
}
