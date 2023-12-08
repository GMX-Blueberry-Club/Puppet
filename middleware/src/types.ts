import { IPosition, IPositionDecrease, IPositionListSummary, IPositionSettled } from "gmx-middleware-utils"
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

export interface IPositionMirror<TypeName extends 'PositionSlot' | 'PositionSettled'> extends IPosition<TypeName> {
  puppets: readonly viem.Address[]
  trader: viem.Address
  route: viem.Address
  routeTypeKey: viem.Hex
  shares: readonly bigint[]
  traderShare: bigint
  shareSupply: bigint
}

export interface IPositionMirrorSlot extends IPositionMirror<'PositionSlot'> { }

export interface IPositionMirrorSettled extends IPositionSettled, IPositionMirror<'PositionSettled'> {
  settlement: IPositionDecrease
  isLiquidated: boolean
  openBlockTimestamp: number
}

export interface IMirrorPositionListSummary extends IPositionListSummary {
  // routeTypeKey?: viem.Hex
  puppets: viem.Address[]
  account: viem.Address
  settledTradeList: IPositionMirrorSettled[]
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


