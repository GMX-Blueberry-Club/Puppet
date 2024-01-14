import { awaitPromises, continueWith, debounce, join, map, merge, multicast, now } from "@most/core"
import { Stream } from "@most/types"
import * as indexDB from './indexDB.js'
import { openDatabase } from "./indexDB.js"
import { switchMap } from "gmx-middleware-utils"


// stringify with bigint support
export function jsonStringify(obj: any) {
  return JSON.stringify(obj, (_, v) => typeof v === 'bigint' ? v.toString() + 'n' : v)
}

const BIG_INT_STR = /^(?:[-+])?\d+n$/
export function transformBigints(obj: any) {
  for (const k in obj) {
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      transformBigints(obj[k])
    } else if (typeof obj[k] === 'string' && BIG_INT_STR.test(obj[k])) {
      obj[k] = BigInt(obj[k].slice(0, -1))
    }
  }
  return obj
}


export const createStoreDefinition = <T, TDefinition extends { [P in keyof T]: indexDB.IStoreDefinition<any> }>(
  dbName: string,
  dbVersion: number,
  definitions: TDefinition
): { [P in keyof TDefinition]: indexDB.IStoreDefinition<TDefinition[P]['initialState']> } => {


  const defs: indexDB.IDbParams[] = Object.entries(definitions).map(([key, params]: [string, any]): indexDB.IDbParams => {
    return {
      name: key,
      ...params
    }
  })

  const dbQuery = openDatabase(dbName, dbVersion, defs)

  return defs.reduce((acc, next) => {
    return {
      ...acc,
      [next.name]: {
        ...next,
        dbQuery,
      }
    }
  }, {} as any)
}



export function write<TSchema, TKey extends indexDB.GetKey<TSchema>, TData extends TSchema[TKey]>(
  params: indexDB.IStoreDefinition<TSchema>, key: TKey, writeEvent: Stream<TData>
): Stream<TData> {
  const debouncedWrite = debounce(100, writeEvent)
  return map(data => {
    indexDB.set(params, key, data)
    return data
  }, debouncedWrite)
}

export function replayWrite<TSchema, TKey extends indexDB.GetKey<TSchema>, TReturn extends TSchema[TKey]>(
  params: indexDB.IStoreDefinition<TSchema>, writeEvent: Stream<TReturn>, key: TKey
): Stream<TReturn> {
  const storedValue = switchMap(() => indexDB.get(params, key), now(null))
  const writeSrc = write(params, key, writeEvent)

  return merge(storedValue, writeSrc)
  // return continueWith(() => writeSrc, storedValue)
}


