import * as router from '@aelea/router'
import { Stream } from '@most/types'
import * as GMX from 'gmx-middleware-const'
import { IPriceTickListMap } from 'gmx-middleware-utils'
import { IMirrorPositionOpen, IMirrorPositionSettled, ISetRouteType } from 'puppet-middleware-utils'
import * as viem from 'viem'

export interface IPageGlobalParams {
  route: router.Route
  activityTimeframe: Stream<GMX.IntervalTime>
  selectedTradeRouteList: Stream<ISetRouteType[]>
  priceTickMapQuery: Stream<Promise<IPriceTickListMap>>
  routeTypeListQuery: Stream<Promise<ISetRouteType[]>>
}

export interface IPageUserParams extends IPageGlobalParams {
  address: viem.Address
  settledPositionListQuery: Stream<Promise<IMirrorPositionSettled[]>>
  openPositionListQuery: Stream<Promise<IMirrorPositionOpen[]>>
}

export enum ITradeFocusMode {
  collateral,
  size,
}

export enum IProfileMode {
  TRADER = 'Trader',
  PUPPET = 'Puppet',
}
