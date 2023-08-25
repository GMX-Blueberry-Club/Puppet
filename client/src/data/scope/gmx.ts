import * as GMX from "gmx-middleware-const"
import { rootStoreScope } from "../store/store"
import * as store from "../../utils/indexer/rpc"


const config = {
  parentScope: rootStoreScope,
} as const

const pricefeedConfig = {
  ...config,
  ...GMX.CONTRACT[42161].FastPriceFeed,
} as const

const vaultConfig = {
  ...config,
  ...GMX.CONTRACT[42161].Vault,
} as const

const positionRouterConfig = {
  ...config,
  ...GMX.CONTRACT[42161].PositionRouter,
} as const

export const vaultPriceEvents = store.createRpcLogEventScope({
  eventName: 'PriceData',
  ...pricefeedConfig
})

export const increaseEvents = store.createRpcLogEventScope({
  eventName: 'IncreasePosition',
  ...vaultConfig
})

export const decreaseEvents = store.createRpcLogEventScope({
  ...vaultConfig,
  eventName: 'DecreasePosition',
})

export const closeEvents = store.createRpcLogEventScope({
  ...vaultConfig,
  eventName: 'ClosePosition',
})

export const liquidateEvents = store.createRpcLogEventScope({
  ...vaultConfig,
  eventName: 'LiquidatePosition',
})

export const updateEvents = store.createRpcLogEventScope({
  ...vaultConfig,
  eventName: 'UpdatePosition',
})

export const requestIncreasePosition = store.createRpcLogEventScope({
  ...positionRouterConfig,
  eventName: 'CreateIncreasePosition',
})

export const requestDecreasePosition = store.createRpcLogEventScope({
  ...positionRouterConfig,
  eventName: 'CreateDecreasePosition',
})

export const executeIncreasePosition = store.createRpcLogEventScope({
  ...positionRouterConfig,
  eventName: 'ExecuteIncreasePosition',
})

export const executeDecreasePosition = store.createRpcLogEventScope({
  ...positionRouterConfig,
  eventName: 'ExecuteDecreasePosition',
})


export const V2eventLog1 = store.createRpcLogEventScope({
  ...config,
  ...GMX.CONTRACT[42161].EventEmitter,
  eventName: 'EventLog1',
})

