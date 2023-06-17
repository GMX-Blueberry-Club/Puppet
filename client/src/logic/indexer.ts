import { combineObject, fromCallback } from "@aelea/core"
import { awaitPromises, fromPromise, loop, map, mergeArray, now, switchLatest } from "@most/core"
import { ExtractAbiEvent } from "abitype"
import * as viem from "viem"
import { publicClient } from "../wallet/walletLink"
import { listenContract } from "./common"
import * as database from "./database"
import { switchMap } from "gmx-middleware-utils"
import * as GMX from "gmx-middleware-const"
import * as PUPPET from "puppet-middleware-const"
import { Stream } from "@most/types"

type MaybeExtractEventArgsFromAbi<
  TAbi extends viem.Abi,
  TEventName extends string,
> = TEventName extends string ? viem.GetEventArgs<TAbi, TEventName> : undefined


export type IIndexerFetch<
  TAbi extends viem.Abi,
  TEventName extends string,
  TArgs extends MaybeExtractEventArgsFromAbi<TAbi, TEventName>,
> = {
  address: viem.Address
  eventName: viem.InferEventName<TAbi, TEventName>
  abi: TAbi,
  store: database.IStoreScope<any>
  startBlock?: bigint
} & (MaybeExtractEventArgsFromAbi<
  TAbi,
  TEventName
> extends infer TEventFilterArgs
  ? {
    args?: TEventFilterArgs | (TArgs extends TEventFilterArgs ? TArgs : never)
  }
  : {
    args?: never
  })



export function syncEvent<
  TAbi extends viem.Abi,
  TEventName extends string,
  TArgs extends MaybeExtractEventArgsFromAbi<TAbi, TEventName>,
>(config: IIndexerFetch<TAbi, TEventName, TArgs>): Stream<viem.Log<bigint, number, ExtractAbiEvent<TAbi, TEventName>, true>> {


  const storeParams = {
    abi: config.abi,
    eventName: config.eventName,
    address: config.address,
    args: config.args,
    logHistory: [] as viem.Log[],
    syncedBlock: 0n,
  }
  const store = database.createStoreScope(config.store, storeParams)

  const sss = switchLatest(awaitPromises(map(async params => {
    const history = params.store.logHistory

    const getEventParams = {
      abi: config.abi,
      address: config.address,
      eventName: config.eventName,
      args: config.args,
    }

    const startBlock = !config.startBlock || params.store.syncedBlock > config.startBlock ? params.store.syncedBlock : config.startBlock

    // const newLogsFilter = fromPromise(params.publicClient.getLogs({
    //   address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
    //   event: parseAbiItem('event Transfer(address indexed, address indexed, uint256)'),
    //   args: {
    //     from: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
    //     to: '0xa5cc3c03994db5b0d9a5eedd10cabab0813678ac'
    //   },
    //   fromBlock: 16330000n,
    //   toBlock: 16330050n
    // }))
    // listenContract({
    //   address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
    //   args: {
    //     from: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
    //     to: '0xa5cc3c03994db5b0d9a5eedd10cabab0813678ac'
    //   },
    //   fromBlock: 16330000n,
    //   toBlock: 16330050n
    // })(getEventParams.eventName, {})
    const newLogsFilter = fromPromise(params.publicClient.createContractEventFilter({
      ...getEventParams as any,
      fromBlock: startBlock,
      strict: true,
    }).then(filter => params.publicClient.getFilterLogs({ filter })))

    const latestPendingBlock = fromPromise(params.publicClient.getBlock({ blockTag: 'pending' }))


    const fullSyncedLog = switchMap(syncParams => {
      const latestPendingBlockNumber = syncParams.latestPendingBlock.number || 1n
      const logs = [...history, ...syncParams.newLogsFilter]
      const data = { logHistory: logs, syncedBlock: latestPendingBlockNumber - 1n }

      const storedLogs = database.transact(syncParams.db, storeObj => storeObj.put({ id: store.key, data }))

      return switchMap(storeKey => mergeArray(syncParams.newLogsFilter.map(x => now(x))), storedLogs)
    }, combineObject({ db: store.db, newLogsFilter, latestPendingBlock }))


    // publicClient.watchContractEvent({
    //   address: '0xFBA3912Ca04dd458c843e2EE08967fC04f3579c2',
    //   abi: wagmiAbi,
    //   eventName: 'Transfer',
    //   args: { from: '0xc961145a54C96E3aE9bAA048c4F4D6b04C13916b' },
    //   onLogs: logs => console.log(logs)
    // })



    const newEvent: Stream<viem.Log> = fromCallback(emitCb => {
      console.log(getEventParams)

      const listener = params.publicClient.watchContractEvent<TAbi, TEventName>({
        ...getEventParams,
        onLogs: (logs: any) => {
          for (const key in logs) {
            if (Object.prototype.hasOwnProperty.call(logs, key)) {
              emitCb(logs[key])
            }
          }
        }
      } as any)

      return listener
    })



    // const eventStream = listenContract({ ...getEventParams })(getEventParams.eventName, getEventParams.args as any)

    const syncNewEvents = loop((seed, syncParams) => {
      const logs = [...seed, ...syncParams.newLogsFilter]
      const latestPendingBlockNumber = syncParams.latestPendingBlock.number || 1n

      const syncedBlock = latestPendingBlockNumber > params.store.syncedBlock ? latestPendingBlockNumber - 1n : params.store.syncedBlock
      const logHistory = [...logs, syncParams.newEvent]

      const value = { syncedBlock, logHistory }

      return { seed: logHistory, value }
    }, history, combineObject({ newEvent, newLogsFilter, latestPendingBlock }))


    const storedNewEvents = map(ev => ev.logHistory[ev.logHistory.length - 1], database.streamSaveStore(store.db, store.key, syncNewEvents))



    return mergeArray([
      mergeArray(history.map(x => now(x))),
      fullSyncedLog,
      storedNewEvents
    ])
  }, combineObject({ publicClient, store }))))


  return sss
}
