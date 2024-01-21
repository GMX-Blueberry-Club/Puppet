import { O, Op, combineArray, combineObject, isStream, replayLatest } from "@aelea/core"
import { at, awaitPromises, constant, continueWith, empty, filter, fromPromise, map, merge, multicast, now, periodic, recoverWith, switchLatest, takeWhile, zipArray } from "@most/core"
import { disposeNone } from "@most/disposable"
import { curry2 } from "@most/prelude"
import { Stream } from "@most/types"
import { countdownFn, unixTimestampNow } from "./utils.js"


export type StateOfStream<T> = {
  [P in keyof T]?: Stream<T[P]> | T[P]
}
export type StateStream<T> = {
  [P in keyof T]: Stream<T[P]>
}


type IStreamOrPromise<T> = Stream<T> | Promise<T>

export function combineState<A, K extends keyof A = keyof A>(state: StateOfStream<A>): Stream<A> {
  const entries = Object.entries(state) as [keyof A, Stream<A[K]>| A[K]][]
  const streams = entries.map(([_, stream]) => streamOf(stream))

  const zipped = combineArray((...arrgs: A[K][]) => {
    return arrgs.reduce((seed, val, idx) => {
      const key = entries[idx][0]
      seed[key] = val

      return seed
    }, {} as A)
  }, ...streams)

  return zipped
}

export function takeUntilLast<T>(fn: (t: T) => boolean, s: Stream<T>) {
  let last: T

  return continueWith(() => now(last), takeWhile(x => {
    const res = !fn(x)
    last = x
    return res
  }, s))
}

export function streamOf<T>(maybeStream: T | Stream<T>): Stream<T> {
  return isStream(maybeStream) ? maybeStream : now(maybeStream)
}

export function replayState<A>(state: StateStream<A>): Stream<A> {
  return replayLatest(multicast(combineObject(state)))
}

export function zipState<A, K extends keyof A = keyof A>(state: StateStream<A>): Stream<A> {
  const entries = Object.entries(state) as [keyof A, Stream<A[K]>][]
  const streams = entries.map(([_, stream]) => stream)

  const zipped = zipArray((...arrgs: A[K][]) => {
    return arrgs.reduce((seed, val, idx) => {
      const key = entries[idx][0]
      seed[key] = val

      return seed
    }, {} as A)
  }, streams)

  return zipped
}



export interface ISwitchMapCurry2 {
  <T, R>(cb: (t: T) => IStreamOrPromise<R>, s: Stream<T>): Stream<R>
  <T, R>(cb: (t: T) => IStreamOrPromise<R>): (s: Stream<T>) => Stream<R>
}


function switchMapFn<T, R>(cb: (t: T) => IStreamOrPromise<R>, s: Stream<T>) {
  return switchLatest(map(cbParam => {
    const cbRes = cb(cbParam)

    return isStream(cbRes) ? cbRes : fromPromise(cbRes)
  }, s))
}

export const switchMap: ISwitchMapCurry2 = curry2(switchMapFn)


export interface IPeriodRun<T> {
  actionOp: Op<number, Promise<T>>

  interval?: number
  startImmediate?: boolean
  recoverError?: boolean
}

export const filterNull = <T>(prov: Stream<T | null>) => filter((provider): provider is T => provider !== null, prov)


export const periodicRun = <T>({ actionOp, interval = 1000, startImmediate = true, recoverError = true }: IPeriodRun<T>): Stream<T> => {
  const tickDelay = at(interval, null)
  const tick = startImmediate ? merge(now(null), tickDelay) : tickDelay

  return O(
    constant(performance.now()),
    actionOp,
    awaitPromises,
    recoverError
      ? recoverWith(err => {
        console.error(err)

        return periodicRun({ interval: interval * 2, actionOp, recoverError, startImmediate: false })
      })
      : O(),
    continueWith(() => {
      return periodicRun({ interval, actionOp, recoverError, startImmediate: false, })
    }),
  )(tick)
}

export interface IPeriodSample {
  interval?: number
  startImmediate?: boolean
  recoverError?: boolean
}

const defaultSampleArgs = { interval: 1000, startImmediate: true, recoverError: true }

export const periodicSample = <T>(sample: Stream<T>, options: IPeriodSample = defaultSampleArgs): Stream<T> => {
  const params = { ...defaultSampleArgs, ...options }

  const tickDelay = at(params.interval, null)
  const tick = params.startImmediate ? merge(now(null), tickDelay) : tickDelay

  return O(
    constant(performance.now()),
    map(() => sample),
    switchLatest,
    params.recoverError
      ? recoverWith(err => {
        console.error(err)

        return periodicSample(sample, { ...params, interval: params.interval * 2, })
      })
      : O(),
    continueWith(() => {
      return periodicSample(sample, { ...params, startImmediate: false })
    }),
  )(tick)
}

export const switchFailedSources = <T>(sourceList: Stream<T>[], activeSource = 0): Stream<T> => {
  const source = sourceList[activeSource]
  return recoverWith((err) => {
    console.warn(err)
    const nextActive = activeSource + 1
    if (!sourceList[nextActive]) {
      console.warn(new Error('No sources left to recover with'))

      return empty()
    }

    return switchFailedSources(sourceList, nextActive)
  }, source)
}


export function importGlobal<T>(queryCb: () => Promise<T>): Stream<T> {
  let cacheQuery: Promise<T> | null = null

  return {
    run(sink, scheduler) {
      if (cacheQuery === null) {
        cacheQuery = queryCb()
      }

      cacheQuery
        .then(res => {
          sink.event(scheduler.currentTime(), res)
        })
        .catch(err => {
          sink.error(scheduler.currentTime(), err as Error)
        })

      return disposeNone()
    },
  }
}


export const everySec = map(unixTimestampNow, periodic(1000))

export const countdown = (targetDate: number) => {
  return map(now => countdownFn(targetDate, now), everySec)
}

export const ignoreAll = filter(() => false)
