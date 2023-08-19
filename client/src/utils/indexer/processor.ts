import { combineObject } from "@aelea/core"
import { fromPromise, map, now, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { ILogEvent, ILogOrdered, ILogOrderedEvent, getEventOrderIdentifier, max, min, switchMap } from "gmx-middleware-utils"
import * as viem from "viem"
import { zipArray } from "../../logic/utils"
import * as indexDB from "../storage/indexDB"
import * as store from "../storage/storeScope"
import { IIndexEventLogScopeParams, fetchTradesRecur } from "./rpc"


export enum IProcessEnvironmentMode {
  DEV,
  PROD,
}

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
  mode: IProcessEnvironmentMode
  seed: Stream<IProcessedStore<TSeed>>,
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
  }, config.seed)
  const state = map(s => s.state, seed)
  
  return {  ...config, processList, scope, state, seed, scopeKey  }
}


export interface IProcessorSeedConfig<TSeed, TProcessConfigList extends ILogOrdered[], TParentName extends string> extends IProcessParams<TSeed, TProcessConfigList, TParentName> {
  publicClient: viem.PublicClient<viem.Transport, viem.Chain>
  syncBlock: bigint
}


export function syncProcess<TSeed, TProcessConfigList extends ILogOrdered[], TParentName extends string>(
  config: IProcessorSeedConfig<TSeed, TProcessConfigList, TParentName>,
): Stream<IProcessedStore<TSeed>> {


  const nextLogs = map(processState => {
    const startblock = processState.startBlock
    const processNextLog = config.processList.map(processConfig => {
      const rangeKey = IDBKeyRange.bound(processState.orderId, 1e20, true)
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

              const storeLogs = (headEvent: ILogOrderedEvent | undefined, logs: ILogEvent[]): ILogOrderedEvent[] => {
                const filtered = logs
                  .map(ev => {
                    const storeObj = { ...ev, orderId: getEventOrderIdentifier(ev) } as ILogOrderedEvent
                    return storeObj
                  })
                  .filter(ev => ev.orderId < headEvent!.orderId)

                return filtered
              }

              const storeMappedLogs = config.mode === IProcessEnvironmentMode.DEV
                ? switchMap(logs => {
                  const filtered = storeLogs(fstEvent, logs)
                  return indexDB.add(processConfig.source.scope, filtered)
                }, queryLogs)
                : map(logs => storeLogs(fstEvent, logs), queryLogs)

              return storeMappedLogs
            }
          )
          : now([])

        const fromBlock = max(startblock, max(processState.endBlock, lstEvent ? lstEvent.blockNumber : 0n))


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


              const storeLogs = (headEvent: ILogOrderedEvent | undefined, logs: ILogEvent[]): ILogOrderedEvent[] => {
                const filtered = logs
                  .map(ev => {
                    const storeObj = { ...ev, orderId: getEventOrderIdentifier(ev) } as ILogOrderedEvent
                    return storeObj
                  })
                  .filter(ev => ev.orderId > Math.max(processState.orderId, headEvent ? headEvent.orderId : 0))

                return filtered
              }

              const storeMappedLogs = config.mode === IProcessEnvironmentMode.DEV
                ? switchMap(logs => {
                  const filtered = storeLogs(lstEvent, logs)
                  return indexDB.add(processConfig.source.scope, filtered)
                }, queryLogs)
                : map(logs => storeLogs(lstEvent, logs), queryLogs)

              return storeMappedLogs
            }
          )
          : now([])

        return map(log => {

          return [...log.prev, ...stored, ...log.next]
        }, combineObject({ prev, next }))
      }, nextStoredLog)
    })

    return { processNextLog, processState }
  }, config.seed)
 
  const sync = switchMap(params => {

    return switchLatest(zipArray((...nextLogEvents) => {
      const orderedNextEvents = nextLogEvents.flat().sort((a, b) => a.orderId - b.orderId)

      const nextState = orderedNextEvents.reduce((acc, next) => {
        const eventProcessor = config.processList.find(processConfig => {
          if ('eventName' in next) {
            return processConfig.source.eventName === next.eventName
          }

          throw new Error('Event is not an ILogOrderedEvent')
        })

        if (!eventProcessor) {
          throw new Error('Event processor not found')
        }


        acc.orderId = next.orderId
        acc.endBlock = next.blockNumber
        acc.state = eventProcessor.step(acc.state, next)

        return acc
      }, params.processState)

      nextState.endBlock = config.syncBlock

      console.log(config.syncBlock)

      return indexDB.set(config.scope, nextState)
    }, ...params.processNextLog))

  }, nextLogs)

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
