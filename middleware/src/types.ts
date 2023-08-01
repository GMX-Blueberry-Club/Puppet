import { ILogTxType, IPositionSettled, IPositionSlot, ITraderSummary } from "gmx-middleware-utils"
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

export interface IPositionMirrorSlot extends ILogTxType<'PositionMirrorSlot'>, IMirrorPosition {
  position: IPositionSlot
}

export interface IPositionMirrorSettled extends ILogTxType<'PositionMirrorSettled'>, IMirrorPosition {
  position: IPositionSettled
}

export interface IMirrorTraderSummary extends ITraderSummary {
  route: viem.Address
  puppets: viem.Address[]
  settledTradeList: IPositionMirrorSettled[]
}


export type ITraderSubscritpion = {
  trader: viem.Address
  puppet: viem.Address
  subscribed: boolean
  allowance: bigint
  routeTypeKey: viem.Hex
  puppetSubscriptionKey: viem.Hex
}

export type IPuppetSubscritpion = ITraderSubscritpion & {
  settled: IPositionMirrorSettled[]
  open: IPositionMirrorSlot[]
}

export type IAccountToRouteMap<T> = Record<viem.Address, Record<viem.Hex, T>>


