import { continueWith, map } from "@most/core"
import { Stream } from "@most/types"
import * as indexDB from './indexDB'


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


  return { ...dbParams }
}

export function get<TData, TKey extends string, TName extends string, TOptions extends indexDB.IDbStoreConfig>(
  scope: IStoreScope<TName, TOptions>, key: TKey, genesisSeed: TData
): Stream<TData> {
  return map(res => {
    return res === undefined ? genesisSeed : res
  }, indexDB.get(scope, key))
}

export function replayWrite<TData, TKey extends string, TName extends string, TOptions extends indexDB.IDbStoreConfig>(
  scope: IStoreScope<TName, TOptions>, key: TKey, genesisSeed: TData, write: Stream<TData>
): Stream<TData> {
  const storedValue = get(scope, key, genesisSeed)
  return continueWith(() => indexDB.set(scope, key, write), storedValue)
}



