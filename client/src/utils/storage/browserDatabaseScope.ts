import { continueWith, map } from "@most/core"
import { curry3 } from '@most/prelude'
import { Stream } from "@most/types"
import * as indexDB from '../storage/indexDB'


// @ts-ignore
BigInt.prototype.toJSON = function () { return this.toString() + 'n' }



export interface IStoreScopeConfig<TName extends string = string> {
  dbParams: indexDB.IDbParams
  key: TName
}

export interface IStoreScope<TData, TName extends string = string> extends IStoreScopeConfig<TName>, Stream<TData> {}

export interface ICreateScopeCurry2 {
  <TData, TName extends string, TParentName extends string>(key: TName, genesisSeed: TData): IStoreScope<TData, `${TParentName}.${TName}`>
  <TData, TName extends string, TParentName extends string>(key: TName): (genesisSeed: TData) => IStoreScope<TData, `${TParentName}.${TName}`>
}

export interface ICreateScopeCurry3 {
  <TData, TName extends string, TParentName extends string>(parentScope: IStoreScopeConfig<TParentName>, key: TName, genesisSeed: TData): IStoreScope<TData, `${TParentName}.${TName}`>
  <TData, TName extends string, TParentName extends string>(parentScope: IStoreScopeConfig<TParentName>, key: TName): (genesisSeed: TData) => IStoreScope<TData, `${TParentName}.${TName}`>
  <TParentName extends string>(parentScope: IStoreScopeConfig<TParentName>): ICreateScopeCurry2
}



export const createStoreScope: ICreateScopeCurry3 = curry3(<TParentName extends string, TData, TName extends string>(
  parentScope: IStoreScopeConfig<TParentName>,
  newKey: TName,
  genesisSeed: TData,
): IStoreScope<TData, `${TParentName}.${TName}`> => {
  const key = `${parentScope.key}.${newKey}` as const
  const storedData = map(res => res === null ? genesisSeed : res, indexDB.get<TData, string, string>(parentScope.dbParams, key))

  return {
    ...parentScope,
    key,
    run(sink, scheduler) {
      return storedData.run(sink, scheduler)
    },
  }
})

export const createReplayWriteStoreScope = <TData, TName extends string, TParentName extends string>(
  parentScope: IStoreScopeConfig<TParentName>, 
  newKey: TName,
  genesisSeed: TData,
  writeSource: Stream<TData>
): Stream<TData> => {
  return replayWrite(createStoreScope(parentScope, newKey, genesisSeed), writeSource)
}

export function replayWrite<TData, TName extends string>(scope: IStoreScope<TData, TName>, write: Stream<TData>): Stream<TData> {
  return continueWith(() => indexDB.write(scope.dbParams, write), scope)
}



