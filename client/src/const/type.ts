import * as router from '@aelea/router'
import { Stream } from '@most/types'
import { IntervalTime } from 'common-utils'
import * as GMX from 'gmx-middleware-const'
import { IPriceTickListMap } from 'gmx-middleware-utils'
import { IMirrorPositionOpen, IMirrorPositionSettled, ISetRouteType } from 'puppet-middleware-utils'
import * as viem from 'viem'

export interface IPageGlobalParams {
  activityTimeframe: Stream<IntervalTime>
  selectedTradeRouteList: Stream<ISetRouteType[]>
  priceTickMapQuery: Stream<Promise<IPriceTickListMap>>
  routeTypeListQuery: Stream<Promise<ISetRouteType[]>>
}

export interface IPageUserParams extends IPageGlobalParams {
  route: router.Route
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
