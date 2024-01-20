import { style } from "@aelea/dom"
import { $column, layoutSheet } from "@aelea/ui-components"
import { now } from "@most/core"
import * as GMX from 'gmx-middleware-const'
import { queryTraderPositionOpen, queryTraderPositionSettled } from "puppet-middleware-utils"
import * as viem from 'viem'
import { $ProfilePeformanceTimeline } from "../components/participant/$ProfilePeformanceTimeline.js"
import { $TraderProfileSummary } from "../components/participant/$Summary.js"
import { IOpengraphPageParams } from "./common"



export const $trader = (config: IOpengraphPageParams) => {
  const { priceTickMapQuery, routeTypeListQuery } = config
  const url = new URL(document.location.href)

  const address = viem.getAddress(String(url.searchParams.get('address'))) as viem.Address
  const activityTimeframe = now(Number(url.searchParams.get('activityTimeframe')!) as GMX.IntervalTime)
  const selectedTradeRouteList = now([])

  const settledPositionListQuery = queryTraderPositionSettled({ address, activityTimeframe, selectedTradeRouteList })
  const openPositionListQuery = queryTraderPositionOpen({ address, selectedTradeRouteList })
  

  return $column(layoutSheet.spacingBig, style({ placeContent: 'space-between', flex: 1 }))(
    $TraderProfileSummary({ address, settledPositionListQuery, openPositionListQuery })({}),

    $column(style({ position: 'relative' }))(
      $ProfilePeformanceTimeline({ 
        activityTimeframe, openPositionListQuery, priceTickMapQuery,
        routeTypeListQuery, selectedTradeRouteList, settledPositionListQuery
      })({ })
    )
  )
}


