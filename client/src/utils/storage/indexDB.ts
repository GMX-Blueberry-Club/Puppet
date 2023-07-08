import { concatMap, constant } from "@most/core"
import { disposeNone } from "@most/disposable"
import { Stream } from "@most/types"
import { switchMap } from "gmx-middleware-utils"

export interface IDbParams<TName extends string = string, TKeypath extends string | string[] = string> {
  name: TName
  keyPath: TKeypath
  db: Stream<IDBDatabase>
}


export type UseStore = <T>(
  txMode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => T | PromiseLike<T>,
) => Promise<T>;


export function get<TResult, TName extends string, TKeypath extends string | string[]>(
  params: IDbParams<TName, TKeypath>,
  key: TName
): Stream<TResult | null> {
  return switchMap(db => {
    return transact(db, 'readonly', params.name, store => store.get(key))
  }, params.db)
}

export function getRange<TResult, TName extends string, TKeypath extends string | string[]>(
  params: IDbParams<TName, TKeypath>,
  range: [number, number]
): Stream<TResult | null> {
  return switchMap(db => {
    const newLocal = transact<TResult, TName, TKeypath>(db, 'readonly', params.name, store => {
      const keyRange = IDBKeyRange.bound(...range, true, true)
      const dbReq = store.openCursor(keyRange)
      return dbReq
    })
    return newLocal
  }, params.db)
}

export function write<TResult, TName extends string, TKeypath extends string | string[]>(
  params: IDbParams<TName, TKeypath>,
  writeEvent: Stream<TResult>
): Stream<TResult> {
  return switchMap(db => {
    return concatMap(data => {
      const reqEvent = transact(db, 'readwrite', params.name, store => {
        const dbTx = store.put(data)
        return dbTx
      })
      return constant(data, reqEvent)
    }, writeEvent)
  }, params.db)
}

export function openDb<TName extends string, TKeypath extends string | string[] = 'id'>(
  name: TName,
  keyPath: TKeypath = 'id' as TKeypath,
  version = 1,
): IDbParams<TName, TKeypath> {

  const db: Stream<IDBDatabase> = {
    run(sink, scheduler) {
      const openDbRequest = indexedDB.open(name, version)

      openDbRequest.onupgradeneeded = event => {
        try {
          openDbRequest.result.createObjectStore(name, { keyPath })
        } catch (e) {
          sink.error(scheduler.currentTime(), e instanceof Error ? e : new Error('Unknown error'))
        }
      }
  
      openDbRequest.onsuccess = () => sink.event(scheduler.currentTime(), openDbRequest.result)
      openDbRequest.onerror = (e) => {
        const target = e.target as IDBRequest<IDbParams<TName, TKeypath>>
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

  return { db, name, keyPath }
}


function transact<TResult, TName extends string, TKeypath extends string | string[]>(
  dbInstance: IDBDatabase,
  txMode: IDBTransactionMode,
  name: TName,
  actionCb: (store: IDBObjectStore) => IDBRequest<IDBCursorWithValue | null> | IDBRequest<TResult>
): Stream<TResult | null> {
  return {
    run(sink, scheduler) {
      const tx = dbInstance.transaction(name, txMode)
      const store = tx.objectStore(name)
      const req = actionCb(store)

      req.onsuccess = () => {
        // if (req.result === null) {
        //   return sink.error(scheduler.currentTime(), new Error(`name: ${name} keypath: ${keyPath} Not found, resulted in null`))
        // }

        if (req.result instanceof IDBCursorWithValue) {
          return sink.event(scheduler.currentTime(), req.result.value)
          // req.result.continue()
        }

        sink.event(scheduler.currentTime(), req.result)
      }
      req.onerror = () => sink.error(scheduler.currentTime(), req.error || new Error('Unknown error'))

      return disposeNone()
    }
  }
}