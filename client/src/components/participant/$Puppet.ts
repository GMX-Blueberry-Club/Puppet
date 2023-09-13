import { Behavior, combineObject } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { empty, map, now, startWith } from "@most/core"
import { Stream } from "@most/types"
import { $Link, $Table, $arrowRight, $icon, $infoLabel, ScrollRequest } from "gmx-middleware-ui-components"
import { getMappedValue, groupArrayMany, readableLeverage, pagingQuery, switchMap, unixTimestampNow } from "gmx-middleware-utils"
import { IPuppetRouteSubscritpion, summariesMirrorTrader } from "puppet-middleware-utils"
import * as viem from 'viem'
import { $profileAvatar, $profileDisplay } from "../$AccountProfile.js"
import { $TraderDisplay, $pnlValue, $route } from "../../common/$common.js"
import { $heading2, $heading3 } from "../../common/$text.js"
import { IGmxProcessState } from "../../data/process/process.js"
import { $card, $card2 } from "../../elements/$common.js"
import { $seperator2 } from "../../pages/common.js"
import { entryColumn, pnlSlotColumn, positionTimeColumn, settledPnlColumn, settledSizeColumn, slotSizeColumn } from "../table/$TableColumn.js"
import { $ProfilePerformanceCard, $ProfilePerformanceGraph, getUpdateTickList } from "../trade/$ProfilePerformanceGraph.js"
import * as GMX from 'gmx-middleware-const'
import { $metricValue } from "./profileUtils.js"
import { $LastAtivity } from "../../pages/components/$LastActivity.js"
import { IProfileActiveTab } from "../../pages/$Profile.js"



export interface ITraderProfile {
  route: router.Route
  address: viem.Address
  processData: Stream<IGmxProcessState>
  activityTimeframe: Stream<GMX.IntervalTime>
  subscriptionList: Stream<IPuppetRouteSubscritpion[]>

}


