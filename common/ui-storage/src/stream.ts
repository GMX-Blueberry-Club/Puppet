import { awaitPromises, continueWith, debounce, map, now } from "@most/core"
import { Stream } from "@most/types"
import * as indexDB from './storage.js'
import { openDatabase } from "./storage.js"


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
  const storedValue = awaitPromises(map(() => indexDB.get(params, key), now(null)))
  const writeSrc = write(params, key, writeEvent)
  
  return continueWith(() => writeSrc, storedValue)
}


