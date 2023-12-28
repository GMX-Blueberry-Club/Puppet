import { schema as gmxSchema, ISchema } from "gmx-middleware-utils"
import { IExecutePosition, IMirrorPositionLink, IMirrorPositionOpen, IMirrorPositionSettled, IPuppetPositionOpen, IPuppetPositionSettled, IPuppetTradeRoute, ISharesIncrease, ISubscribeTradeRoute } from "./types.js"


const executePosition: ISchema<Omit<IExecutePosition, 'link'>> = {
  id: 'string',

  performanceFeePaid: 'uint',
  route: 'address',
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
const mirrorPositionOpen: ISchema<IMirrorPositionOpen> = {
  id: 'string',
  link: mirrorPositionLink,

  position: gmxSchema.positionOpen,

  trader: 'address',
  tradeRoute: 'address',
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

const mirrorPositionSettled: ISchema<IMirrorPositionSettled> = {
  id: 'string',
  link: mirrorPositionLink,

  position: gmxSchema.positionSettled,

  trader: 'address',
  tradeRoute: 'address',
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

const puppetPositionOpen: ISchema<Omit<IPuppetPositionOpen, 'puppetTradeRoute'>> = {
  id: 'string',
  position: mirrorPositionOpen,
  // puppetTradeRoute: puppetTradeRoute,

  blockTimestamp: 'uint',
  transactionHash: 'string',

  __typename: 'PuppetPositionOpen',
}

const puppetPositionSettled: ISchema<Omit<IPuppetPositionSettled, 'puppetTradeRoute'>> = {
  id: 'string',
  position: mirrorPositionOpen,
  // puppetTradeRoute: puppetTradeRoute,

  blockTimestamp: 'uint',
  transactionHash: 'string',

  __typename: 'PuppetPositionSettled',
}

const subscribeTradeRoute: ISchema<Omit<ISubscribeTradeRoute, 'puppetTradeRoute'>> = {
  id: 'string',

  allowance: 'uint',
  subscriptionExpiry: 'uint',
  trader: 'address',
  puppet: 'address',
  route: 'address',
  routeTypeKey: 'string',
  subscribe: 'bool',


  blockTimestamp: 'uint',
  transactionHash: 'string',

  __typename: 'SubscribeTradeRoute',
}

const puppetTradeRoute: ISchema<IPuppetTradeRoute> = {
  id: 'string',
  routeTypeKey: 'string',
  puppet: 'address',
  trader: 'address',

  puppetPositionSettledList: puppetPositionSettled,
  puppetPositionOpenList: puppetPositionOpen,
  subscriptionList: subscribeTradeRoute,

  __typename: 'PuppetTradeRoute',
}





export const schema = { 
  mirrorPositionOpen,
  executePosition,
  sharesIncrease,
  mirrorPositionLink, mirrorPositionSettled,

  puppetTradeRoute, puppetPositionSettled, puppetPositionOpen,

  subscribeTradeRoute
}

