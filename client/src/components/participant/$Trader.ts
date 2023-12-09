import { Behavior, combineObject } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { empty, map, now, startWith } from "@most/core"
import { Stream } from "@most/types"
import * as GMX from 'gmx-middleware-const'
import { $Link, $Table, $arrowDown, $arrowRight, $icon, ScrollRequest } from "gmx-middleware-ui-components"
import { readableLeverage, pagingQuery, switchMap, unixTimestampNow, readableUnitAmount, formatFixed } from "gmx-middleware-utils"
import { IPuppetSubscritpion, accountSettledTradeListSummary } from "puppet-middleware-utils"
import * as viem from 'viem'
import { $profileAvatar, $profileDisplay } from "../$AccountProfile.js"
import { $heading2, $heading3 } from "../../common/$text.js"
import { IGmxProcessState } from "../../data/process/process.js"
import { $card, $card2 } from "../../common/elements/$common.js"
import { $seperator2 } from "../../pages/common.js"
import { entryColumn, pnlSlotColumn, positionTimeColumn, puppetsColumn, settledPnlColumn, settledSizeColumn, slotSizeColumn } from "../table/$TableColumn.js"
import { $ProfilePerformanceCard, getUpdateTickList } from "../trade/$ProfilePerformanceGraph.js"
import { $LastAtivity } from "../../pages/components/$LastActivity.js"
import * as storage from "../../utils/storage/storeScope.js"
import * as store from "../../data/store/store.js"
import { $metricLabel, $metricRow, $metricValue } from "./profileUtils.js"
import { rootStoreScope } from "../../data/store/store.js"
import { $TraderProfileSummary } from "./$Summary"



export interface ITraderProfile {
  route: router.Route
  address: viem.Address
  processData: Stream<IGmxProcessState>
  activityTimeframe: Stream<GMX.IntervalTime>
}




export const $TraderPortfolio = (config: ITraderProfile) => component((
  [changeRoute, changeRouteTether]: Behavior<any, string>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IPuppetSubscritpion>,
  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, GMX.IntervalTime>,
  [scrollRequest, scrollRequestTether]: Behavior<ScrollRequest>,

) => {


  const settledTradeList = map(params => {
    const filterStartTime = unixTimestampNow() - params.activityTimeframe
    const list = params.processData.mirrorPositionSettled.filter(pos => pos.trader === config.address && pos.blockTimestamp > filterStartTime).reverse()
    return list
  }, combineObject({ processData: config.processData, activityTimeframe: config.activityTimeframe }))

  const openTrades = map(params => {
    const list = Object.values(params.processData.mirrorPositionSlot).filter(pos => pos.trader === config.address)
    return list
  }, combineObject({ processData: config.processData, activityTimeframe: config.activityTimeframe }))

  const pricefeed = map(pd => pd.pricefeed, config.processData)



  return [

    $column(layoutSheet.spacingBig)(

      $column(layoutSheet.spacingTiny)(
        
     
        
        $card(layoutSheet.spacingBig, style({ flex: 1, width: '100%' }))(
          $card2(style({ padding: 0, height: screenUtils.isDesktopScreen ? '200px' : '200px', position: 'relative', margin: screenUtils.isDesktopScreen ? `-36px -36px 0` : `-12px -12px 0px` }))(
            switchMap(params => {
              const filterStartTime = unixTimestampNow() - params.activityTimeframe
              const traderPos = params.processData.mirrorPositionSettled.filter(pos => pos.trader === config.address && pos.blockTimestamp > filterStartTime)
              const openList = Object.values(params.processData.mirrorPositionSlot).filter(pos => pos.account === config.address)
              const allPositions = [...traderPos, ...openList]


              return $ProfilePerformanceCard({
                account: config.address,
                $container: $column(style({ width: '100%', padding: 0, height: '200px' })),
                pricefeed: params.pricefeed,
                tickCount: 100,
                activityTimeframe: params.activityTimeframe,
                positionList: allPositions,
                // trader: config.address,
              })({ })
            }, combineObject({ processData: config.processData, activityTimeframe: config.activityTimeframe, pricefeed })),
          ),
          $column(layoutSheet.spacingBig)(

            switchMap(params => {
              if (params.openTrades.length === 0) {
                return empty()
                // return $column(
                //   $text(style({ color: pallete.foreground }))('No open positions')
                // )
              }

              return $column(layoutSheet.spacingSmall)(
                $heading3('Open Positions'),
                $Table({
                  dataSource: now(params.openTrades),
                  columns: [
                    ...screenUtils.isDesktopScreen ? [positionTimeColumn] : [],
                    entryColumn,
                    puppetsColumn(changeRouteTether),
                    slotSizeColumn(config.processData, config.address),
                    pnlSlotColumn(config.processData, config.address),
                  ],
                })({
                  // scrollIndex: changePageIndexTether()
                })
              )
            }, combineObject({ openTrades })),
            
            switchMap(params => {
              const paging = startWith({ offset: 0, pageSize: 20 }, scrollRequest)
              const dataSource = map(req => {
                return pagingQuery(req, params.settledTradeList)
              }, paging)

              return $column(layoutSheet.spacingSmall)(
                $heading3('Settled Positions'),
                $Table({
                  dataSource,
                  columns: [
                    ...screenUtils.isDesktopScreen ? [positionTimeColumn] : [],
                    entryColumn,
                    puppetsColumn(changeRouteTether),
                    settledSizeColumn(config.address),
                    settledPnlColumn(config.address),
                  ],
                })({
                  scrollRequest: scrollRequestTether()
                })
              )
            }, combineObject({ settledTradeList }))
            
          ),
        )
      )
      
      
    ),
    {
      changeRoute, modifySubscriber, changeActivityTimeframe
    }
  ]
})

export const $TraderProfile = (config: ITraderProfile) => component((
  [changeRoute, changeRouteTether]: Behavior<any, string>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IPuppetSubscritpion>,
  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, GMX.IntervalTime>,
  [scrollRequest, scrollRequestTether]: Behavior<ScrollRequest>,

) => {


  const settledTradeList = map(params => {
    const filterStartTime = unixTimestampNow() - params.activityTimeframe
    const list = params.processData.mirrorPositionSettled.filter(pos => pos.trader === config.address && pos.blockTimestamp > filterStartTime).reverse()
    return list
  }, combineObject({ processData: config.processData, activityTimeframe: config.activityTimeframe }))


  return [
    $column(layoutSheet.spacingBig)(
      $TraderProfileSummary({
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
          url: `/app/leaderboard/settled`,
          route: config.route,
        })({
          click: changeRouteTether()
        }),
        $LastAtivity(config.activityTimeframe)({
          changeActivityTimeframe: changeActivityTimeframeTether()
        })
      ),

      $TraderPortfolio({ ...config })({
        modifySubscriber: modifySubscriberTether(),
        changeRoute: changeRouteTether(),
        changeActivityTimeframe: changeActivityTimeframeTether(),
      })
    ),
    {
      changeRoute, modifySubscriber, changeActivityTimeframe
    }
  ]
})


