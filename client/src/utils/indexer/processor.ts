import { combineObject } from "@aelea/core"
import { fromPromise, map, now, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { ILogEvent, ILogOrdered, ILogOrderedEvent, getEventOrderIdentifier, getblockOrderIdentifier, importGlobal, max, min, switchMap } from "gmx-middleware-utils"
import * as viem from "viem"
import { zipArray } from "../../logic/utils.js"
import * as indexDB from "../storage/indexDB.js"
import * as store from "../storage/storeScope.js"
import { IIndexEventLogScopeParams, fetchTradesRecur } from "./rpc.js"
import { transformBigints } from "../storage/storeScope.js"
import { IGmxProcessState } from "../../data/process/process"


export enum IProcessEnvironmentMode {
  DEV,
  PROD,
}

export interface IProcessedStoreConfig {
  startBlock: bigint
  endBlock: bigint
  chainId: number
}

export interface IProcessedStore<T> {
  state: T
  config: IProcessedStoreConfig
  orderId: number
  blockNumber: bigint
  sourceUrl: string
}


export interface IProcessSourceConfig<TLog extends ILogOrdered, TState> {
  queryBlockRange?: bigint
  source: IIndexEventLogScopeParams<TLog, any, any>
  step: (seed: TState, value: TLog) => TState
}


export interface IProcessorConfig<TState, TParentName extends string> {
  // seed: Stream<IProcessedStore<TState>>,
  parentScope: store.IStoreconfig<TParentName>,
  mode: IProcessEnvironmentMode
  blueprint: Omit<IProcessedStore<TState>, 'orderId' | 'blockNumber'>,
}



export interface IProcessParams<TState, TProcessConfigList extends ILogOrdered[], TParentName extends string> extends IProcessorConfig<TState, TParentName> {
  scopeKey: string
  scope: store.IStoreScope<`${TParentName}.${string}`, any>
  processList: { [P in keyof TProcessConfigList]: IProcessSourceConfig<TProcessConfigList[P], TState> }
  state: Stream<TState>
  seed: Stream<IProcessedStore<TState>>,
  seedFile: Stream<IProcessedStore<TState>>
}

export function defineProcess<TSeed, TProcessConfigList extends ILogOrdered[], TParentName extends string >(
  config: IProcessorConfig<TSeed, TParentName>,
  ...processList: { [P in keyof TProcessConfigList]: IProcessSourceConfig<TProcessConfigList[P], TSeed>; }
): IProcessParams<TSeed, TProcessConfigList, TParentName> {

  const scope = store.createStoreScope(config.parentScope, 'processor')
  const scopeKey = getProcessorKey(processList, config.blueprint.config)
  const storedIdbSeed: Stream<IProcessedStore<TSeed>> = indexDB.get(scope, scopeKey)

  const seedFile: Stream<IProcessedStore<TSeed>> = importGlobal(async () => {
    const req = await (await fetch(config.blueprint.sourceUrl)).json()
    const storedSeed: IProcessedStore<TSeed> = transformBigints(req)

    const seedFileValidationError = validateSeed(storedSeed.config, storedSeed.config)

    if (seedFileValidationError) {
      throw new Error(`Seed file validation error: ${seedFileValidationError}`)
    }

    return storedSeed
  })

  const seed = switchMap(idbSeed => {
    if (idbSeed?.sourceUrl === config.blueprint.sourceUrl) {
      return now(idbSeed)
    }

    return map(sf => {
      const blockNumber = sf.blockNumber || config.blueprint.config.startBlock
      const orderId = sf.orderId || getblockOrderIdentifier(config.blueprint.config.startBlock)
      return { ...sf, blockNumber, orderId }
    }, seedFile)
  }, storedIdbSeed)

  const state = map(s => s.state, seed)
  
  return { ...config, processList, scope, state, seed, scopeKey, seedFile  }
}


export interface IProcessorSeedConfig<TSeed, TProcessConfigList extends ILogOrdered[], TParentName extends string> extends IProcessParams<TSeed, TProcessConfigList, TParentName> {
  publicClient: viem.PublicClient<viem.Transport, viem.Chain>
  syncBlock: bigint
}


export function syncProcess<TSeed, TProcessConfigList extends ILogOrdered[], TParentName extends string>(
  config: IProcessorSeedConfig<TSeed, TProcessConfigList, TParentName>,
): Stream<IProcessedStore<TSeed>> {

  const scopeKey = getProcessorKey(config.processList, config.blueprint.config)

  const nextLogs = map(processState => {
    const processNextLog = config.processList.map(processConfig => {
      const rangeKey = IDBKeyRange.bound(processState.orderId, getblockOrderIdentifier(config.syncBlock + 1n), true)
      const nextStoredLog: Stream<ILogOrderedEvent[]> = indexDB.getAll(processConfig.source.scope, rangeKey)

      return switchMap(stored => {
        const sourceStartBlock = processConfig.source.startBlock
        const startblock = sourceStartBlock && sourceStartBlock > processState.config.startBlock ? sourceStartBlock : processState.config.startBlock

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
              rangeBlockQuery: processConfig.queryBlockRange,
            },
            reqParams => {
              const queryLogs = fromPromise(
                config.publicClient.getLogs({
                  event,
                  args: reqParams.args,
                  address: reqParams.address,
                  fromBlock: reqParams.fromBlock,
                  toBlock: reqParams.toBlock,
                  strict: true,
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

        const fromBlock = max(startblock, max(processState.blockNumber, lstEvent ? lstEvent.blockNumber : 0n))


        const next = fromBlock < config.syncBlock
          ? fetchTradesRecur(
            {
              ...processConfig.source,
              fromBlock: fromBlock,
              toBlock: config.syncBlock,
              publicClient: config.publicClient,
              rangeBlockQuery: processConfig.queryBlockRange,
            },
            reqParams => {
              const queryLogs = fromPromise(
                config.publicClient.getLogs({
                  event,
                  args: reqParams.args,
                  address: reqParams.address,
                  fromBlock: reqParams.fromBlock,
                  strict: true,
                  toBlock: reqParams.toBlock,
                  // toBlock: min(reqParams.toBlock, reqParams.fromBlock + reqParams.rangeBlockQuery),
                })
              ) as Stream<ILogEvent[]>


              const storeLogs = (headEvent: ILogOrderedEvent | undefined, logs: ILogEvent[]): ILogOrderedEvent[] => {
                const filtered = logs
                  .map(ev => {
                    const storeObj = { ...ev, orderId: getEventOrderIdentifier(ev) } as ILogOrderedEvent
                    return storeObj
                  })
                  .filter(ev => {

                    return ev.orderId > Math.max(processState.orderId || 0, headEvent ? headEvent.orderId : 0)
                  })

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
        const eventProcessor = config.processList.find((processConfig, idx) => {
          if ('eventName' in next) {
            return nextLogEvents[idx].indexOf(next) > -1
          }

          throw new Error('Event is not an ILogOrderedEvent')
        })

        if (!eventProcessor) {
          throw new Error('Event processor not found')
        }


        acc.orderId = next.orderId
        acc.blockNumber = next.blockNumber
        acc.state = eventProcessor.step(acc.state, next)

        return acc
      }, params.processState)

      nextState.blockNumber = config.syncBlock

      return indexDB.set(config.scope, nextState, scopeKey)
    }, ...params.processNextLog))

  }, nextLogs)

  return sync
}


function getProcessorKey(processConfigList: IProcessSourceConfig<any, any>[], blueprint: IProcessedStoreConfig) {
  return processConfigList.reduce((acc, next) => `${acc}:${next.source.eventName}`, `${blueprint.chainId}:${blueprint.startBlock}:${blueprint.endBlock}`)
}

export function validateSeed(blueprintConfig: IProcessedStoreConfig, seedConfig: IProcessedStoreConfig): null | string {

  if (seedConfig.startBlock !== blueprintConfig.startBlock) {
    return `seed startBlock ${seedConfig.startBlock} does not match blueprint startBlock ${blueprintConfig.startBlock}`
  }

  if (seedConfig.endBlock !== blueprintConfig.endBlock) {
    return `seed endBlock ${seedConfig.endBlock} does not match blueprint endBlock ${blueprintConfig.endBlock}`
  }

  if (seedConfig.chainId !== blueprintConfig.chainId) {
    return `seed chainId ${seedConfig.chainId} does not match blueprint chainId ${blueprintConfig.chainId}`
  }

  return null
}

// throw new Error('stored database does not match config blueprint, cleaning storage is required')


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
