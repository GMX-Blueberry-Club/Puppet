import { Behavior, replayLatest } from "@aelea/core"
import { $node, $text, component, nodeEvent, style } from "@aelea/dom"
import { $column, $icon, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { constant, empty, map, multicast, snapshot, startWith } from "@most/core"
import * as GMX from 'gmx-middleware-const'
import { IPriceTickListMap, pagingQuery, readableLeverage, readableUsd, switchMap, unixTimestampNow } from "gmx-middleware-utils"
import { IPuppetTradeRoute, ISetRouteType, accountSettledPositionListSummary, openPositionListPnl } from "puppet-middleware-utils"
import { $TraderDisplay, $pnlDisplay, $puppets } from "../../common/$common.js"
import { $RouteSubscriptionEditor, IChangeSubscription } from "../portfolio/$RouteSubscriptionEditor.js"
import { $ProfilePerformanceGraph } from "../trade/$ProfilePerformanceGraph.js"

import * as router from "@aelea/router"
import { pallete } from "@aelea/ui-components-theme"
import { $Table, $caretDown, $infoLabeledValue, ScrollRequest } from "ui-components"
import { $Popover } from "../$Popover"
import { $puppetLogo } from "../../common/$icons"
import { $iconCircular } from "../../common/elements/$common"
import { getPuppetSubscriptionExpiry } from "../../logic/puppetLogic"
import { wallet } from "../../wallet/walletLink"
import { $ButtonSecondary, $defaultMiniButtonSecondary } from "../form/$Button"
import { entryColumn, positionTimeColumn, settledPnlColumn, settledSizeColumn } from "../table/$TableColumn"

export interface IPuppetTraderTradeRoute {
  puppetTradeRoute: IPuppetTradeRoute
  activityTimeframe: GMX.IntervalTime
  priceTickMap: IPriceTickListMap
  routeTypeList: ISetRouteType[]
  route: router.Route
}

export const $PuppetTraderTradeRoute = (config: IPuppetTraderTradeRoute) => component((
  [modifySubscriber, modifySubscriberTether]: Behavior<IChangeSubscription>,

  [popRouteSubscriptionEditor, popRouteSubscriptionEditorTether]: Behavior<any, bigint>,
  [modifySubscribeList, modifySubscribeListTether]: Behavior<IChangeSubscription>,
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [scrollRequest, scrollRequestTether]: Behavior<ScrollRequest>,
  [toggleHistoryPanel, toggleHistoryPanelTether]: Behavior<any, boolean>,

) => {
  
  const { puppetTradeRoute, routeTypeList, route, activityTimeframe, priceTickMap } = config
  const settledPositionList = puppetTradeRoute.settledList.map(x => x.position)
  const openPositionList = puppetTradeRoute.openList.map(x => x.position)
  const allPositionList = [...settledPositionList, ...openPositionList]
  const routeType = routeTypeList.find(route => route.routeTypeKey === puppetTradeRoute.routeTypeKey)!
  const summary = accountSettledPositionListSummary([...settledPositionList, ...openPositionList], puppetTradeRoute.puppet)
  const pnl = map(openPnl => summary.pnl + openPnl, openPositionListPnl(openPositionList, puppetTradeRoute.puppet))
  const isPanelToggle = replayLatest(multicast(toggleHistoryPanel), false)

  const puppetSubscriptionExpiry = switchMap(async w3p => {
    return w3p
      ? getPuppetSubscriptionExpiry(w3p.account.address, routeType.collateralToken, routeType.indexToken, routeType.isLong)
      : 0n
  }, wallet)

  const paging = startWith({ offset: 0, pageSize: 20 }, scrollRequest)
  const dataSource = map(req => {
    return pagingQuery(req, allPositionList)
  }, paging)



  return [

    $column(
      $row(layoutSheet.spacing, style({ alignItems: 'center', padding: '10px 0' }))(
        $row(
          style({ marginLeft: '-32px', cursor: 'pointer', backgroundColor: pallete.background }),
          toggleHistoryPanelTether(
            nodeEvent('click'),
            snapshot(x => !x, isPanelToggle)
          )
        )(
          $iconCircular($caretDown)
        ),

        $TraderDisplay({
          route: config.route,
          trader: puppetTradeRoute.trader,
        })({
          clickTrader: changeRouteTether(),
          modifySubscribeList: modifySubscriberTether(),
        }),
        $Popover({
          open: map((expiry) => {
            return  $RouteSubscriptionEditor({ expiry, trader: puppetTradeRoute.trader, tradeRoute: config.puppetTradeRoute.tradeRoute, routeTypeKey: puppetTradeRoute.routeTypeKey })({
              modifySubscribeList: modifySubscribeListTether()
            }) 
          }, popRouteSubscriptionEditor),
          dismiss: modifySubscribeList,
          $target: switchMap(expiry => {
            return $ButtonSecondary({
              $content: $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
                $puppets(summary.puppets),
                $icon({ $content: $puppetLogo, width: '26px', svgOps: style({ backgroundColor: pallete.background, borderRadius: '50%', padding: '4px', border: `1px solid ${pallete.message}`, marginRight: '-18px' }), viewBox: '0 0 32 32' }),
              ),
              $container: $defaultMiniButtonSecondary(style({ borderRadius: '16px', padding: '6px 2px', borderColor: Number(expiry) > unixTimestampNow() ? pallete.primary : '' })) 
            })({
              click: popRouteSubscriptionEditorTether(constant(expiry))
            })
          }, puppetSubscriptionExpiry)
        })({}),

        $node(style({ flex: 1 }))(),

        screenUtils.isDesktopScreen
          ? $row(layoutSheet.spacingBig, style({ alignItems: 'flex-end' }))(
            style({ flexDirection: 'column' })(
              $infoLabeledValue(
                $text('W/L'),
                `${summary.winCount} / ${summary.lossCount}`,
              )
            ),
            style({ flexDirection: 'column' })(
              $infoLabeledValue(
                $text('Collateral'),
                readableUsd(summary.avgCollateral)
              )
            ),
            style({ flexDirection: 'column' })(
              $infoLabeledValue(
                $text('Lev'),
                readableLeverage(summary.avgSize, summary.avgCollateral)
              )
            )
          )
          : empty(),

        screenUtils.isDesktopScreen
          ? $ProfilePerformanceGraph({
            puppet: config.puppetTradeRoute.puppet,
            $container: $column(style({ width: '300px', padding: 0, height: '75px', position: 'relative', margin: '-16px 0' })),
            priceTickMap,
            openPositionList,
            settledPositionList,
            tickCount: 100,
            activityTimeframe
          })({})
          : empty(),

        $pnlDisplay(pnl)
      ),

      switchMap(isOpen => {
        if (!isOpen) {
          return empty()
        }

        return $Table({
          dataSource,
          columns: [
            ...screenUtils.isDesktopScreen ? [positionTimeColumn] : [],
            entryColumn,
            settledSizeColumn(puppetTradeRoute.puppet),
            settledPnlColumn(puppetTradeRoute.puppet),
          ],
        })({
          scrollRequest: scrollRequestTether()
        })
      }, isPanelToggle),
    ),
    
    {
      modifySubscriber, changeRoute
    }
  ]
})



