import { replayLatest } from "@aelea/core"
import { constant, fromPromise, map, multicast } from "@most/core"
import { disposeNone } from "@most/disposable"
import { Stream } from "@most/types"
import { switchMap } from "gmx-middleware-utils"

export interface IDbParams<TName extends string = string> {
  name: TName
  keyPath?: string | string[] | null
  autoIncrement?: boolean
}

export interface IDbStoreParams {
  name: string
  options?: IDBObjectStoreParameters
  db: Stream<IDBDatabase>
}


export function set<TResult>(
  params: IDbStoreParams,
  key: IDBValidKey,
  data: TResult,
): Stream<TResult> {
  return map(db => {
    const tx = db.transaction(params.name, 'readwrite')
    const store = tx.objectStore(params.name)
    const req = store.put(data, key)

    req.onerror = err => {
      throw new Error(`${err.type}: Unknown error`)
    }

    return data
  }, params.db)
}

export function get<TResult>(
  params: IDbStoreParams,
  key: IDBValidKey | IDBKeyRange,
): Stream<TResult | null> {
  return switchMap(db => {
    const store = db.transaction(params.name, 'readonly').objectStore(params.name)
    return request(store.get(key))
  }, params.db)
}


export function add<TResult>(
  params: IDbStoreParams,
  list: TResult[]
): Stream<TResult[]> {
  return switchMap(db => {
    const store = db.transaction(params.name, 'readwrite').objectStore(params.name)
    for (const item of list) {
      store.add(item)
    }

    return constant(list, request(store.count()))
  }, params.db)
}
export function getRange<TResult>(
  params: IDbStoreParams,
): Stream<TResult[]> {
  return switchMap(db => {
    const store = db.transaction(params.name, 'readonly').objectStore(params.name)

    return request(store.getAll())
  }, params.db)
}


export function clear<TResult>(
  params: IDbStoreParams,
): Stream<TResult> {
  return switchMap(db => {
    const newLocal = db.transaction(params.name, 'readwrite')
    const store = newLocal.objectStore(params.name)

    return request(store.clear())
  }, params.db)
}


export function cursor<TName extends string>(
  params: IDbStoreParams,
  query?: IDBValidKey | IDBKeyRange | null,
  direction?: IDBCursorDirection
): Stream<IDBCursorWithValue | null> {
  return switchMap(db => {
    const store = db.transaction(params.name, 'readwrite').objectStore(params.name)
    return cursorStep(store.openCursor(query, direction))
  }, params.db)
}


export function openDatabase<TName extends string>(
  name: TName,
  version: number,
  storeParamList: IDbParams[]
): Stream<IDBDatabase> {
  const openDbRequest = indexedDB.open(name, version)

  openDbRequest.onupgradeneeded = event => {
    const db = openDbRequest.result
    try {
      for (const params of storeParamList) {
        if (db.objectStoreNames.contains(params.name)) {
          openDbRequest.result.deleteObjectStore(params.name)
        }
          
        openDbRequest.result.createObjectStore(params.name, params)
      }
    } catch (e) {
      throw e instanceof Error ? e : new Error('Unknown error')
    }
  }

  return request(openDbRequest)
  // const requestDb = new Promise<IDBDatabase>((resolve, reject) => {
  //   openDbRequest.onerror = err => reject(openDbRequest.error || new Error(`${err.type}: Unknown error`))
  //   openDbRequest.onsuccess = () => {
  //     resolve(openDbRequest.result)
  //   }
  // })
 

  // return fromPromise(requestDb)
}


function request<TResult>(req: IDBRequest<any>): Stream<TResult> {
  return fromPromise(new Promise<TResult>((resolve, reject) => {
    req.onerror = err => reject(req.error || new Error(`${err.type}: Unknown error`))
    req.onsuccess = () => {
      resolve(req.result)
    }
  }))
}

function cursorStep(req: IDBRequest<IDBCursorWithValue | null>): Stream<IDBCursorWithValue | null> {
  return {
    run(sink, scheduler) {
      if (req instanceof IDBTransaction) {
        req.oncomplete = () => sink.event(scheduler.currentTime(), null)
        req.onerror = err => sink.error(scheduler.currentTime(), req.error || new Error(`${req.db.name}: Unknown error`))
        return disposeNone()
      }

      req.onsuccess = () => {
        const time = scheduler.currentTime()
        sink.event(time, req.result)
      }

      req.onerror = err => sink.error(scheduler.currentTime(), req.error || new Error(`${err.type}: Unknown error`))

      return disposeNone()
    }
  }
}
