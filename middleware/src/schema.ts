import { schema as gmxSchema, ISchema } from "gmx-middleware-utils"
import { IExecutePosition, IMirrorPositionLink, IPositionMirrorOpen, IPositionMirrorSettled, ISharesIncrease } from "./types.js"


const executePosition: ISchema<Omit<IExecutePosition, 'link'>> = {
  id: 'string',

  performanceFeePaid: 'uint',
  route: 'string',
  requestKey: 'string',
  isExecuted: 'bool',
  isIncrease: 'bool',

  blockTimestamp: 'uint',
  transactionHash: 'string',

  __typename: 'ExecutePosition',
}

const sharesIncrease: ISchema<Omit<ISharesIncrease, 'link'>> = {
  id: 'string',

  puppetsShares: 'uint[]',
  traderShares: 'uint',
  totalSupply: 'uint',

  positionKey: 'string',

  blockTimestamp: 'uint',
  transactionHash: 'string',

  __typename: 'SharesIncrease',
}


const mirrorPositionLink: ISchema<IMirrorPositionLink> = {
  id: 'string',
  shareIncreaseList: sharesIncrease,
  executeList: executePosition,

  __typename: 'MirrorPositionLink',
}
const mirrorPositionOpen: ISchema<IPositionMirrorOpen> = {
  id: 'string',
  link: mirrorPositionLink,

  position: gmxSchema.positionOpen,

  trader: 'string',
  tradeRoute: 'string',
  puppets: `address[]`,
  puppetsShares: 'uint[]',
  traderShares: 'uint',
  totalSupply: 'uint',

  routeTypeKey: 'string',
  tradeRouteKey: 'string',

  blockTimestamp: 'uint',
  transactionHash: 'string',

  __typename: 'MirrorPositionOpen',
}

const mirrorPositionSettled: ISchema<IPositionMirrorSettled> = {
  id: 'string',
  link: mirrorPositionLink,

  position: gmxSchema.positionSettled,

  trader: 'string',
  tradeRoute: 'string',
  puppets: `address[]`,
  puppetsShares: 'uint[]',
  traderShares: 'uint',
  totalSupply: 'uint',

  routeTypeKey: 'string',
  tradeRouteKey: 'string',

  blockTimestamp: 'uint',
  transactionHash: 'string',

  __typename: 'MirrorPositionSettled',
}





export const schema = { 
  mirrorPositionOpen,
  executePosition,
  sharesIncrease,
  mirrorPositionLink,
  mirrorPositionSettled
}

