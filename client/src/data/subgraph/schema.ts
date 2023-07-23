// import { IPositionLink, IPositionSettled } from "gmx-middleware-utils"
// import { ISchema } from "../../utils/indexer/subgraph"

// const adjustPosition = {
//   collateralDelta: 'uint256',
//   collateralToken: 'uint256',
//   fee: 'uint256',
//   id: 'uint256',
//   indexToken: 'uint256',
//   isLong: 'bool',
//   key: 'uint256',
//   account: 'uint256',
//   price: 'uint256',
//   sizeDelta: 'uint256',

//   blockNumber: 'int',
//   blockTimestamp: 'uint256',
//   transactionHash: 'uint256',
//   transactionIndex: 'uint256',
//   logIndex: 'uint256',
// } as const

// const increasePosition = { ...adjustPosition, __typename: 'IncreasePosition' }
// const decreasePosition = { ...adjustPosition, __typename: 'DecreasePosition' }

// const positionLink: ISchema<IPositionLink> = {
//   id: 'uint256',
//   account: 'uint256',
//   collateralToken: 'uint256',
//   indexToken: 'uint256',
//   isLong: 'bool',
//   key: 'uint256',
//   updateList: {
//     id: 'uint256',

//     averagePrice: 'uint256',
//     collateral: 'uint256',
//     entryFundingRate: 'uint256',
//     key: 'uint256',
//     realisedPnl: 'uint256',
//     reserveAmount: 'uint256',
//     size: 'uint256',

//     blockNumber: 'int',
//     blockTimestamp: 'uint256',
//     transactionHash: 'uint256',
//     transactionIndex: 'uint256',
//     logIndex: 'uint256',
//     __typename: 'UpdatePosition',
//   },
//   increaseList: increasePosition,
//   decreaseList: decreasePosition,

//   blockNumber: 'int',
//   blockTimestamp: 'uint256',
//   transactionHash: 'uint256',
//   transactionIndex: 'uint256',
//   logIndex: 'uint256',

//   __typename: 'PositionLink',
// }

// const positionSettled: ISchema<IPositionSettled> = {
//   link: positionLink,
//   id: 'string',
//   key: 'uint256',
//   idCount: 'int',

//   account: 'string',
//   collateralToken: 'string',
//   indexToken: 'string',
//   isLong: 'bool',

//   size: 'uint256',
//   collateral: 'uint256',
//   averagePrice: 'uint256',
//   entryFundingRate: 'uint256',
//   reserveAmount: 'uint256',
//   realisedPnl: 'int256',

//   cumulativeSize: 'uint256',
//   cumulativeCollateral: 'uint256',
//   cumulativeFee: 'uint256',

//   maxSize: 'uint256',
//   maxCollateral: 'uint256',

//   settlePrice: 'uint256',
//   isLiquidated: 'bool',

//   blockNumber: 'int',
//   blockTimestamp: 'uint256',
//   transactionHash: 'uint256',
//   transactionIndex: 'uint256',
//   logIndex: 'uint256',

//   __typename: 'PositionSettled',
// }




// export const schema = { positionSettled, positionLink, increasePosition, decreasePosition }



// const processSeed: IPositionSettled = {
//   ...fillQuery(schema.positionSettled)
// }


// // const gmxTradingSubgraph = replaySubgraphQuery(
// //   {
// //     subgraph: `https://gateway-arbitrum.network.thegraph.com/api/${import.meta.env.THE_GRAPH}/subgraphs/id/DJ4SBqiG8A8ytcsNJSuUU2gDTLFXxxPrAN8Aags84JH2`,
// //     parentStoreScope: rootStoreScope,
// //   },
// //   schema.positionSettled,
// //   processSeed
// // )