export const $PuppetProfile = (config: ITraderProfile) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, GMX.IntervalTime>,
  [scrollRequest, scrollRequestTether]: Behavior<ScrollRequest>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IPuppetRouteSubscritpion>,
) => {

  const openTrades = map(seed => {
    const list = seed.subscription.find(s => s.trader)?.open.reverse() || []
    return list
  }, config.processData)

  const settledTrades = map(processData => {
    const tradeList = processData.subscription.filter(s => s.puppet === config.address)
      .flatMap(trade => trade.settled)
      .reverse()
    return tradeList
  }, config.processData)




  const $metricRow = $column(style({ placeContent: 'center', alignItems: 'center' }))
  const $metricLabel = $row(style({ color: pallete.foreground, letterSpacing: '1px', fontSize: '.85rem' }))


  const summary = map(params => {
    const list = Object.values(params.processData.mirrorPositionSettled[config.address] || {}).flat().reverse()
    const subscribedTraders = params.processData.subscription.filter((sub) => sub.puppet === config.address).map(s => s.trader)

    return {
      stats: summariesMirrorTrader(list),
      subscribedTraders
    }
  }, combineObject({ processData: config.processData }))


  return [

    $column(
      $column(style({ gap: '46px', width: '100%', margin: '0 auto' }))(

        $column(layoutSheet.spacing, style({ minHeight: '90px' }))(
          switchMap(params => {



            return $node(style({ display: 'flex', flexDirection: screenUtils.isDesktopScreen ? 'row' : 'column', gap: screenUtils.isDesktopScreen ? '76px' : '26px', zIndex: 10, placeContent: 'center', alignItems: 'center', padding: '0 8px' }))(
              $row(
                $profileDisplay({
                  address: config.address,
                  labelSize: '22px',
                  profileSize: screenUtils.isDesktopScreen ? 90 : 90
                })
              ),
              $row(layoutSheet.spacingBig, style({ alignItems: 'flex-end' }))(
                $metricRow(
                  $metricValue(style({ paddingBottom: '5px' }))(
                    ...params.summary.subscribedTraders.map(address => {
                      return $profileAvatar({ address, profileSize: 26 })
                    })
                  ),
                  $metricLabel($text('Traders'))
                ),
                $metricRow(
                  $heading2(summary ? `${params.summary.stats.winCount} / ${params.summary.stats.lossCount}` : '-'),
                  $metricLabel($text('Win / Loss'))
                ),
                $metricRow(
                  $heading2(summary ? readableLeverage(params.summary.stats.avgLeverage) : '-'),
                  $metricLabel($text('Avg Leverage'))
                )
              ),
            )
          }, combineObject({ processData: config.processData, summary })),
        ),


        $column(layoutSheet.spacingTiny)(
          $row(style({ placeContent: 'space-between', alignItems: 'center' }))(
            $Link({
              $content: $row(layoutSheet.spacingSmall, style({ alignItems: 'center', cursor: 'pointer' }))(
                $icon({
                  $content: $arrowRight,
                  svgOps: style({ width: '16px', height: '16px', transform: 'rotate(180deg)' }),
                }),
                $text(style({ color: pallete.message }))(`Leaderboard`)
              ),
              url: `/app/leaderboard/settled`,
              route: config.route,
            })({
              click: changeRouteTether()
            }),
            $LastAtivity(config.activityTimeframe)({
              changeActivityTimeframe: changeActivityTimeframeTether()
            })
          ),
     
        
          $card(layoutSheet.spacingBig, style({ flex: 1, width: '100%' }))(
            $card2(style({ padding: 0, height: screenUtils.isDesktopScreen ? '200px' : '200px', position: 'relative', margin: screenUtils.isDesktopScreen ? `-36px -36px 0` : `-12px -12px 0px` }))(
              switchMap(params => {
                const filterStartTime = unixTimestampNow() - params.activityTimeframe
                // const traderPos = Object.values(params.processData.mirrorPositionSettled[config.address] || {}).flat().filter(pos => pos.blockTimestamp > filterStartTime)
                // const openList = Object.values(params.processData.mirrorPositionSlot).filter(pos => pos.trader === config.address).filter(pos => pos.blockTimestamp > filterStartTime)
                const allPositions = [...params.openTrades, ...params.settledTrades]


                return $ProfilePerformanceCard({
                  $container: $column(style({ width: '100%', padding: 0, height: '200px' })),
                  processData: params.processData,
                  activityTimeframe: params.activityTimeframe,
                  tickCount: 100,
                  positionList: allPositions,
                // trader: config.address,
                })({ })
              }, combineObject({ processData: config.processData, activityTimeframe: config.activityTimeframe, openTrades, settledTrades })),
            ),

            $column(layoutSheet.spacing)(
              $heading3('Routes'),
              switchMap(params => {

                const subscList = params.processData.subscription.filter(s => s.puppet === config.address)
                const group = Object.entries(groupArrayMany(subscList, s => s.routeTypeKey))

                return $column(layoutSheet.spacingBig, style({ width: '100%' }))(
                  ...group.map(([key, list]) => {

                    const route = getMappedValue(ROUTE_DESCRIPTIN_MAP, key)

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
                              const settledList = [...sub.settled, ...sub.open] //.slice(-1)

                              if (settledList.length === 0) {
                                return $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
                                  $Link({
                                    $content: $profileDisplay({
                                      address: sub.trader,
                                    }),
                                    route: config.route.create({ fragment: 'baseRoute' }),
                                    url: `/app/profile/${sub.trader}/${IProfileActiveTab.TRADER.toLowerCase()}`
                                  })({ click: changeRouteTether() }),
                                  $infoLabel($text('No trades yet'))
                                )
                              }


                              const summary = summariesMirrorTrader(sub.settled, config.address)

                              return $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
                                $TraderDisplay({
                                  route: config.route,
                                  subscriptionList: config.subscriptionList,
                                  trader: sub.trader,
                                })({
                                  clickTrader: changeRouteTether(),
                                  modifySubscribeList: modifySubscriberTether(),
                                }),

                                $node(style({ flex: 1 }))(),

                                $ProfilePerformanceGraph({
                                  $container: $column(style({ width: '100%', padding: 0, height: '100px', position: 'relative' })),
                                  processData: params.processData,
                                  positionList: settledList,
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
              }, combineObject({ processData: config.processData, activityTimeframe: config.activityTimeframe })),


              switchMap(params => {
                if (params.openTrades.length === 0) {
                  return empty()
                }

                return $column(layoutSheet.spacingSmall)(
                  $heading3('Open Positions'),
                  $Table({
                    dataSource: now(params.openTrades),
                    columns: [
                      ...screenUtils.isDesktopScreen ? [positionTimeColumn] : [],
                      entryColumn,
                      slotSizeColumn(config.processData),
                      pnlSlotColumn(config.processData),
                    ],
                  })({
                  // scrollIndex: changePageIndexTether()
                  })
                )
              }, combineObject({ openTrades })),

     
              switchMap(params => {
                const paging = startWith({ offset: 0, pageSize: 20 }, scrollRequest)
                const dataSource = map(req => {
                  return pagingQuery(req, params.settledTrades)
                }, paging)

                return $column(layoutSheet.spacingSmall)(
                  $heading3('Settled Positions'),
                  $Table({
                    dataSource,
                    columns: [
                      ...screenUtils.isDesktopScreen ? [positionTimeColumn] : [],
                      entryColumn,
                      settledSizeColumn(),
                      settledPnlColumn(),
                    ],
                  })({
                    scrollRequest: scrollRequestTether()
                  })
                )
              }, combineObject({ settledTrades })),
              
          
            ),
          )
        )
            
      ),

 

   

      //   $card(layoutSheet.spacingBig, style({ flex: 1, width: '100%' }))(

      //     $column(
      //       $heading3('Open Positions'),
      //       $Table({
      //         dataSource: openTrades,
      //         columns: [
      //           positionTimeColumn,
      //           entryColumn,
      //           {
      //             $head: $text('Trader'),
      //             columnOp: style({ minWidth: '120px', flex: 2, alignItems: 'center' }),
      //             $$body: map((pos) => {
      //               return $TraderDisplay({
      //                 route: config.route,
      //                 subscriptionList: config.subscriptionList,
      //                 trader: sub.trader,
      //               })({})
      //             })
      //           },
      //           slotSizeColumn(config.processData, config.address),
      //           pnlSlotColumn(config.processData),
      //         ],
      //       })({}),
      //     ),
              
      //     $column(
      //       $heading3('Settled Positions'),
      //       $Table({
      //         dataSource: settledTrades,
      //         columns: [
      //           positionTimeColumn,
      //           entryColumn,
      //           {
      //             $head: $text('Trader'),
      //             columnOp: style({ minWidth: '120px', flex: 2, alignItems: 'center' }),
      //             $$body: map((pos) => {
      //               return $TraderDisplay({
      //                 route: config.route,
      //                 subscriptionList: config.subscriptionList,
      //                 trader: sub.trader,
      //               })({})
      //             })
      //           },
      //           settledSizeColumn(config.processData, config.address),
      //           settledPnlColumn(config.address),
      //         ],
      //       })({})
      //     ),
      //   ),
     
      
      // ),
    ),
    
    {
      changeRoute, changeActivityTimeframe, modifySubscriber
    }
  ]
})


