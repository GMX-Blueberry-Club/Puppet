import { map } from "@most/core"
import { Stream } from "@most/types"
import { ILogIndex, orderEvents, switchMap } from "gmx-middleware-utils"
import * as database from "../logic/browserDatabaseScope"
import { zipArray } from "../logic/utils"
import { IStoreScope } from "../logic/browserDatabaseScope"

export interface IProcessConfig<
  TSource extends ILogIndex[],
  TReturn
> {
  source: IStoreScope<TSource>
  step: (seed: TReturn, value: TSource[number]) => TReturn
}

interface IProcessStep<T> {
  data: T
  indexedCountMap: Record<string, number>
}

export function processSources<
  TReturn,

  TSource1 extends ILogIndex[],
  TSource2 extends ILogIndex[],
  TSource3 extends ILogIndex[],
  TSource4 extends ILogIndex[],
  TSource5 extends ILogIndex[],
>(
  parentStoreScope: database.IStoreScope<any>,
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
  const sourceEventList = processList.map(x => x.source)

  const storeScopeSeed = sourceEventList.reduce((seed, next) => {
    seed.indexedCountMap[next.key] = 0
    return seed
  }, { indexedCountMap: {}, data: scopeState } as IProcessStep<TReturn>)

  const currentStoreKey = database.getStoreKey(parentStoreScope, storeScopeSeed)
  const seedStoredData = database.getStoredSeedData(currentStoreKey, storeScopeSeed)

  const processWriteSources = switchMap(storeState => {
    const nextSeed = storeState
    const stepState = zipArray((...nextLogEvents) => {

      const nextEvents = nextLogEvents.flatMap((state, processIdx) => {
        const processKey = processList[processIdx].source.key
        const totalLogCount = state.logHistory.length
        const deltaStoreCount = state.logHistory.length - nextSeed.indexedCountMap[processKey]

        nextSeed.indexedCountMap[processKey] = totalLogCount

        return deltaStoreCount
          ? state.logHistory.slice(-deltaStoreCount)
          : []
      })
      const orderedNextEvents = orderEvents(nextEvents)

      for (let evIdx = 0; evIdx < orderedNextEvents.length; evIdx++) {
        const nextEvent = orderedNextEvents[evIdx]

        for (let processIdx = 0; processIdx < processList.length; processIdx++) {
          const processState = nextLogEvents[processIdx]

          if (!processState.logHistory.includes(nextEvent)) {
            throw new Error(`Event ${nextEvent.event} not found in log`)
          }

          const processSrc = processList[processIdx]
          nextSeed.data = processSrc.step(nextSeed.data, nextEvent)
        }
      }

      return nextSeed
    }, ...sourceEventList)

    return stepState
  }, seedStoredData)

  const store = database.writeStoreData(currentStoreKey, processWriteSources)

  return map(s => s.data, store)
}
