import { combineObject } from "@aelea/core"
import { awaitPromises, map, mergeArray, now, switchLatest } from "@most/core"
import { ExtractAbiEvent } from "abitype"
import * as viem from "viem"
import { publicClient } from "../wallet/walletLink"
import { listenContract } from "./common"
import * as database from "./database"
import { switchMap } from "gmx-middleware-utils"



export interface IIndexerFetch<
  TAbi extends viem.Abi,
  TEventName extends string,

> {
  address: viem.Address
  eventName: viem.InferEventName<TAbi, TEventName>
  abi: TAbi,
  store: database.IStoreScope<any>
  startBlock?: bigint
}



export function syncEvent<
  TAbi extends viem.Abi,
  TEventName extends string,
>(config: IIndexerFetch<TAbi, TEventName>) {


  const store = database.createStoreScope(config.store, {
    logHistory: [] as viem.Log<bigint, number, ExtractAbiEvent<TAbi, TEventName>, true>[],
    syncedBlock: 0n
  })

  const sss = switchLatest(awaitPromises(map(async params => {
    const history = params.store.logHistory

    const getEventParams = {
      abi: config.abi,
      address: config.address,
      eventName: config.eventName,
      // strict: true,
    }

    const startBlock = !config.startBlock || params.store.syncedBlock > config.startBlock ? params.store.syncedBlock : config.startBlock

    const filter = await params.publicClient.createContractEventFilter({
      abi: getEventParams.abi,
      address: getEventParams.address,
      fromBlock: startBlock,
      eventName: getEventParams.eventName as any,
    })

    const [newLogs, latestPendingBlock] = await Promise.all([
      params.publicClient.getFilterLogs({ filter }),
      params.publicClient.getBlock({ blockTag: 'pending' }),
    ])

    const logs: viem.Log[] = [...history, ...newLogs]

    const newEvents = listenContract({ ...getEventParams })(getEventParams.eventName)

    const fullSyncedLog = switchMap(syncParams => {
      const data = { logHistory: logs, syncedBlock: BigInt(latestPendingBlock.number || 1n) - 1n }

      const storedLogs = database.transact(syncParams.db, storeObj => storeObj.put({ id: store.key, data }))

      return switchMap(storeKey => mergeArray(logs.map(x => now(x))), storedLogs)
    }, combineObject({ db: store.db }))

    const syncNewEvents = map(event => {
      const lst = logs[logs.length - 1]

      const syncedBlock = lst.blockNumber && lst.blockNumber > params.store.syncedBlock ? lst.blockNumber - 1n : params.store.syncedBlock
      const logHistory = [...logs, event]

      return { syncedBlock, logHistory }
    }, newEvents)


    const storedNewEvents = map(ev => ev.logHistory[ev.logHistory.length - 1], database.streamSaveStore(store.db, store.key, syncNewEvents))



    return mergeArray([
      fullSyncedLog,
      storedNewEvents
    ])
  }, combineObject({ publicClient, store }))))


  return sss
}
