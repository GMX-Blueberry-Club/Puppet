import { fromCallback } from '@aelea/core'
import { concatMap, constant, continueWith, fromPromise, map, switchLatest, take, tap, throttle } from "@most/core"
import { curry2, curry3 } from '@most/prelude'
import { Stream } from "@most/types"
import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex } from '@noble/hashes/utils'


// @ts-ignore
BigInt.prototype.toJSON = function () { return this.toString() + 'n' }


export function initDbStore<TName extends string>(dbName: TName): Stream<IDBDatabase> {
  return fromPromise(new Promise<IDBDatabase>((resolve, reject) => {
    const indexedDB = window.indexedDB
    const request = indexedDB.open(dbName, 1)

    request.onerror = event => reject(event)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = request.result
      db.createObjectStore(dbName, { keyPath: 'id' })
    }

    return () => {
      request.onsuccess = null
      request.onerror = null
    }
  }))
}

export function transact<TResult>(db: IDBDatabase, action: (store: IDBObjectStore) => IDBRequest<TResult>): Stream<TResult> {
  return fromPromise(new Promise((resolve, reject) => {
    const transaction = db.transaction(db.name, 'readwrite')
    const store = transaction.objectStore(db.name)
    const request = action(store)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  }))
}

export function getStore<TData>(dbEvent: Stream<IDBDatabase>, key: string): Stream<{ key: string, data: TData } | undefined> {
  return switchLatest(map(db => {
    const getTx = transact(db, store => store.get(key))
    return map(res => res, getTx)
  }, dbEvent))
}

export function streamSaveStore<TData>(dbEvent: Stream<IDBDatabase>, key: string, write: Stream<TData>): Stream<TData> {
  return switchLatest(map(db => {
    return concatMap(data => {
      return constant(data, transact(db, store => store.put({ id: key, data })))
    }, write)
  }, dbEvent))
}


export interface IStoreConfig {
  db: Stream<IDBDatabase>
  key: string
}
export interface IStoreScope<TData> extends IStoreConfig, Stream<TData> {
}

export interface IWriteStoreScope<TData> extends IStoreScope<TData> {
  write: Stream<TData>
}


export type ICreateScopeFn<TData> = (write: Stream<TData>) => IStoreScope<TData>

export interface ICreateScopeCurry2 {
  <TData>(initialState: TData, write: Stream<TData>): IStoreScope<TData>
  <TData>(initialState: TData): (write: Stream<TData>) => IStoreScope<TData>
}

export interface IWriteScopeCurry3 {
  <TData>(parentScope: IStoreConfig, initialState: TData, write: Stream<TData>): IStoreScope<TData>
  <TData>(parentScope: IStoreConfig, initialState: TData): (write: Stream<TData>) => IStoreScope<TData>
  (parentScope: IStoreConfig): ICreateScopeCurry2
}

export interface IScopeCurry2 {
  <TData>(parentScope: IStoreConfig, initialState: TData): IStoreScope<TData>
  <TData>(parentScope: IStoreConfig): (initialState: TData) => IStoreScope<TData>
}



export const createStoreScope: IScopeCurry2 = curry2(<TData>(parentScope: IStoreConfig, initialState: TData): IStoreScope<TData> => {
  const newKey = hashData(JSON.stringify(initialState))
  const nextKey = hashData(`${parentScope.key}.${newKey}`)

  const state: Stream<TData> = map(res => {
    return res === undefined ? initialState : res.data
  }, getStore<TData>(parentScope.db, nextKey))

  return {
    run(sink, scheduler) {
      return state.run(sink, scheduler)
    },
    db: parentScope.db,
    key: nextKey,
  }
})


export const writeStoreScope: IWriteScopeCurry3 = curry3(<TData>(parentScope: IStoreConfig, initialState: TData, write: Stream<TData>): IWriteStoreScope<TData> => {
  const scope = createStoreScope(parentScope, initialState)
  const doWrite = streamSaveStore(parentScope.db, scope.key, write)
  const state = continueWith(() => doWrite, scope)

  return {
    run(sink, scheduler) {
      return state.run(sink, scheduler)
    },
    db: scope.db,
    key: scope.key,
    write,
  }
})



function hashData(data: string) {
  return bytesToHex(sha256(data))
}

