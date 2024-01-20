// import * as GMX from "gmx-middleware-const"
// import { rootStoreScope } from "../store/store.js"
// import * as store from "../../utils/indexer/rpc.js"


// const config = {
//   parentScope: rootStoreScope,
// } as const

// const pricefeedConfig = {
//   ...config,
//   ...GMX.CONTRACT[42161].FastPriceFeed,
// } as const

// const vaultConfig = {
//   ...config,
//   ...GMX.CONTRACT[42161].Vault,
// } as const



// // export const vaultPriceEvents = store.createRpcLogEventScope({
// //   eventName: 'PriceData',
// //   ...pricefeedConfig
// // })

// // export const increaseEvents = store.createRpcLogEventScope({
// //   eventName: 'IncreasePosition',
// //   ...vaultConfig
// // })

// // export const decreaseEvents = store.createRpcLogEventScope({
// //   ...vaultConfig,
// //   eventName: 'DecreasePosition',
// // })

// // export const closeEvents = store.createRpcLogEventScope({
// //   ...vaultConfig,
// //   eventName: 'ClosePosition',
// // })

// // export const liquidateEvents = store.createRpcLogEventScope({
// //   ...vaultConfig,
// //   eventName: 'LiquidatePosition',
// // })

// // export const updateEvents = store.createRpcLogEventScope({
// //   ...vaultConfig,
// //   eventName: 'UpdatePosition',
// // })

// export const requestIncreasePosition = store.createRpcLogEventScope({
//   ...config,
//   ...GMX.CONTRACT[42161].PositionRouter,
//   startBlock: 148112385n,
//   eventName: 'CreateIncreasePosition',
// })

// // export const requestDecreasePosition = store.createRpcLogEventScope({
// //   ...positionRouterConfig,
// //   eventName: 'CreateDecreasePosition',
// // })

// // export const executeIncreasePosition = store.createRpcLogEventScope({
// //   ...positionRouterConfig,
// //   eventName: 'ExecuteIncreasePosition',
// // })

// // export const executeDecreasePosition = store.createRpcLogEventScope({
// //   ...positionRouterConfig,
// //   eventName: 'ExecuteDecreasePosition',
// // })



// export const marketCreated = store.createRpcLogEventScope({
//   ...config,
//   ...GMX.CONTRACT[42161].EventEmitter,
//   eventName: 'EventLog1',
//   args: {
//     eventNameHash: GMX.MarketEvent.MarketCreated
//   }
// })

// // export const positionFeeInfo = store.createRpcLogEventScope({
// //   ...config,
// //   ...GMX.CONTRACT[42161].EventEmitter,
// //   eventName: 'EventLog1',
// //   startBlock: 120000000n,
// //   args: {
// //     eventNameHash: GMX.PositionEvent.PositionFeesInfo
// //   }
// // })

// export const positionFeeInfo = store.createRpcLogEventScope({
//   ...config,
//   ...GMX.CONTRACT[42161].EventEmitter,
//   eventName: 'EventLog1',
//   startBlock: 148112385n,
//   args: {
//     eventNameHash: GMX.PositionEvent.PositionFeesCollected
//   }
// })


// export const oraclePrice = store.createRpcLogEventScope({
//   ...config,
//   ...GMX.CONTRACT[42161].EventEmitter,
//   eventName: 'EventLog1',
//   startBlock: 148112385n,
//   args: {
//     eventNameHash: GMX.OracleEvent.OraclePriceUpdate
//   }
// })

// export const positionIncrease = store.createRpcLogEventScope({
//   ...config,
//   ...GMX.CONTRACT[42161].EventEmitter,
//   eventName: 'EventLog1',
//   startBlock: 148112385n,
//   args: {
//     eventNameHash: GMX.PositionEvent.PositionIncrease
//   }
// })

// export const positionDecrease = store.createRpcLogEventScope({
//   ...config,
//   ...GMX.CONTRACT[42161].EventEmitter,
//   eventName: 'EventLog1',
//   startBlock: 148112385n,
//   args: {
//     eventNameHash: GMX.PositionEvent.PositionDecrease
//   }
// })

