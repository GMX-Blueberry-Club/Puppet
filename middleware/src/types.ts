import { ILogTxType, ILogTypeId, IPosition, IPositionLink, IPositionListSummary, IPositionSettled } from "gmx-middleware-utils"
import * as viem from "viem"



export interface IMirrorPositionRequest {
  puppets: readonly viem.Address[]
  trader: viem.Address
  route: viem.Address
  routeTypeKey: viem.Hex
  positionKey: viem.Hex
  isIncrease: boolean;
  requestKey: viem.Hex
}



export interface IExecutePosition extends ILogTxType<'ExecutePosition'> {
  link: IMirrorPositionLink
  performanceFeePaid: bigint
  route: viem.Address
  requestKey: viem.Hex
  isExecuted: boolean
  isIncrease: boolean
}

export interface ISharesIncrease extends ILogTxType<'SharesIncrease'> {
  link: IMirrorPositionLink
  puppetsShares: bigint[]
  traderShares: bigint
  totalSupply: bigint
  route: viem.Address
  requestKey: viem.Hex
}

export interface IMirrorPositionLink extends ILogTypeId<'MirrorPositionLink'> {
  shareIncreaseList: ISharesIncrease[]
}


export interface IMirrorPosition<TypeName extends 'MirrorPositionOpen' | 'MirrorPositionSettled' = 'MirrorPositionOpen' | 'MirrorPositionSettled'> extends ILogTxType<TypeName> {
  link: IMirrorPositionLink
  position: IPosition<TypeName extends 'MirrorPositionOpen' ? 'PositionOpen' : 'PositionSettled'>

  trader: viem.Address
  tradeRoute: viem.Address
  puppets: viem.Address[]

  puppetsShares: bigint[]
  traderShares: bigint
  totalSupply: bigint

  routeTypeKey: viem.Hex
  tradeRouteKey: viem.Hex
}

export interface IMirrorPositionOpen extends IMirrorPosition<'MirrorPositionOpen'> { }
export interface IMirrorPositionSettled extends IMirrorPosition<'MirrorPositionSettled'> {}

export interface ISubscribeTradeRoute extends ILogTxType<'SubscribeTradeRoute'> {
  puppetTradeRoute: IPuppetTradeRoute
  allowance: bigint
  subscriptionExpiry: bigint
  trader: viem.Address
  puppet: viem.Address
  route: viem.Address
  routeTypeKey: viem.Hex
  subscribe: boolean
}

export interface IPuppetPositionOpen extends ILogTxType<'PuppetPositionOpen'> {
  position: IMirrorPositionOpen
  puppetTradeRoute: IPuppetTradeRoute
}

export interface IPuppetPositionSettled extends ILogTxType<'PuppetPositionSettled'> {
  position: IMirrorPositionSettled
  puppetTradeRoute: IPuppetTradeRoute
}

export interface IPuppetTradeRoute extends ILogTypeId<'PuppetTradeRoute'> {
  routeTypeKey: viem.Hex
  puppet: viem.Address
  trader: viem.Address

  puppetPositionSettledList: IPuppetPositionSettled[]
  puppetPositionOpenList: IPuppetPositionOpen[]
  subscriptionList: ISubscribeTradeRoute[]
}

export interface IMirrorPositionListSummary extends IPositionListSummary {
  // routeTypeKey?: viem.Hex
  puppets: viem.Address[]
  // account: viem.Address
  // tradeList: (IPositionMirrorSlot | IPositionMirrorSettled)[]
}

export interface ISetRouteType extends ILogTypeId<'SetRouteType'> {
  routeTypeKey: viem.Hex
  collateral: viem.Address
  index: viem.Address
  isLong: boolean
  // data: viem.Hex
}


export type IPuppetSubscritpionParams = {
  subscribe: boolean
  allowance: bigint
  subscriptionExpiry: bigint
  routeTypeKey: viem.Hex
  trader: viem.Address
}

export type IPuppetSubscritpion = IPuppetSubscritpionParams & {
  puppet: viem.Address
  puppetSubscriptionKey: viem.Hex
}


export type IAccountToRouteMap<T> = Record<viem.Address, Record<viem.Hex, T>>


