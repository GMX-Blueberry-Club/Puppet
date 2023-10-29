import * as PUPPET from "puppet-middleware-const"
import { rootStoreScope } from "../store/store.js"
import * as store from "../../utils/indexer/rpc.js"


const config = {
  parentScope: rootStoreScope,
} as const

const orchestratorConfig = {
  ...config,
  ...PUPPET.CONTRACT[42161].Orchestrator,
} as const

const routeConfig = {
  ...config,
  ...PUPPET.CONTRACT[42161].Route,
} as const



export const openPosition = store.createRpcLogEventScope({
  eventName: 'OpenPosition',
  ...orchestratorConfig
})

export const adjustPosition = store.createRpcLogEventScope({
  eventName: 'AdjustPosition',
  ...orchestratorConfig
})

export const executePosition = store.createRpcLogEventScope({
  eventName: 'ExecutePosition',
  ...orchestratorConfig
})

export const liquidatePosition = store.createRpcLogEventScope({
  eventName: 'LiquidatePosition',
  ...orchestratorConfig
})

export const adjustTargetLeverage = store.createRpcLogEventScope({
  eventName: 'AdjustTargetLeverage',
  ...orchestratorConfig
})

export const createRoute = store.createRpcLogEventScope({
  eventName: 'AdjustPosition',
  ...orchestratorConfig
})

export const subscribeRoute = store.createRpcLogEventScope({
  eventName: 'SubscribeRoute',
  ...orchestratorConfig
})



export const deposit = store.createRpcLogEventScope({
  eventName: 'Deposit',
  ...orchestratorConfig
})

export const withdraw = store.createRpcLogEventScope({
  eventName: 'Withdraw',
  ...orchestratorConfig
})

export const shareIncrease = store.createRpcLogEventScope({
  eventName: 'SharesIncrease',
  ...orchestratorConfig
})




