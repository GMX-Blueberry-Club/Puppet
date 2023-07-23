import { IAbstractPositionKey, ILogTxType, IPositionSettled, IPositionSlot, ITraderSummary } from "gmx-middleware-utils"
import * as viem from "viem"


export interface IPuppetSubscription extends IAbstractPositionKey {
  allowance: bigint
  subscribe: boolean
}

export interface IMirrorPosition {
  puppets: readonly viem.Address[]
  trader: viem.Address
  routeTypeKey: viem.Hex
  positionKey: viem.Hex
  route: viem.Address
}


export interface IPositionRequest extends ILogTxType<'PositionRequest'>, IMirrorPosition {}

export interface IPositionMirrorSlot extends ILogTxType<'PositionMirrorSlot'>, IMirrorPosition {
  position: IPositionSlot
}

export interface IPositionMirrorSettled extends ILogTxType<'PositionMirrorSlot'>, IMirrorPosition {
  position: IPositionSettled
}

export interface IMirrorTraderSummary extends ITraderSummary {
  route: viem.Address
  puppets: viem.Address[]
  settledTradeList: IPositionMirrorSettled[]
}



