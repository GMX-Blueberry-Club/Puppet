import { component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, layoutSheet } from "@aelea/ui-components"
import { now } from "@most/core"
import * as GMX from 'gmx-middleware-const'
import { queryLatestPriceTick, queryRouteTypeList, queryTraderPositionOpen, queryTraderPositionSettled } from "puppet-middleware-utils"
import * as viem from 'viem'
import { $rootContainer } from "../pages/common"
import { $trader } from "./$trader"



export const $Opengraph = (parentRoute: router.Route) => component(() => {
  const traderRoute = parentRoute.create({ fragment: /trader\?.*/ })
  const url = new URL(document.location.href)

  const activityTimeframe = now(Number(url.searchParams.get('activityTimeframe')!) as GMX.IntervalTime)
  const selectedTradeRouteList = now([])
  const priceTickMapQuery = queryLatestPriceTick({ activityTimeframe, selectedTradeRouteList })
  const routeTypeListQuery = now(queryRouteTypeList())

  return[
    $rootContainer(
      $column(layoutSheet.spacingBig, style({ placeContent: 'space-between', flex: 1, paddingTop: '36px' }))(
        router.contains(traderRoute)(
          $trader({ priceTickMapQuery, routeTypeListQuery })
        ),
      ),
    )
  ]
})


