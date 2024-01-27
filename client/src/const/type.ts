import * as router from '@aelea/router'
import { Stream } from '@most/types'
import { IntervalTime } from 'common-utils'
import * as GMX from 'gmx-middleware-const'
import { IPriceTickListMap } from 'gmx-middleware-utils'
import { IMirrorPositionOpen, IMirrorPositionSettled, ISetRouteType } from 'puppet-middleware-utils'
import * as viem from 'viem'
import { IWalletClient } from '../wallet/walletLink'


export interface IWalletPageParams {
  walletClientQuery: Stream<Promise<IWalletClient | null>>
}

export interface IUserActivityParams {
  settledPositionListQuery: Stream<Promise<IMirrorPositionSettled[]>>
  openPositionListQuery: Stream<Promise<IMirrorPositionOpen[]>>
}

export interface IPageParams extends IWalletPageParams {
  route: router.Route
  priceTickMapQuery: Stream<Promise<IPriceTickListMap>>
  routeTypeListQuery: Stream<Promise<ISetRouteType[]>>
  activityTimeframe: Stream<IntervalTime>
  selectedTradeRouteList: Stream<ISetRouteType[]>
}


export enum ITradeFocusMode {
  collateral,
  size,
}

export enum IUserType {
  TRADER = 'Trader',
  PUPPET = 'Puppet',
}
