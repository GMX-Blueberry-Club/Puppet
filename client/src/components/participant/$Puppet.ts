import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { empty, map, multicast, now, startWith } from "@most/core"
import { Stream } from "@most/types"
import { $Link, $Table, $arrowRight, $icon, $infoLabel, $infoLabeledValue, ScrollRequest } from "gmx-middleware-ui-components"
import { getMappedValue, groupArrayMany, readableLeverage, pagingQuery, switchMap, unixTimestampNow, readableDate, readablePercentage } from "gmx-middleware-utils"
import { IPuppetSubscritpion, accountSettledTradeListSummary } from "puppet-middleware-utils"
import * as viem from 'viem'
import { $profileAvatar, $profileDisplay } from "../$AccountProfile.js"
import { $TraderDisplay, $TraderRouteDisplay, $pnlValue, $route } from "../../common/$common.js"
import { $heading2, $heading3 } from "../../common/$text.js"
import { IGmxProcessState } from "../../data/process/process.js"
import { $card, $card2 } from "../../common/elements/$common.js"
import { $seperator2 } from "../../pages/common.js"
import { entryColumn, pnlSlotColumn, positionTimeColumn, settledPnlColumn, settledSizeColumn, slotSizeColumn } from "../table/$TableColumn.js"
import { $ProfilePerformanceCard, $ProfilePerformanceGraph, getUpdateTickList } from "../trade/$ProfilePerformanceGraph.js"
import * as GMX from 'gmx-middleware-const'
import { $metricValue } from "./profileUtils.js"
import { $LastAtivity } from "../../pages/components/$LastActivity.js"
import { IProfileActiveTab } from "../../pages/$Profile.js"
import { $PuppetProfileSummary } from "./$Summary"



export interface ITraderProfile {
  route: router.Route
  address: viem.Address
  processData: Stream<IGmxProcessState>
  activityTimeframe: Stream<GMX.IntervalTime>
  subscriptionList: Stream<IPuppetSubscritpion[]>
}


