import * as router from '@aelea/router'
import { Stream } from '@most/types'
import { IntervalTime } from 'common-utils'
import * as GMX from 'gmx-middleware-const'
import { IPriceTickListMap } from 'gmx-middleware-utils'
import { IMirrorPositionOpen, IMirrorPositionSettled, ISetRouteType } from 'puppet-middleware-utils'
import * as viem from 'viem'


export interface IUserActivityParams {
  settledPositionListQuery: Stream<Promise<IMirrorPositionSettled[]>>
  openPositionListQuery: Stream<Promise<IMirrorPositionOpen[]>>
}

export interface IPageGlobalParams {
  priceTickMapQuery: Stream<Promise<IPriceTickListMap>>
  routeTypeListQuery: Stream<Promise<ISetRouteType[]>>
  activityTimeframe: Stream<IntervalTime>
  selectedTradeRouteList: Stream<ISetRouteType[]>
}

export interface IUserUserParams extends IPageGlobalParams, IUserActivityParams {
  route: router.Route
  address: viem.Address
}

export enum ITradeFocusMode {
  collateral,
  size,
}

export enum IUserType {
  TRADER = 'Trader',
  PUPPET = 'Puppet',
}
