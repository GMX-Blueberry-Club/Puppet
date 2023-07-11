import { map } from "@most/core"
import { Stream } from "@most/types"
import { ILogOrdered, switchMap } from "gmx-middleware-utils"
import { zipArray } from "../../logic/utils"
import * as indexDB from "../storage/indexDB"
import * as store from "../storage/storeScope"
import { IIndexEventLogScopeParams, filterEventLogs } from "./rpc"



export interface IProcessConfig<TLog extends ILogOrdered, TReturn> {
  source: IIndexEventLogScopeParams<TLog, any, any>
  step: (seed: TReturn, value: TLog) => TReturn
}

interface IProcessStore<T> {
  data: T
  blockNumber: bigint
  orderId: number
  event: ILogOrdered | null
}

export function processSources<TReturn, TProcessConfigList extends ILogOrdered[]>(
  parentStoreScope: store.IStoreconfig<'root'>,
  scopeState: TReturn,
  startBlock: bigint,
  ...processList:  { [P in keyof TProcessConfigList]: IProcessConfig<TProcessConfigList[P], TReturn>}
): Stream<TReturn> {
  
  for (const processSrc of processList) {
    if (processSrc.source.startBlock > startBlock) {
      throw new Error(`Process source ${processSrc.source.scope.name}, startBlock: ${processSrc.source.startBlock} cannot be newer then processor startBlock: ${startBlock}`)
    }
  }


  const scopeKey = processList.reduce((acc, next) => `${acc}:${next.source.eventName}:${next.source.startBlock}`, 'processor')
  const scope = store.createStoreScope(parentStoreScope, scopeKey)
  const seed = { data: scopeState, event: null, orderId: Number(1000000n * startBlock), blockNumber: startBlock } as IProcessStore<TReturn>
  const storedData = store.read(scope, scopeKey, seed)
 
  const processWriteSources = switchMap(storeState => { 

    const processNewEvents = processList.map(processConfig => {
      return filterEventLogs({ ...processConfig.source, startBlock: storeState.blockNumber, orderId: storeState.orderId })
    })

    const stepState = zipArray((...nextLogEvents) => {
      const orderedNextEvents = nextLogEvents.flat().sort((a, b) => a.orderId - b.orderId)
      let nextSeed = storeState
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
    }, ...processNewEvents)

    return stepState
  }, storedData)

  // return store.replayWrite(scope, currentStoreKey, processWriteSources)

  const process = indexDB.put(scope, scopeKey, processWriteSources)

  return map(x => x.data, process)
}
