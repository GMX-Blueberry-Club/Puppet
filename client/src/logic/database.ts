import { fromCallback } from '@aelea/core'
import { concatMap, continueWith, fromPromise, map, switchLatest, take, tap, throttle } from "@most/core"
import { curry2, curry3 } from '@most/prelude'
import { Stream } from "@most/types"
import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex } from '@noble/hashes/utils'


// @ts-ignore
BigInt.prototype.toJSON = function () { return this.toString() + 'n' }


export function initDbStore<TName extends string>(dbName: TName): Stream<IDBDatabase> {
  const cb = fromCallback<IDBDatabase>(cb => {
    const indexedDB = window.indexedDB
    const request = indexedDB.open(dbName, 1)

    request.onerror = event => console.error('error opening db', event)

    request.onsuccess = () => {
      const db = request.result

      cb(db)
    }

    request.onupgradeneeded = (event) => {
      const db = request.result
      db.createObjectStore(dbName, { keyPath: 'id' })
    }

    return () => {
      request.onsuccess = null
      request.onerror = null
    }
  })

  return cb
}

function transact<TResult>(db: IDBDatabase, action: (store: IDBObjectStore) => IDBRequest<TResult>): Stream<TResult> {
  return fromPromise(new Promise((resolve, reject) => {
    const transaction = db.transaction(db.name, 'readwrite')
    const store = transaction.objectStore(db.name)
    const request = action(store)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  }))
}

export function getStore<TData>(dbEvent: Stream<IDBDatabase>, key: string): Stream<TData> {
  return switchLatest(map(db => {
    return transact(db, store => {
      return store.get(key)
    })
  }, dbEvent))
}

export function streamSaveStore<TData>(dbEvent: Stream<IDBDatabase>, key: string, write: Stream<TData>): Stream<IDBValidKey> {
  return switchLatest(map(db => {
    return concatMap(data => {
      return transact(db, store => {
        return store.put({ id: key, data })
      })
    }, write)
  }, dbEvent))
}


export interface IStoreConfig {
  db: Stream<IDBDatabase>
  key: string
}
export interface IStoreScope<TData> extends IStoreConfig, Stream<TData> {
  write: Stream<TData>
  scope: ICreateScopeCurry2
}


export type ICreateScopeFn<TData> = (write: Stream<TData>) => IStoreScope<TData>

export interface ICreateScopeCurry2 {
  <TData>(initialState: TData, write: Stream<TData>): IStoreScope<TData>
  <TData>(initialState: TData): (write: Stream<TData>) => IStoreScope<TData>
}

export interface ICreateScopeCurry3 {
  <TData>(parentScope: IStoreConfig, initialState: TData, write: Stream<TData>): IStoreScope<TData>
  <TData>(parentScope: IStoreConfig, initialState: TData): (write: Stream<TData>) => IStoreScope<TData>
  (parentScope: IStoreConfig): ICreateScopeCurry2
}




export const createStoreScope: ICreateScopeCurry3 = curry3(<TData>(parentScope: IStoreConfig, initialState: TData, write: Stream<TData>): IStoreScope<TData> => {
  const newKey = hashData(JSON.stringify(initialState))
  const nextKey = hashData(`${parentScope.key}.${newKey}`)

  const startWith: Stream<TData> = map(data => data === undefined ? initialState : data, getStore<TData>(parentScope.db, nextKey))

  const doWrite = streamSaveStore(parentScope.db, nextKey, write)
  const replay = continueWith(() => doWrite, startWith)


  return {
    scope: createStoreScope({ key: nextKey, db: parentScope.db }),
    run(sink, scheduler) {
      return replay.run(sink, scheduler)
    },
    db: parentScope.db,
    key: nextKey,
    write,
  }
})



function hashData(data: string) {
  return bytesToHex(sha256(data))
}

