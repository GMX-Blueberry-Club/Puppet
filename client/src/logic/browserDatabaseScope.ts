import { concatMap, constant, fromPromise, map, mergeArray, switchLatest } from "@most/core"
import { curry2, curry3 } from '@most/prelude'
import { Stream } from "@most/types"
import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex } from '@noble/hashes/utils'
import { unixTimestampNow } from "gmx-middleware-utils"


// @ts-ignore
BigInt.prototype.toJSON = function () { return this.toString() + 'n' }

interface IStorePutTransaction<TData> {
  lastUpdateTimestamp: number,
  key: string,
  data: TData
}

const dbName = '_BROWSER_SCOPE'
const indexedDB = window.indexedDB
const request = indexedDB.open(dbName, 1)

const indexDb = fromPromise(new Promise<IDBDatabase>((resolve, reject) => {
  request.onerror = event => reject(event)
  request.onsuccess = () => resolve(request.result)

  request.onupgradeneeded = (event) => {
    const db = request.result
    db.createObjectStore(dbName, { keyPath: 'key' })
  }

  return () => {
    request.onsuccess = null
    request.onerror = null
  }
}))


export function createGenesisStore<TData>(genesisSeed: TData): IStoreScope<TData> {
  return storeScope({ key: '0' }, genesisSeed)
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

export function getStoreKey<TData>(parentScope: IParentScope, seed: TData): string {
  const newKey = hashData(JSON.stringify(seed))
  const nextKey = hashData(`${parentScope.key}.${newKey}`)

  return nextKey
}

export function getStoredSeedData<TData>(key: string, seed: TData): Stream<TData> {
  return switchLatest(map(ev => {
    const dataTx = transact<IStorePutTransaction<TData> | undefined>(ev, store => store.get(key))
    return map((storeData) => {
      return storeData === undefined ? seed : storeData.data
    }, dataTx)
  }, indexDb))
}

export function writeStoreData<TData>(key: string, write: Stream<TData>): Stream<TData> {
  return switchLatest(map(db => {
    return concatMap(data => {
      return constant(data, transact(db, store => {
        const tx = { lastUpdateTimestamp: unixTimestampNow(), key: key, data } as IStorePutTransaction<TData>

        return store.put(tx)
      }))
    }, write)
  }, indexDb))
}


interface IParentScope {
  key: string
}

export interface IStoreScope<TData> extends IParentScope, Stream<TData> { }

export interface IReplayWriteStoreScope<TData> extends IStoreScope<TData> { }


export interface ICreateScopeCurry2 {
  <TData>(genesisSeed: TData, write: Stream<TData>): IStoreScope<TData>
  <TData>(genesisSeed: TData): (write: Stream<TData>) => IStoreScope<TData>
}

export interface IWriteScopeCurry3 {
  <TData>(parentScope: IParentScope, genesisSeed: TData, write: Stream<TData>): IReplayWriteStoreScope<TData>
  <TData>(parentScope: IParentScope, genesisSeed: TData): (write: Stream<TData>) => IReplayWriteStoreScope<TData>
  (parentScope: IParentScope): ICreateScopeCurry2
}

export interface IScopeCurry2 {
  <TData>(parentScope: IParentScope, genesisSeed: TData): IStoreScope<TData>
  <TData>(parentScope: IParentScope): (genesisSeed: TData) => IStoreScope<TData>
}



export const storeScope: IScopeCurry2 = curry2(<TData>(parentScope: IParentScope, genesisSeed: TData): IStoreScope<TData> => {
  const key = getStoreKey(parentScope, genesisSeed)
  const currentSeed = getStoredSeedData(key, genesisSeed)

  return {
    key,
    run(sink, scheduler) {
      return currentSeed.run(sink, scheduler)
    },
  }
})


export const replayWriteStoreScope: IWriteScopeCurry3 = curry3(<TData>(parentScope: IParentScope, genesisSeed: TData, writeSource: Stream<TData>): IReplayWriteStoreScope<TData> => {
  const scope = storeScope(parentScope, genesisSeed)
  const write = writeStoreData(scope.key, writeSource)
  const replayWrite = mergeArray([write, scope])

  return {
    ...scope,
    run(sink, scheduler) {
      return replayWrite.run(sink, scheduler)
    }
  }
})



function hashData(data: string) {
  return bytesToHex(sha256(data))
}

