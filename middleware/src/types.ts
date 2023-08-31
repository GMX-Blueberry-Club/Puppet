import { IPositionListSummary, IPositionSettled, IPositionSlot, IPositionDecrease } from "gmx-middleware-utils"
import * as viem from "viem"



export interface IMirrorPositionInfo {
  puppets: readonly viem.Address[]
  shares: readonly bigint[]
  traderShare: bigint
  trader: viem.Address
  shareSupply: bigint
  routeTypeKey: viem.Hex
  route: viem.Address
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


