import { continueWith, map } from "@most/core"
import { curry3 } from '@most/prelude'
import { Stream } from "@most/types"
import * as indexDB from './indexDB'


// @ts-ignore
BigInt.prototype.toJSON = function () { return this.toString() + 'n' }


export interface IDBObjectStoreParameters<TKeyPath extends string | string[] | null = string | string[] | null> {
  autoIncrement?: boolean;
  keyPath?: TKeyPath;
}


export interface IStoreScope<TName extends string = string, TOptions extends IDBObjectStoreParameters | undefined = undefined> extends indexDB.IDbParams<TName, TOptions> {}
export interface IStoreconfig<TName extends string = string> {
  name: TName
}


export interface ICreateScopeCurry2 {
  <TData, TName extends string, TParentName extends string>(key: TName, genesisSeed: TData): IStoreScope<`${TParentName}.${TName}`>
  <TData, TName extends string, TParentName extends string>(key: TName): (genesisSeed: TData) => IStoreScope<`${TParentName}.${TName}`>
}

export interface ICreateScopeCurry3 {
  <TData, TName extends string, TParentName extends string>(parentScope: IStoreScope<TParentName>, key: TName, genesisSeed: TData): IStoreScope<`${TParentName}.${TName}`>
  <TData, TName extends string, TParentName extends string>(parentScope: IStoreScope<TParentName>, key: TName): (genesisSeed: TData) => IStoreScope<`${TParentName}.${TName}`>
  <TParentName extends string>(parentScope: IStoreScope<TParentName>): ICreateScopeCurry2
}



export const createStoreScope = <TParentName extends string, TName extends string, TOptions extends IDBObjectStoreParameters>(
  parentScope: IStoreconfig<TParentName>, newName: TName, options?: TOptions,
): IStoreScope<`${TParentName}.${TName}`, TOptions> => {
  const name = `${parentScope.name as TParentName}.${newName}` as const
  const dbParams = indexDB.openDb(name, options)


  return { ...dbParams }
}



export function read<TData, TKey extends string, TName extends string, TOptions extends IDBObjectStoreParameters | undefined = undefined>(
  scope: IStoreScope<TName, TOptions>, key: TKey, genesisSeed: TData
): Stream<TData> {
  return map(res => {
    return res === undefined ? genesisSeed : res
  }, indexDB.read(scope, key))
}

export function replayWrite<TData, TKey extends string, TName extends string, TOptions extends IDBObjectStoreParameters | undefined = undefined>(
  scope: IStoreScope<TName, TOptions>, key: TKey, genesisSeed: TData, write: Stream<TData>
): Stream<TData> {
  const storedValue = read(scope, key, genesisSeed)
  return continueWith(() => indexDB.put(scope, key, write), storedValue)
}



