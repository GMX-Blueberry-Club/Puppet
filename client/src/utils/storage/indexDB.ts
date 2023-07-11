import { concatMap, constant, join, map } from "@most/core"
import { disposeNone } from "@most/disposable"
import { Stream } from "@most/types"
import { switchMap } from "gmx-middleware-utils"

export interface IDbParams<TName extends string = string, TOptions extends IDBObjectStoreParameters | undefined = undefined> {
  name: TName
  options?: TOptions
  db: Stream<IDBDatabase>
}


export type UseStore = <T>(
  txMode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => T | PromiseLike<T>,
) => Promise<T>;


export function read<TResult, TKey extends string = string, TName extends string = string, TOptions extends IDBObjectStoreParameters | undefined = undefined>(
  params: IDbParams<TName, TOptions>,
  key: TKey
): Stream<TResult | null> {
  return switchMap(db => {
    return action(db, params.name, 'readonly', store => store.get(key))
  }, params.db)
}

export function put<TResult, TKey extends string = string, TName extends string = string, TOptions extends IDBObjectStoreParameters | undefined = undefined>(
  params: IDbParams<TName, TOptions>,
  key: TKey,
  writeEvent: Stream<TResult>
): Stream<TResult> {
  return switchMap(db => {
    // write to db in order in which events were emitted
    return concatMap(data => {
      const reqEvent = action(db, params.name, 'readwrite', store => {
        const dbTx = store.put(data, key)

        return dbTx
      })
      return constant(data, reqEvent)
    }, writeEvent)
  }, params.db)
}


export function add<TResult, TName extends string = string, TOptions extends IDBObjectStoreParameters | undefined = undefined>(
  params: IDbParams<TName, TOptions>,
  list: TResult[]
): Stream<TResult[]> {
  return join(map(db => {
    const reqEvent = action(db, params.name, 'readwrite', store => {
      for (const item of list) {
        store.add(item)
      }
      return store.transaction
    })

    return constant(list, reqEvent)
  }, params.db))
}

export function getRange<TResult, TName extends string = string, TOptions extends IDBObjectStoreParameters | undefined = undefined>(
  params: IDbParams<TName, TOptions>,
  keyRange: [number, number]
): Stream<TResult | null> {
  return switchMap(db => {
    const newLocal = action(db, params.name, 'readonly', store => {
      const range = IDBKeyRange.bound(...keyRange, true, true)
      const dbReq = store.getAll(range)
      return dbReq
    })
    return newLocal
  }, params.db)
}



export function openDb<TName extends string, TOptions extends IDBObjectStoreParameters | undefined = undefined>(
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


function action<TResult, TName extends string>(
  dbInstance: IDBDatabase,
  storeName: TName,
  txMode: IDBTransactionMode,
  actionCb: (store: IDBObjectStore) => IDBRequest<any>| IDBTransaction
): Stream<TResult | null> {
  const store = dbInstance.transaction(storeName, txMode).objectStore(storeName)
  const req = actionCb(store)
  return request<TResult>(req)
}


function request<TResult>(req: IDBRequest<any> | IDBTransaction): Stream<TResult | null> {
  return {
    run(sink, scheduler) {
      if (req instanceof IDBTransaction) {
        req.oncomplete = () => sink.event(scheduler.currentTime(), null)
        req.onerror = err => sink.error(scheduler.currentTime(), req.error || new Error('Unknown error'))
        return disposeNone()
      }

      req.onsuccess = () => {
        // if (req.result === null) {
        //   return sink.error(scheduler.currentTime(), new Error(`name: ${name} keypath: ${keyPath} Not found, resulted in null`))
        // }
        const time = scheduler.currentTime()

        if (req.result instanceof IDBCursorWithValue) {
          const value = req.result.value === null ? [] : req.result.value
          sink.event(time, value)
          req.result.continue()
        } else {
          sink.event(scheduler.currentTime(), req.result)
        }

        sink.end(time)
      }

      req.onerror = err => sink.error(scheduler.currentTime(), req.error || new Error('Unknown error'))

      return disposeNone()
    }
  }
}