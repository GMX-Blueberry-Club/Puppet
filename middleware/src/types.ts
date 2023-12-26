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
  positionKey: viem.Hex
}

export interface IMirrorPositionLink extends ILogTypeId<'MirrorPositionLink'> {
  shareIncreaseList: ISharesIncrease[]
  executeList: IExecutePosition[]
}


export interface IPositionMirror<TypeName extends 'MirrorPositionOpen' | 'MirrorPositionSettled' = 'MirrorPositionOpen' | 'MirrorPositionSettled'> extends ILogTxType<TypeName> {
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

export interface IPositionMirrorOpen extends IPositionMirror<'MirrorPositionOpen'> { }
export interface IPositionMirrorSettled extends IPositionMirror<'MirrorPositionSettled'> {}

export interface IMirrorPositionListSummary extends IPositionListSummary {
  // routeTypeKey?: viem.Hex
  puppets: viem.Address[]
  // account: viem.Address
  // tradeList: (IPositionMirrorSlot | IPositionMirrorSettled)[]
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


