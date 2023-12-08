import { continueWith, join, map, multicast } from "@most/core"
import { Stream } from "@most/types"
import * as indexDB from './indexDB.js'
import { replayLatest } from "@aelea/core"


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


export interface IStoreScope<TName extends string, TOptions extends indexDB.IDbStoreConfig> extends indexDB.IDbParams<TName, TOptions> {}
export interface IStoreconfig<TName extends string> {
  name: TName
}

export const createStoreScope = <TParentName extends string, TName extends string, TOptions extends indexDB.IDbStoreConfig>(
  parentScope: IStoreconfig<TParentName>, storeName: TName, options?: TOptions,
): IStoreScope<`${TParentName}.${TName}`, TOptions> => {
  const name = `${parentScope.name as TParentName}.${storeName}` as const
  const dbParams = indexDB.openDb(name, options)


  return { ...dbParams, name }
}

export function get<TData, TKey extends string, TName extends string, TOptions extends indexDB.IDbStoreConfig>(
  scope: IStoreScope<TName, TOptions>, seed: TData, key: TKey | IStoreScope<TName, TOptions>['name'] = scope.name
): Stream<TData> {
  return map(res => {
    return res === undefined ? seed : res
  }, indexDB.get(scope, key))
}

export function write<TData, TKey extends string, TName extends string, TOptions extends indexDB.IDbStoreConfig>(
  scope: IStoreScope<TName, TOptions>, writeEvent: Stream<TData>, key: TKey | IStoreScope<TName, TOptions>['name'] = scope.name
): Stream<TData> {
  return join(map(data => indexDB.set(scope, data, key), writeEvent))
}

export function replayWrite<TData, TKey extends string, TName extends string, TOptions extends indexDB.IDbStoreConfig>(
  scope: IStoreScope<TName, TOptions>, seed: TData, writeEvent: Stream<TData>, key: TKey | IStoreScope<TName, TOptions>['name'] = scope.name
): Stream<TData> {
  const storedValue = get(scope, seed, key)
  return continueWith(() => write(scope, writeEvent, key), storedValue)
}



