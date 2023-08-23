import { ILogTxType, IPosition, IPositionClose, IPositionLiquidated, IPositionListSummary } from "gmx-middleware-utils"
import * as viem from "viem"



export interface IMirrorPosition {
  requestKey: viem.Hex
  puppets: readonly viem.Address[]
  shares: readonly bigint[]
  traderShare: bigint
  trader: viem.Address
  shareSupply: bigint
  routeTypeKey: viem.Hex
  positionKey: viem.Hex
  route: viem.Address
}


export interface IPositionRequest extends ILogTxType<'PositionRequest'>, IMirrorPosition {}

export interface IPositionMirrorSlot extends IMirrorPosition, IPosition<'PositionMirrorSlot'> {}

export interface IPositionMirrorSettled extends IPosition<'PositionMirrorSettled'>, IMirrorPosition {
  settlePrice: bigint
  settlement: IPositionClose | IPositionLiquidated
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
  endDate: bigint
  subscribed: boolean
  allowance: bigint
  routeTypeKey: viem.Hex
  expiry: bigint
  puppetSubscriptionKey: viem.Hex
}

export type IPuppetRouteTrades = IPuppetRouteSubscritpion & {
  settled: IPositionMirrorSettled[]
  open: IPositionMirrorSlot[]
}

export type IAccountToRouteMap<T> = Record<viem.Address, Record<viem.Hex, T>>


