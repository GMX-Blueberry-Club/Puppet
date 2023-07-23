import { concatMap, constant, continueWith, join, map, throttle } from "@most/core"
import { Stream } from "@most/types"
import * as indexDB from './indexDB'
import { switchMap } from "gmx-middleware-utils"
import { combineArray, combineObject } from "@aelea/core"


// @ts-ignore
BigInt.prototype.toJSON = function () { return this.toString() + 'n' }


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

export function replayWrite<TData, TKey extends string, TName extends string, TOptions extends indexDB.IDbStoreConfig>(
  scope: IStoreScope<TName, TOptions>, seed: TData, write: Stream<TData>, key: TKey | IStoreScope<TName, TOptions>['name'] = scope.name
): Stream<TData> {
  const storedValue = get(scope, seed, key)
  return continueWith(() => {
    
    return join(map(data => indexDB.set(scope, data, key), write))
  }, storedValue)
}



