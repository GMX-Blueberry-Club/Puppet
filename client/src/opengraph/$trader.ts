import { style } from "@aelea/dom"
import { $column, layoutSheet } from "@aelea/ui-components"
import { now } from "@most/core"
import { Stream } from "@most/types"
import { IntervalTime } from "common-utils"
import { IPriceTickListMap } from "gmx-middleware-utils"
import { ISetRouteType, queryTraderPositionOpen, queryTraderPositionSettled } from "puppet-middleware-utils"
import * as viem from 'viem'
import { $ProfilePeformanceTimeline } from "../components/participant/$ProfilePeformanceTimeline.js"
import { $TraderSummary } from "../components/participant/$Summary.js"



interface ITrader {
  routeTypeListQuery: Stream<Promise<ISetRouteType[]>>
  priceTickMapQuery: Stream<Promise<IPriceTickListMap>>
}

export const $trader = (config: ITrader) => {
  const url = new URL(document.location.href)

  const address = viem.getAddress(String(url.searchParams.get('address'))) as viem.Address
  const activityTimeframe = now(Number(url.searchParams.get('activityTimeframe')!) as IntervalTime)
  const selectedTradeRouteList = now([])

  const settledPositionListQuery = queryTraderPositionSettled({ address, activityTimeframe, selectedTradeRouteList })
  const openPositionListQuery = queryTraderPositionOpen({ address, selectedTradeRouteList })
  

  return $column(layoutSheet.spacingBig, style({ placeContent: 'space-between', flex: 1 }))(
    $TraderSummary({ ...config, address, settledPositionListQuery, openPositionListQuery })({}),

    $column(style({ position: 'relative' }))(
      $ProfilePeformanceTimeline({ ...config, activityTimeframe, openPositionListQuery, selectedTradeRouteList, settledPositionListQuery })({ })
    )
  )
}


