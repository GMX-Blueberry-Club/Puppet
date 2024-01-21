import { component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, layoutSheet } from "@aelea/ui-components"
import { now } from "@most/core"
import { IntervalTime } from "common-utils"
import { queryLatestPriceTick, queryRouteTypeList } from "puppet-middleware-utils"
import { $rootContainer } from "../pages/common"
import { $trader } from "./$trader"



export const $Opengraph = (parentRoute: router.Route) => component(() => {
  const traderRoute = parentRoute.create({ fragment: /trader\?.*/ })
  const url = new URL(document.location.href)

  const activityTimeframe = now(Number(url.searchParams.get('activityTimeframe')!) as IntervalTime)
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


