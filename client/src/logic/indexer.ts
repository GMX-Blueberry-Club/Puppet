import { fromPromise, map } from "@most/core"
import { publicClient } from "../wallet/walletLink"
import { IStoreConfig, IStoreScope } from "./database"
import * as viem from "viem"
import { ExtractAbiEvent } from "abitype"
import { listenContract } from "./common"



export interface IIndexerFetch<
  TAbi extends viem.Abi,
  TEventName extends string,

> {
  address: viem.Address
  eventName: viem.InferEventName<TAbi, TEventName>
  abi: TAbi,
  store: IStoreScope<any>
  startBlock?: bigint
}



export function syncEvent<
  TAbi extends viem.Abi,
  TEventName extends string,
  >(config: IIndexerFetch<TAbi, TEventName>) {
  

  const store = config.store.scope({
    logList: [] as viem.Log<bigint, number, ExtractAbiEvent<TAbi, TEventName>, true>[],
    syncedBlock: 0
  })


  map(async client => {

    const getEventParams = {
      abi: config.abi,
      address: config.address,
      eventName: config.eventName,
      strict: true,
    }

    const startBlock = config.startBlock

    const filter = await client.createContractEventFilter({ ...getEventParams, fromblock: startBlock } as any)

    const logs = await client.getFilterLogs({
      filter
    })

    const newEvents = listenContract({
      ...getEventParams
    })(getEventParams.eventName)


    const events = store(newEvents)






  }, publicClient)




  return {
    store
  }
}
