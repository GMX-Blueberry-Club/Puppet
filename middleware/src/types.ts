import { IPositionListSummary, IPositionSettled, IPositionSlot, IPositionDecrease } from "gmx-middleware-utils"
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

export interface IMirrorPositionInfo extends IMirrorPositionRequest {
  shares: readonly bigint[]
  traderShare: bigint
  shareSupply: bigint
}


export interface IPositionMirrorSlot extends IMirrorPositionInfo, IPositionSlot {}

export interface IPositionMirrorSettled extends IPositionSettled, IMirrorPositionInfo {
  settlement: IPositionDecrease
  isLiquidated: boolean
  openBlockTimestamp: number
}

export interface IMirrorPositionListSummary extends IPositionListSummary {
  puppets: viem.Address[]
  // settledTradeList: IPositionMirrorSettled[]
}


export type IPuppetRouteSubscritpion = {
  trader: viem.Address
  puppet: viem.Address
  subscribed: boolean
  allowance: bigint
  routeTypeKey: viem.Hex
  expiry: bigint
  puppetSubscriptionKey: viem.Hex
}


export type IAccountToRouteMap<T> = Record<viem.Address, Record<viem.Hex, T>>