export const $PuppetPortfolio = (config: ITraderProfile) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, GMX.IntervalTime>,
  [scrollRequest, scrollRequestTether]: Behavior<ScrollRequest>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IPuppetSubscritpion>,
  
) => {
  

  const openTrades = replayLatest(multicast(map(processData => {
    const list = Object.values(processData.mirrorPositionSlot)
      .filter(pos => pos.puppets.indexOf(config.address) > -1)
      .reverse()
    return list
  }, config.processData)))

  const settledTrades = replayLatest(multicast(map(processData => {
    const tradeList = processData.mirrorPositionSettled
      .filter(pos => pos.puppets.indexOf(config.address) > -1)
      .reverse()
    return tradeList
  }, config.processData)))

  const routeMap = map(data => data.routeMap, config.processData)
  const pricefeed = map(data => data.pricefeed, config.processData)


  const subscribedRoutes = map(data => data.subscription.filter(s => s.puppet === config.address), config.processData)

  const routeTradeGroupMap = map(params => {
    const allTrades = [...params.openTrades, ...params.settledTrades]
    const tradeRouteMap = groupArrayMany(allTrades, t => t.routeTypeKey)
    const subscribeRouteMap = groupArrayMany(params.subscribedRoutes, s => s.routeTypeKey)

    return { ...params, tradeRouteMap, subscribeRouteMap, allTrades }
  }, combineObject({ settledTrades, openTrades, subscribedRoutes, activityTimeframe: config.activityTimeframe, routeMap, pricefeed }))

  return [

    $column(layoutSheet.spacingBig)(
      $column(layoutSheet.spacingTiny)(
        
        $card(layoutSheet.spacingBig, style({ flex: 1, width: '100%' }))(
          $card2(style({ padding: 0, height: screenUtils.isDesktopScreen ? '200px' : '200px', position: 'relative', margin: screenUtils.isDesktopScreen ? `-36px -36px 0` : `-12px -12px 0px` }))(
            switchMap(params => {
              const filterStartTime = unixTimestampNow() - params.activityTimeframe
              // const traderPos = Object.values(params.processData.mirrorPositionSettled[config.address] || {}).flat().filter(pos => pos.blockTimestamp > filterStartTime)
              // const openList = Object.values(params.processData.mirrorPositionSlot).filter(pos => pos.trader === config.address).filter(pos => pos.blockTimestamp > filterStartTime)
              const allPositions = [...params.openTrades, ...params.settledTrades]


              return $ProfilePerformanceCard({
                account: config.address,
                $container: $column(style({ width: '100%', padding: 0, height: '200px' })),
                pricefeed: params.pricefeed,
                activityTimeframe: params.activityTimeframe,
                tickCount: 100,
                positionList: allPositions,
                // trader: config.address,
              })({ })
            }, combineObject({ processData: config.processData, activityTimeframe: config.activityTimeframe, openTrades, settledTrades, pricefeed })),
          ),

          $column(layoutSheet.spacing)(
            $heading3('Trade Routes'),
            switchMap(params => {

              if (params.subscribedRoutes.length === 0) {
                return $text('No active trade routes')
              }

              const group = Object.entries(params.subscribeRouteMap)

              return $column(layoutSheet.spacingBig, style({ width: '100%' }))(
                ...group.map(([key, list]) => {

                  const route = getMappedValue(params.routeMap, key)
                  const routeTrades = params.tradeRouteMap[key as viem.Hex]
                  const traderTrades = groupArrayMany(routeTrades, s => s.trader)

                  return $column(layoutSheet.spacing)(
                    $route(route),

                    // $RouteDepositInfo({
                    //   routeDescription: route,
                    //   wallet: w3p
                    // })({}),

                    $column(style({ paddingLeft: '16px' }))(
                      $row(layoutSheet.spacing)(
                        $seperator2,

                        $column(layoutSheet.spacing, style({ flex: 1 }))( 
                          ...list.map(sub => {

                            
                            // if (params.settledTrades.length === 0) {
                            //   return $row(layoutSheet.spacing, style({ alignItems: 'center', padding: '10px 0' }))(
                            //     $Link({
                            //       $content: $profileDisplay({
                            //         address: sub.trader,
                            //       }),
                            //       route: config.route.create({ fragment: 'baseRoute' }),
                            //       url: `/app/profile/${sub.trader}/${IProfileActiveTab.TRADER.toLowerCase()}`
                            //     })({ click: changeRouteTether() }),
                            //     $infoLabel($text('No trades yet')),

                            //     $infoLabeledValue('Expiration', readableDate(Number(sub.subscriptionExpiry)), true),
                            //     $infoLabeledValue('Allow', $text(`${readablePercentage(sub.allowance)}`), true),
                            //   )
                            // }

                            const traderTradeList = traderTrades[sub.trader]

                            const summary = accountSettledTradeListSummary(config.address, params.settledTrades)

                            return $row(layoutSheet.spacing, style({ alignItems: 'center', padding: '10px 0' }))(
                              $TraderDisplay({
                                route: config.route,
                                trader: sub.trader,
                              })({
                                clickTrader: changeRouteTether(),
                                modifySubscribeList: modifySubscriberTether(),
                              }),
                              $TraderRouteDisplay({
                                positionParams: route,
                                trader: sub.trader,
                                routeTypeKey: "0xa437f95c9cee26945f76bc090c3491ffa4e8feb32fd9f4fefbe32c06a7184ff3",
                                subscriptionList: config.subscriptionList,
                              })({
                                modifySubscribeList: modifySubscriberTether()
                              }),


                              $ProfilePerformanceGraph({
                                account: config.address,
                                $container: $column(style({ width: '100%', padding: 0, height: '75px', position: 'relative', margin: '-16px 0' })),
                                pricefeed: params.pricefeed,
                                positionList: traderTradeList,
                                tickCount: 100,
                                activityTimeframe: params.activityTimeframe
                              })({}),

                              $pnlValue(summary.pnl)
                            )
                          })
                        ),
                      ),
                      $seperator2,
                    ),
                  )
                })
              )
            }, routeTradeGroupMap),

              
          
          ),
        )
      ),

    ),
    
    {
      changeRoute, changeActivityTimeframe, modifySubscriber
    }
  ]
})


export const $PuppetProfile = (config: ITraderProfile) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, GMX.IntervalTime>,
  [scrollRequest, scrollRequestTether]: Behavior<ScrollRequest>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IPuppetSubscritpion>,
  
) => {

  const settledTradeList = replayLatest(map(params => {
    const list = params.processData.mirrorPositionSettled.filter(pos => pos.trader === config.address).reverse()
    return list
  }, combineObject({ processData: config.processData, activityTimeframe: config.activityTimeframe })))


  return [

    $column(layoutSheet.spacingBig)(
      $PuppetProfileSummary({
        address: config.address, settledTradeList,
        route: config.route,
      })({}),

      $row(style({ placeContent: 'space-between', alignItems: 'center', marginBottom: '-20px' }))(
        $Link({
          $content: $row(layoutSheet.spacingSmall, style({ alignItems: 'center', cursor: 'pointer' }))(
            $icon({
              $content: $arrowRight,
              svgOps: style({ width: '16px', height: '16px', transform: 'rotate(180deg)' }),
            }),
            $text(style({ color: pallete.message }))(`Leaderboard`)
          ),
          url: `/app/leaderboard`,
          route: config.route.create({ fragment: 'baseRoute' }),
        })({
          click: changeRouteTether()
        }),
        $LastAtivity(config.activityTimeframe)({
          changeActivityTimeframe: changeActivityTimeframeTether()
        })
      ),

      $PuppetPortfolio({ ...config })({
        changeRoute: changeRouteTether(),
        changeActivityTimeframe: changeActivityTimeframeTether(),
        modifySubscriber: modifySubscriberTether()
      }),
   
    ),
    
    {
      changeRoute, changeActivityTimeframe, modifySubscriber
    }
  ]
})

