import { constant } from "@most/core"
import { disposeNone } from "@most/disposable"
import { Stream } from "@most/types"
import { switchMap } from "gmx-middleware-utils"


export interface IDbStoreConfig<TKeyPath extends undefined | string | string[] = undefined | string | string[]> {
  autoIncrement?: boolean;
  keyPath?: TKeyPath;
}

export interface IDbParams<TName extends string, TOptions extends IDbStoreConfig> {
  name: TName
  options?: TOptions
  db: Stream<IDBDatabase>
}

export type UseStore = <T>(
  txMode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => T | PromiseLike<T>,
) => Promise<T>;


export function get<TResult, TKey extends string, TName extends string, TOptions extends IDbStoreConfig>(
  params: IDbParams<TName, TOptions>,
  key: TKey | IDbParams<TName, TOptions>['name'] = params.name,
): Stream<TResult | null> {
  return read(params, store => store.get(key))
}

export function set<TResult, TKey extends string, TName extends string, TOptions extends IDbStoreConfig>(
  params: IDbParams<TName, TOptions>,
  data: TResult,
  key: TKey | IDbParams<TName, TOptions>['name'] = params.name,
): Stream<TResult> {
  return constant(data, write(params, store => {
    return store.put(data, key)
  }))
}


export function add<TResult, TName extends string, TOptions extends IDbStoreConfig>(
  params: IDbParams<TName, TOptions>,
  list: TResult[]
): Stream<TResult[]> {
  return constant(list, write(params, store => {
    for (const item of list) {
      store.add(item)
    }
    return store.transaction
  }))
}


export function getRange<TResult, TName extends string, TOptions extends IDbStoreConfig>(
  params: IDbParams<TName, TOptions>,
  key?: IDBValidKey | IDBKeyRange
): Stream<TResult[]> {
  return read(params, store => store.getAll(key))
}

export function openDb<TName extends string, TOptions extends IDbStoreConfig>(
  dbName: TName,
  options?: TOptions,
  version = 1,
): IDbParams<TName, TOptions> {

  const db: Stream<IDBDatabase> = {
    run(sink, scheduler) {
      const openDbRequest = indexedDB.open(dbName, version)

      openDbRequest.onupgradeneeded = event => {
        try {
          openDbRequest.result.createObjectStore(dbName, options)
        } catch (e) {
          sink.error(scheduler.currentTime(), e instanceof Error ? e : new Error('Unknown error'))
        }
      }
  
      openDbRequest.onsuccess = () => {
        const time = scheduler.currentTime()
        sink.event(time, openDbRequest.result)
        sink.end(time)
      }

      openDbRequest.onerror = (e) => {
        const target = e.target as IDBRequest<IDbParams<TName, TOptions>>
        sink.error(scheduler.currentTime(), target.error || new Error('Unknown error'))
      }
      openDbRequest.onblocked = () => sink.error(scheduler.currentTime(), new Error('Database transaction blocked'))

      return {
        dispose() {
          openDbRequest.onsuccess = openDbRequest.onerror = openDbRequest.onblocked = null
        },
      }
    },
  }

  return { db, name: dbName, options: options }
}

export function read<TResult, TName extends string, TOptions extends IDbStoreConfig>(
  params: IDbParams<TName, TOptions>,
  actionCb: (store: IDBObjectStore) => IDBRequest<TResult>
): Stream<TResult> {
  return switchMap(db => {
    const store = db.transaction(params.name, 'readonly').objectStore(params.name)
    const req = actionCb(store)
    return request<TResult>(req)
  }, params.db)
}
export function clear<TResult, TName extends string, TOptions extends IDbStoreConfig>(
  params: IDbParams<TName, TOptions>
): Stream<TResult> {
  return switchMap(db => {
    const req = db.transaction(params.name, 'readwrite').objectStore(params.name).clear()
    return request<TResult>(req)
  }, params.db)
}

export function write<TResult, TName extends string, TOptions extends IDbStoreConfig>(
  params: IDbParams<TName, TOptions>,
  actionCb: (store: IDBObjectStore) => IDBRequest<any>| IDBTransaction
): Stream<TResult | null> {
  return switchMap(db => {
    const store = db.transaction(params.name, 'readwrite').objectStore(params.name)
    const req = actionCb(store)
    return request<TResult>(req)
  }, params.db)
}

export function cursor<TName extends string, TOptions extends IDbStoreConfig>(
  params: IDbParams<TName, TOptions>,
  query?: IDBValidKey | IDBKeyRange | null,
  direction?: IDBCursorDirection
): Stream<IDBCursorWithValue | null> {
  return switchMap(db => {
    const store = db.transaction(params.name, 'readonly').objectStore(params.name)
    const req = cursorStep(store.openCursor(query, direction))

    return req
  }, params.db) 
}


export function request<TResult>(req: IDBRequest<any> | IDBTransaction): Stream<TResult | null> {
  return {
    run(sink, scheduler) {

      req.onerror = err => sink.error(scheduler.currentTime(), req.error || new Error(`${req.db.name}: Unknown error`))

      if (req instanceof IDBTransaction) {
        req.oncomplete = () => sink.event(scheduler.currentTime(), null)
        return disposeNone()
      }

      req.onsuccess = () => {
        const time = scheduler.currentTime()

        sink.event(scheduler.currentTime(), req.result)
        sink.end(time)
      }

      return disposeNone()
    }
  }
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

      req.onerror = err => sink.error(scheduler.currentTime(), req.error || new Error(`${req.db.name}: Unknown error`))

      return disposeNone()
    }
  }
}