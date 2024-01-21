import { Behavior, combineObject } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { awaitPromises, map, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { IntervalTime, groupArrayMany } from "common-utils"
import { IPuppetTradeRoute, ISetRouteType } from "puppet-middleware-utils"
import * as viem from "viem"
import { $route } from "../../common/$common.js"
import { $heading3 } from "../../common/$text.js"
import { $card, $card2 } from "../../common/elements/$common.js"
import { IPageUserParams } from "../../const/type.js"
import { $seperator2 } from "../../pages/common.js"
import { IChangeSubscription } from "../portfolio/$RouteSubscriptionEditor.js"
import { $ProfilePeformanceTimeline } from "./$ProfilePeformanceTimeline.js"
import { $PuppetTraderTradeRoute } from "./PuppetTraderTradeRoute"


export interface IPuppetProfile extends IPageUserParams {
  puppetTradeRouteListQuery: Stream<Promise<IPuppetTradeRoute[]>>
}

export const $PuppetProfile = (config: IPuppetProfile) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IChangeSubscription>,

  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, IntervalTime>,
  [selectTradeRouteList, selectTradeRouteListTether]: Behavior<ISetRouteType[]>,
) => {
  
  const { activityTimeframe, address, priceTickMapQuery, puppetTradeRouteListQuery, selectedTradeRouteList, routeTypeListQuery, route } = config

  return [

    $column(layoutSheet.spacingBig)(
      $card(layoutSheet.spacingBig, style({ flex: 1, width: '100%' }))(
        $card2(style({ padding: 0, height: screenUtils.isDesktopScreen ? '200px' : '200px', position: 'relative', margin: screenUtils.isDesktopScreen ? `-36px -36px 0` : `-12px -12px 0px` }))(
          $ProfilePeformanceTimeline({ ...config, puppet: address })({
            selectTradeRouteList: selectTradeRouteListTether(),
            changeActivityTimeframe: changeActivityTimeframeTether(),
          }),
        ),

        $column(layoutSheet.spacing)(
          $heading3('Active Trader Routes'),
          switchLatest(awaitPromises(map(async params => {

            const puppetTradeRouteList = await params.puppetTradeRouteListQuery
            const priceTickMap = await params.priceTickMapQuery
            const routeTypeList = await params.routeTypeListQuery

            if (puppetTradeRouteList.length === 0) {
              return $text('No active trade found')
            }


            const tradeRouteList = Object.entries(groupArrayMany(puppetTradeRouteList, x => x.routeTypeKey)) as [viem.Address, IPuppetTradeRoute[]][]

            return $column(layoutSheet.spacingBig, style({ width: '100%' }))(
              ...tradeRouteList.map(([routeTypeKey, traderPuppetTradeRouteList]) => {
                const routeType = routeTypeList.find(route => route.routeTypeKey === routeTypeKey)!

                return $column(layoutSheet.spacing)(
                  $route(routeType),

                  $column(style({ paddingLeft: '16px' }))(
                    $row(layoutSheet.spacing)(
                      $seperator2,
                      $column(layoutSheet.spacing, style({ flex: 1 }))( 
                        ...traderPuppetTradeRouteList.map(puppetTradeRoute => {
                          return $PuppetTraderTradeRoute({ route, puppetTradeRoute, routeTypeList, activityTimeframe: params.activityTimeframe, priceTickMap })({
                            modifySubscriber: modifySubscriberTether(),
                            changeRoute: changeRouteTether(),
                          })
                        })
                      ),
                    ),
                    $seperator2,
                  ),
                )
              })
            )
          }, combineObject({ puppetTradeRouteListQuery, priceTickMapQuery, activityTimeframe, selectedTradeRouteList, routeTypeListQuery })))),
        ),
      ),
    ),
    
    {
      changeRoute, modifySubscriber, changeActivityTimeframe, selectTradeRouteList
    }
  ]
})



