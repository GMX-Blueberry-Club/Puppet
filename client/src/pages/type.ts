import * as router from '@aelea/router'
import { Stream } from '@most/types'
import { IntervalTime } from 'common-utils'
import * as GMX from 'gmx-middleware-const'
import { IPriceTickListMap } from 'gmx-middleware-utils'
import { IMirrorPositionOpen, IMirrorPositionSettled, ISetRouteType } from 'puppet-middleware-utils'
import * as viem from 'viem'
import * as walletLink from "wallet"


export interface IWalletPageParams {
  walletClientQuery: Stream<Promise<walletLink.IWalletClient | null>>
}

export interface IComponentPageParams extends IWalletPageParams {
  providerQuery: Stream<Promise<walletLink.IPublicProvider>>
}

export interface IPageParams extends IComponentPageParams {
  route: router.Route
}

export interface IUserActivityPageParams extends IPageParams, IUserActivityParams {
}

export interface IUserPositionPageParams extends IPageParams, IPositionActivityParams, IUserActivityParams {}


export interface IUserActivityParams {
  routeTypeListQuery: Stream<Promise<ISetRouteType[]>>
  selectedTradeRouteList: Stream<ISetRouteType[]>
  activityTimeframe: Stream<IntervalTime>
  priceTickMapQuery: Stream<Promise<IPriceTickListMap>>
}

export interface IPositionActivityParams {
  settledPositionListQuery: Stream<Promise<IMirrorPositionSettled[]>>
  openPositionListQuery: Stream<Promise<IMirrorPositionOpen[]>>
}




export enum ITradeFocusMode {
  collateral,
  size,
}


export enum IWalletTab {
  TRADER = 'Trader',
  PUPPET = 'Puppet',
  EARN = "Earn"
}

export enum VestingLockMode {
  CONTINUOUS = 'Continuous',
  SHORT_TERM = 'Short Term'
}
