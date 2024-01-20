import { Stream } from "@most/types"
import { IPriceTickListMap } from "gmx-middleware-utils"
import { ISetRouteType } from "puppet-middleware-utils"


export interface IOpengraphPageParams {
  priceTickMapQuery: Stream<Promise<IPriceTickListMap>>
  routeTypeListQuery: Stream<Promise<ISetRouteType[]>>
}