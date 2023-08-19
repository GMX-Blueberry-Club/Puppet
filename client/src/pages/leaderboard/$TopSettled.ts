import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { empty, map, snapshot, startWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import * as GMX from 'gmx-middleware-const'
import { $Baseline, $Table, ISortBy, ScrollRequest, TableColumn } from "gmx-middleware-ui-components"
import { IPositionListSummary, getMappedValue, groupArrayMany, pagingQuery, switchMap, unixTimestampNow } from "gmx-middleware-utils"
import { IMirrorPositionListSummary, IPositionMirrorSettled, IPuppetRouteSubscritpion, IPuppetRouteTrades, summariesMirrorTrader } from "puppet-middleware-utils"
import * as viem from "viem"
import { $TraderDisplay, $pnlValue, $size } from "../../common/$common"
import { puppetsColumn } from "../../components/table/$TableColumn"
import { $ProfilePerformanceGraph } from "../../components/trade/$ProfilePerformanceCard"
import { IGmxProcessState } from "../../data/process/process"
import * as store from "../../data/store/store"
import * as storage from "../../utils/storage/storeScope"
import { $LastAtivity, LAST_ACTIVITY_LABEL_MAP } from "../components/$LastActivity"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { $card } from "../../elements/$common"




export type ITopSettled = {
  route: router.Route
  processData: Stream<IGmxProcessState>
  subscriptionList: Stream<IPuppetRouteSubscritpion[]>
}

type FilterTable =  { activityTimeframe: GMX.IntervalTime } | null

export const $TopSettled = (config: ITopSettled) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IPuppetRouteSubscritpion>,
  
  [scrollRequest, scrollRequestTether]: Behavior<ScrollRequest>,
  [sortByChange, sortByChangeTether]: Behavior<ISortBy<IPositionListSummary>>,
  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<GMX.IntervalTime>,

) => {


  const sortBy = replayLatest(sortByChange, { direction: 'desc', selector: 'pnl' } as ISortBy<IPositionListSummary>)
  // const filter = combineObject({ activityTimeframe: config.activityTimeframe })


  const activityTimeframe = storage.replayWrite(store.activityTimeframe, GMX.TIME_INTERVAL_MAP.MONTH, changeActivityTimeframe)




  return [
    $column(

      

      $card(layoutSheet.spacingBig, style({ flex: 1 }))(
      

        $LastAtivity(activityTimeframe)({
          changeActivityTimeframe: changeActivityTimeframeTether()
        }),
    
        switchMap(params => {
          const paging = startWith({ ...params.sortBy, offset: 0, pageSize: 20 }, scrollRequest)

          const dataSource =  map(req => {
            const filterStartTime = unixTimestampNow() - params.activityTimeframe

            const flattenMapMap = Object
              .values(params.data.mirrorPositionSettled)
              .flatMap(x => Object.values(x).flat())
              .filter(x => x.blockTimestamp > filterStartTime)
            const tradeListMap = groupArrayMany(flattenMapMap, a => a.trader)
            const tradeListEntries = Object.values(tradeListMap)
            const filterestPosList = tradeListEntries.map(settledTradeList => {

              return { trader: settledTradeList[0].trader, settledTradeList, ...summariesMirrorTrader(settledTradeList) }
            })

            return pagingQuery({ ...params.sortBy, ...req }, filterestPosList)
          }, paging)




          const columns: TableColumn<IMirrorPositionListSummary & { trader: viem.Address, settledTradeList: IPositionMirrorSettled[] }>[] = [
            {
              $head: $text('Trader'),
              gridTemplate: 'minmax(140px, 180px)',
              columnOp: style({ alignItems: 'center' }),
              $$body: map(pos => {

                return $TraderDisplay({
                  route: config.route,
                  // changeSubscriptionList: config.changeSubscriptionList,
                  subscriptionList: config.subscriptionList,
                  trader: pos.trader,
                })({ 
                  modifySubscribeList: modifySubscriberTether(),
                  clickTrader: routeChangeTether()
                })
              })
            },
          
            ...screenUtils.isDesktopScreen
              ? [
                {
                  $head: $text('Win / Loss'),
                  // gridTemplate: 'minmax(110px, 120px)',
                  columnOp: style({ alignItems: 'center', placeContent: 'center' }),
                  $$body: map((pos: IMirrorPositionListSummary) => {
                    return $row(
                      $text(`${pos.winCount} / ${pos.lossCount}`)
                    )
                  })
                },
                puppetsColumn,
              ]
              : [],
            ...screenUtils.isDesktopScreen
              ? [
                {
                  $head: $text(`Last ${getMappedValue(LAST_ACTIVITY_LABEL_MAP, params.activityTimeframe)} activity`),
                  gridTemplate: '160px',
                  columnOp: style({ alignItems: 'center', placeContent: 'center' }),
                  $$body: map((pos: IMirrorPositionListSummary & { trader: viem.Address, settledTradeList: IPositionMirrorSettled[]}) => {
                    return screenUtils.isDesktopScreen
                      ? $ProfilePerformanceGraph({
                        processData: params.data,
                        positionList: pos.settledTradeList,
                        width: 160,
                        activityTimeframe: params.activityTimeframe,
                      })({})
                      : empty()
                  })
                },
              ]
              : [],
            {
              $head: $column(style({ textAlign: 'right' }))(
                $text('Size'),
                $text(style({ fontSize: '.85rem' }))('Leverage'),
              ),
              sortBy: 'size',
              columnOp: style({ placeContent: 'flex-end' }),
              $$body: map((pos) => {
                return $size(pos.size, pos.collateral)
              })
            },
            {
              $head: $column(style({ textAlign: 'right' }))(
                $text('PnL $'),
                $text(style({ fontSize: '.85rem' }))('Return %'),
              ),
              sortBy: 'pnl',
              gridTemplate: '90px',
              columnOp: style({ placeContent: 'flex-end' }),
              $$body: map(pos => {

                return $row(layoutSheet.spacingSmall, style({ alignItems: 'center', flex: 1 }))(

                  $row(style({ flex: 1, placeContent: 'flex-end', fontWeight: 'bold', letterSpacing: '0.05em' }))(
                    $pnlValue(pos.pnl)
                  )
                // $column(style({ gap: '3px', textAlign: 'right' }))(
                //   $pnlValue(pos.pnl),
                //   $seperator2,
                //   $text(style({ fontSize: '.85rem' }))(readableFixedBsp(div(pos.pnl, pos.collateral))),
                // )
                )
              })
            },

          ]

          return $Table({

            dataSource,
            columns,
          })({
            sortBy: sortByChangeTether(),
            scrollRequest: scrollRequestTether(),
          })
        }, combineObject({ data: config.processData, sortBy, activityTimeframe })),

      
      )
    ),

    {
      routeChange,
      modifySubscriber,
      // unSubscribeSelectedTraders: snapshot((params, trader) => {
      //   const selectedIdx = params.selection.indexOf(trader)
      //   selectedIdx === -1 ? params.selection.push(trader) : params.selection.splice(selectedIdx, 1)
      //   return params.selection
      // }, combineObject({ selection: config.selectedTraders, subscription: config.subscription }), selectTrader),
    }
  ]
})





