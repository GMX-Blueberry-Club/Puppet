import { continueWith, join, map, now, tap } from "@most/core"
import { Stream } from "@most/types"
import { ILogIndex, ILogOrdered, getEventOrderIdentifier, orderEvents, switchMap } from "gmx-middleware-utils"
import * as store from "../storage/storeScope"
import * as indexDB from "../storage/indexDB"
import { zipArray } from "../../logic/utils"
import { IFilterLogsParams, filterLogs, replayRpcLog } from "./rpc"
import * as viem from "viem"



export interface IProcessConfig<
  TValue extends ILogOrdered,
  TReturn
> {
  source: IFilterLogsParams<TValue, any, any>
  step: (seed: TReturn, value: TValue) => TReturn
}

interface IProcessStore<T, TIdentifier extends ILogOrdered & ILogIndex> {
  data: T
  indexedOrderIdMap: Record<`${string}:${string}:0x${string}:${number}`, number | null>

  event: TIdentifier

  syncedBlockNumber: bigint

  syncedOrderId: number
  syncedEvent: TIdentifier | null

  syncedProcessedOrderId: number
  syncedProcessedEvent: TIdentifier | null
}

export function processSources<
  TReturn,

  TSource1 extends ILogOrdered,
  TSource2 extends ILogOrdered,
  TSource3 extends ILogOrdered,
  TSource4 extends ILogOrdered,
  TSource5 extends ILogOrdered,
>(
  parentStoreScope: store.IStoreconfig<'root'>,
  scopeState: TReturn,
  blockNumber: number,
  // the rest is used for type inference
  process1: IProcessConfig<TSource1, TReturn>,
  process2?: IProcessConfig<TSource2, TReturn>,
  process3?: IProcessConfig<TSource3, TReturn>,
  process4?: IProcessConfig<TSource4, TReturn>,
  process5?: IProcessConfig<TSource5, TReturn>,
): Stream<TReturn> {




  // eslint-disable-next-line prefer-rest-params
  const processList: IProcessConfig<any, TReturn>[] = [...arguments].slice(3)
  const scope = store.createStoreScope(parentStoreScope, 'proc')
  const seed = { indexedOrderIdMap: {}, data: scopeState, syncedProcessedOrderId: 0, syncedOrderId: 0, syncedProcessedEvent: null, syncedEvent: null, syncedBlockNumber: BigInt(blockNumber) } as IProcessStore<TReturn, ILogOrdered & ILogIndex>
  const storedData = store.read(scope, 'proc', seed)
 
  const processWriteSources = switchMap(storeState => { 
    let nextSeed = storeState

    const initalStoredEvents = processList.map((pcf, processIdx) => {
      const processScope = processList[processIdx].source.scope
      const seedStoredData: Stream<(ILogOrdered & ILogIndex)[]> = map(res => res === null ? [] : res, indexDB.getRange(processScope, [nextSeed.syncedOrderId, Number(1000000000000000000n)]))
      const newLogs = filterLogs({ ...pcf.source, startBlock: Number(nextSeed.syncedBlockNumber) })
      return continueWith(() => newLogs, seedStoredData)
    })

    const stepState = zipArray((...nextLogEvents) => {

      nextSeed = nextLogEvents.reduce((prev, nextLogList) => {
        if (nextLogList.length) {
          const lst = nextLogList[nextLogList.length - 1]

          if (lst.orderIdentifier > prev.syncedOrderId) {
            return { ...prev, syncedOrderId: lst.orderIdentifier, syncedEvent: lst, syncedBlockNumber: lst.blockNumber }
          }
        }

        return prev
      }, storeState)


      const orderedNextEvents = orderEvents(nextLogEvents.flat())

      for (let evIdx = 0; evIdx < orderedNextEvents.length; evIdx++) {
        const nextEvent = orderedNextEvents[evIdx]

        for (let processIdx = 0; processIdx < processList.length; processIdx++) {
          const processState = nextLogEvents[processIdx]

          const processSrc = processList[processIdx]
          try {
            if (!processState.includes(nextEvent)) {
              throw new Error(`Event ${nextEvent.event} not found in log`)
            }

            nextSeed.data = processSrc.step(nextSeed.data, nextEvent)
            nextSeed.syncedProcessedEvent = nextEvent

          } catch (err){
            // reset
            nextSeed.data = scopeState
            console.error('Error processing event ', nextEvent, err)
          }
        }
      }


      return nextSeed
    }, ...initalStoredEvents)

    return stepState
  }, storedData)

  // return store.replayWrite(scope, currentStoreKey, processWriteSources)

  const process = indexDB.put(scope, 'proc', processWriteSources)

  return map(x => x.data, process)
}
