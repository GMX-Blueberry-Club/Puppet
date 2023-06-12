import { fromCallback } from '@aelea/core'
import { combine, continueWith, map, switchLatest, take, tap } from "@most/core"
import { Stream } from "@most/types"
import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex } from '@noble/hashes/utils'
import { switchMap } from 'gmx-middleware-utils'



// @ts-ignore
BigInt.prototype.toJSON = function () { return this.toString() + 'n' }
const ES_BIGINT_EXP = /-?\d+n$/



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
      const transaction = db.createObjectStore(dbName, { keyPath: 'id' })

      // transaction.put({ id: 'databaseVersion', www: '222' })
    }



    return () => {
      request.onsuccess = null
      request.onerror = null
    }
  })

  return cb
}

function transact(db: IDBDatabase, id: string, data: any) {
  return fromCallback(cbf => {
    const transaction = db.transaction(db.name, 'readwrite')
    const store = transaction.objectStore(db.name)

    console.log(data)
    const request = store.put({ id, data })
    request.onsuccess = () => cbf(data)
    request.onerror = (err) => console.error(err)

    return () => {
      request.onsuccess = null
    }
  })
}

export function store<TData>(dbEvent: Stream<IDBDatabase>, key: string, write: Stream<TData>): Stream<TData> {
  return switchLatest(map(db => {
    return tap(data => {
      const transaction = db.transaction(db.name, 'readwrite')
      const store = transaction.objectStore(db.name)

      store.put({ id: key, data })
    }, write)
  }, dbEvent))
}

// export function storeReplay<TData>(scope: TScopeNext, write: Stream<TData>): Stream<TData> {
//   const replay: Stream<TData> = take(1, switchLatest(map(db => {
//     return fromCallback(cbf => {
//       const objectStore = db.transaction(scope.key, 'readonly').objectStore(scope.key)
//       const request = objectStore.get(scope.key)
//       request.onsuccess = () => {

//         const result = request.result === undefined ? scope.initalState : request.result.data
//         cbf(result)
//       }

//       return () => {
//         request.onsuccess = null
//       }
//     })
//   }, scope.db)))

//   const doWrite = store(scope, write)

//   return continueWith(() => doWrite, replay)
// }



export interface IScopeConfig<TData> {
  initialState: TData
  db: Stream<IDBDatabase>
  key: string
}

export interface TScopeNext<TData> extends IScopeConfig<TData>, Stream<TData> {
  write: Stream<TData>
}

export function createStoreScope<TData>(parentScope: IScopeConfig<any>, initialState: TData, write: Stream<TData>): TScopeNext<TData> {
  const newKey = hashData(JSON.stringify(initialState))
  const nextKey = hashData(`${parentScope.key}.${newKey}`)

  const startWith: Stream<TData> = take(1, switchLatest(map(db => {
    return fromCallback(cbf => {
      const objectStore = db.transaction(db.name, 'readonly').objectStore(db.name)
      const request = objectStore.get(nextKey)
      request.onsuccess = () => {
        const result = request.result === undefined ? initialState : request.result.data
        cbf(result)
      }

      return () => {
        request.onsuccess = null
      }
    })
  }, parentScope.db)))

  const doWrite = store(parentScope.db, nextKey, write)
  const replay = continueWith(() => doWrite, startWith)


  return {
    run(sink, scheduler) {
      return replay.run(sink, scheduler)
    },
    db: parentScope.db,
    initialState,
    key: nextKey,
    write
  }
}




function hashData(data: string) {
  return bytesToHex(sha256(data))
}

