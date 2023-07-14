import * as GMX from "gmx-middleware-const"
import { rootStoreScope } from "../../rootStore"
import * as store from "../../utils/indexer/rpc"


const scopeConfig = {
  parentScope: rootStoreScope,
} as const

const pricefeedScopeConfig = {
  ...scopeConfig,
  ...GMX.CONTRACT[42161].FastPriceFeed,
} as const

const vaultScopeConfig = {
  ...scopeConfig,
  ...GMX.CONTRACT[42161].Vault,
} as const

export const vaultPriceEvents = store.createRpcLogEventScope({
  eventName: 'PriceData',
  ...pricefeedScopeConfig
})

export const increaseEvents = store.createRpcLogEventScope({
  eventName: 'IncreasePosition',
  ...vaultScopeConfig
})

export const decreaseEvents = store.createRpcLogEventScope({
  ...vaultScopeConfig,
  eventName: 'DecreasePosition',
})

export const closeEvents = store.createRpcLogEventScope({
  ...vaultScopeConfig,
  eventName: 'ClosePosition',
})

export const liquidateEvents = store.createRpcLogEventScope({
  ...vaultScopeConfig,
  eventName: 'LiquidatePosition',
})


export const updateEvents = store.createRpcLogEventScope({
  ...vaultScopeConfig,
  eventName: 'UpdatePosition',
})

