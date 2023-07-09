import { map } from "@most/core"
import { Stream } from "@most/types"
import { ILogIndex, ILogOrdered, orderEvents, switchMap } from "gmx-middleware-utils"
import * as store from "../storage/storeScope"
import * as indexDB from "../storage/indexDB"
import { zipArray } from "../../logic/utils"
import { IReplayRpcStore } from "./rpc"
import * as viem from "viem"



export interface IProcessConfig<
  TValue extends ILogOrdered,
  TReturn
> {
  source: IReplayRpcStore<TValue>
  step: (seed: TReturn, value: TValue) => TReturn
}

interface IProcessStep<T> {
  data: T
  indexedCountMap: Record<string, number>
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
  // the rest is used for type inference
  process1: IProcessConfig<TSource1, TReturn>,
  process2?: IProcessConfig<TSource2, TReturn>,
  process3?: IProcessConfig<TSource3, TReturn>,
  process4?: IProcessConfig<TSource4, TReturn>,
  process5?: IProcessConfig<TSource5, TReturn>,
): Stream<TReturn> {




  // eslint-disable-next-line prefer-rest-params
  const processList: IProcessConfig<any, TReturn>[] = [...arguments].slice(2)
  const sourceEventList = processList.map(x => x.source.log)
  const storeScopeSeed = processList.reduce((seed, next) => {
    seed.indexedCountMap[next.source.scope.name] = 0
    return seed
  }, { indexedCountMap: {}, data: scopeState } as IProcessStep<TReturn>)
  const scope = store.createStoreScope(parentStoreScope, 'proc')
  const storedData = store.read(scope, 'proc', storeScopeSeed)



  
  const processWriteSources = switchMap(storeState => {
    const nextSeed = storeState
    const stepState = zipArray((...nextLogEvents) => {

      const nextEvents = nextLogEvents.flatMap((state, processIdx) => {
        const dbProcessName = processList[processIdx].source.scope.name
        const totalLogCount = state.length
        const deltaStoreCount = state.length - nextSeed.indexedCountMap[dbProcessName]

        nextSeed.indexedCountMap[dbProcessName] = totalLogCount

        return deltaStoreCount
          ? state.slice(-deltaStoreCount)
          : []
      })

      const orderedNextEvents = orderEvents(nextEvents)

      for (let evIdx = 0; evIdx < orderedNextEvents.length; evIdx++) {
        const nextEvent = orderedNextEvents[evIdx]

        for (let processIdx = 0; processIdx < processList.length; processIdx++) {
          const processState = nextLogEvents[processIdx]

          if (!processState.includes(nextEvent)) {
            throw new Error(`Event ${nextEvent.event} not found in log`)
          }

          const processSrc = processList[processIdx]
          nextSeed.data = processSrc.step(nextSeed.data, nextEvent)
        }
      }

      return nextSeed
    }, ...sourceEventList)

    return stepState
  }, storedData)

  // const storeReplayWrite = store.replayWrite(scope, currentStoreKey, processWriteSources)

  return map(x => x.data, processWriteSources)
}
