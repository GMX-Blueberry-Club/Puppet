import { continueWith, join, map, multicast } from "@most/core"
import { Stream } from "@most/types"
import * as indexDB from './indexDB.js'
import { IDbParams, openDatabase } from "./indexDB.js"


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

export interface IStoreConfig<TState, TType extends { [P in keyof TState]: TState[P]}> {
  initialState: TType
  options?: IDBObjectStoreParameters
}

export interface IStoreDefinition<T, Type extends { [P in keyof T]: T[P]} = any> extends indexDB.IDbStoreParams, IStoreConfig<T, Type> {
}

export const createStoreDefinition = <T, TDefinition extends { [P in keyof T]: IStoreDefinition<any> }>(
  dbName: string,
  dbVersion: number,
  definitions: TDefinition
): { [P in keyof TDefinition]: IStoreDefinition<TDefinition[P]['initialState']> } => {


  const defs: IDbParams[] = Object.entries(definitions).map(([key, params]: [string, any]): IDbParams => {
    return {
      name: key,
      ...params
    }
  })

  const db = openDatabase(dbName, dbVersion, defs)

  return defs.reduce((acc, next) => {
    return {
      ...acc,
      [next.name]: {
        ...next,
        db,
      }
    }
  }, {} as any)
}



type GetKey<TSchema> = Extract<keyof TSchema, string | number>

export function get<TSchema, TKey extends GetKey<TSchema>, TData extends TSchema[TKey]>(
  params: IStoreDefinition<TSchema>, key: TKey
): Stream<TData> {
  return map(res => {
    return res === undefined
      ? key === undefined ? params.initialState : params.initialState[key]
      : res
  }, indexDB.get(params, key))
}

export function write<TSchema, TKey extends GetKey<TSchema>, TData extends TSchema[TKey]>(
  params: IStoreDefinition<TSchema>, key: TKey, writeEvent: Stream<TData>
): Stream<TData> {
  return join(map(data => {
    return indexDB.set(params, key, data)
  }, writeEvent))
}

export function replayWrite<TSchema, TKey extends GetKey<TSchema>, TReturn extends TSchema[TKey]>(
  params: IStoreDefinition<TSchema>, writeEvent: Stream<TReturn>, key: TKey
): Stream<TReturn> {
  const storedValue = get(params, key)
  const writeSrc = write(params, key, writeEvent)
  return continueWith(() => writeSrc, storedValue)
}


