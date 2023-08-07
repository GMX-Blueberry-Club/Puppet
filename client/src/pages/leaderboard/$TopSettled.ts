import { Behavior, O, combineObject, replayLatest } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { constant, empty, map } from "@most/core"
import { Stream } from "@most/types"
import * as GMX from 'gmx-middleware-const'
import { $Link, $Table, ISortBy } from "gmx-middleware-ui-components"
import { ITraderSummary, pagingQuery, switchMap } from "gmx-middleware-utils"
import { getPuppetSubscriptionKey, getRouteTypeKey } from "puppet-middleware-const"
import { IPuppetRouteTrades, IPuppetRouteSubscritpion, leaderboardMirrorTrader, IMirrorTraderSummary } from "puppet-middleware-utils"
import * as viem from "viem"
import { IProfileActiveTab } from "../$Profile"
import { $pnlValue, $puppets, $size } from "../../common/$common"
import { $discoverIdentityDisplay } from "../../components/$AccountProfile"
import { $defaultBerry } from "../../components/$DisplayBerry"
import { $ButtonSecondary, $defaultMiniButtonSecondary } from "../../components/form/$Button"
import { $ProfilePerformanceGraph } from "../../components/trade/$ProfilePerformanceCard"
import { IGmxProcessSeed } from "../../data/process/process"
import { wallet } from "../../wallet/walletLink"
import { traderColumn } from "../../components/table/$TableColumn"




export type ITopSettled = {
  route: router.Route
  processData: Stream<IGmxProcessSeed>

  subscription: Stream<IPuppetRouteTrades[]>
  subscribeList: Stream<IPuppetRouteSubscritpion[]>
}

export const $TopSettled = (config: ITopSettled) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>,
  [subscribeTrader, subscribeTraderTether]: Behavior<any, IPuppetRouteSubscritpion>,
  
  [pageIndex, pageIndexTether]: Behavior<number, number>,
  [sortByChange, sortByChangeTether]: Behavior<ISortBy<ITraderSummary>>,


) => {





  const sortBy: Stream<ISortBy<ITraderSummary>> = replayLatest(sortByChange, { direction: 'desc', selector: 'pnl' })

  const qparams = combineObject({
    sortBy,
    pageIndex,
  })

  const datass = switchMap(params => {
    return map(data => {
      const summaryList = leaderboardMirrorTrader(data.mirrorPositionSettled)

      return pagingQuery({ ...params.sortBy, offset: params.pageIndex * 20, pageSize: 20 }, summaryList)
    }, config.processData)
  }, qparams)

  



  return [
    $column(layoutSheet.spacingBig, style({ flex: 1 }))(


      // switchLatest(
      //   map(list => {

      //     const fst = list.logHistory[0]
      //     const lst = list.logHistory[list.logHistory.length - 1]

      //     const initialTick = {
      //       time: Number(fst.blockTimestamp),
      //       value: 0
      //     }

          

      //     const timeRange = Number(lst.blockTimestamp - fst.blockTimestamp)

      //     const data = intervalListFillOrderMap({
      //       source: list.logHistory,
      //       // source: [...feed.filter(tick => tick.timestamp > initialTick.time), ...trade.updateList, ...trade.increaseList, ...trade.decreaseList],
      //       interval: timeRange / 100,
      //       seed: initialTick,
      //       getTime: x => Number(x.blockTimestamp),
      //       fillMap: (prev, next) => {

      //         const time = Number(next.blockTimestamp)
      //         const value = prev.value + formatFixed(next.realisedPnl, 30)
      
      //         return { time, value }
      //       }
      //     })
 
          
      //     return $Baseline({
      //       data: data,
      //     })({})
      //   }, gmxTradingSubgraph)
      // ),

      // $column(
      //   $row(layoutSheet.spacing)(
      //     $text(style({ color: pallete.foreground }))('Period:'),
      //     $anchor(
      //       styleBehavior(map(tf => tf === TIME_INTERVAL_MAP.HR24 ? activeTimeframe : null, timeframe)),
      //       topPnlTimeframeChangeTether(nodeEvent('click'), constant(TIME_INTERVAL_MAP.HR24))
      //     )(
      //       $text('Day')
      //     ),
      //     $anchor(
      //       styleBehavior(map(tf => tf === TIME_INTERVAL_MAP.DAY7 ? activeTimeframe : null, timeframe)),
      //       topPnlTimeframeChangeTether(nodeEvent('click'), constant(TIME_INTERVAL_MAP.DAY7))
      //     )(
      //       $text('Week')
      //     ),
      //     $anchor(
      //       styleBehavior(map(tf => tf === TIME_INTERVAL_MAP.MONTH ? activeTimeframe : null, timeframe)),
      //       topPnlTimeframeChangeTether(nodeEvent('click'), constant(TIME_INTERVAL_MAP.MONTH))
      //     )(
      //       $text('Month')
      //     ),
      //     $anchor(
      //       styleBehavior(map(tf => tf === TIME_INTERVAL_MAP.MONTH ? activeTimeframe : null, timeframe)),
      //       topPnlTimeframeChangeTether(nodeEvent('click'), constant(TIME_INTERVAL_MAP.MONTH))
      //     )(
      //       $text('Year')
      //     )
      //   )
      // ),

      $Table({
        dataSource: datass,
        sortBy,
        columns: [
          traderColumn(routeChangeTether(), config.route),
          ...screenUtils.isDesktopScreen
            ? [
              {
                $head: $text('Puppets'),
                columnOp: O(layoutSheet.spacingTiny),
                $$body: map((pos: IMirrorTraderSummary) => {

                  const $copyBtn = switchMap(params => {
                    if (!params.wallet || params.subscriptionList.find(s => s.trader === pos.account) !== undefined) {
                      return empty()
                    }

                    const routeTypeKey = getRouteTypeKey(GMX.ARBITRUM_ADDRESS.NATIVE_TOKEN, GMX.ARBITRUM_ADDRESS.NATIVE_TOKEN, true)
                    const puppetSubscriptionKey = getPuppetSubscriptionKey(params.wallet.account.address, pos.account, routeTypeKey)

                    const isSubscribed = params.subscription.find(x => x.puppetSubscriptionKey === puppetSubscriptionKey) === undefined
                    const subsc: IPuppetRouteSubscritpion = {
                      trader: pos.account,
                      puppet: params.wallet.account.address,
                      allowance: 1000n,
                      routeTypeKey,
                      puppetSubscriptionKey,
                      // subscribed: false,
                      subscribed: isSubscribed,
                    }

                    return  $ButtonSecondary({ $content: $text(isSubscribed ? 'Copy' : 'Unsub'), $container: $defaultMiniButtonSecondary })({
                      click: subscribeTraderTether(constant(subsc))
                    })
                  }, combineObject({ wallet, subscription: config.subscription, subscriptionList: config.subscribeList })) 
                
                  return $puppets(pos.puppets, $copyBtn)
                })
              },
            ]
            : [

            ],
          
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
          ...screenUtils.isDesktopScreen
            ? [
              {
                $head: $text('Win / Loss'),
                // gridTemplate: 'minmax(110px, 120px)',
                columnOp: style({ alignItems: 'center', placeContent: 'center' }),
                $$body: map((pos: IMirrorTraderSummary) => {
                  return $row(
                    $text(`${pos.winCount} / ${pos.lossCount}`)
                  )
                })
              },
            ]
            : [

            ],
          {
            $head: $column(style({ textAlign: 'right' }))(
              $text('PnL $'),
              $text(style({ fontSize: '.85rem' }))('Return %'),
            ),
            sortBy: 'pnl',
            gridTemplate: '2fr',
            columnOp: style({ placeContent: 'flex-end' }),
            $$body: map(pos => {

              return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(

                screenUtils.isDesktopScreen
                  ? switchMap(processData => {
                    const traderPos = processData.mirrorPositionSettled[pos.account] || {}
                    const settledList = Object.values(traderPos).flat() //.slice(-1)

                    return $ProfilePerformanceGraph({
                      processData,
                      positionList: settledList,
                      width: 120,
                    })({})
                  }, config.processData)
                  : empty(),
                $pnlValue(pos.pnl)
                // $column(style({ gap: '3px', textAlign: 'right' }))(
                //   $pnlValue(pos.pnl),
                //   $seperator2,
                //   $text(style({ fontSize: '.85rem' }))(readableFixedBsp(div(pos.pnl, pos.collateral))),
                // )
              )
            })
          },
        ],
      })({
        sortBy: sortByChangeTether(),
        scrollIndex: pageIndexTether()
      })
      
    ),

    {
      routeChange,
      subscribeTrader,
      // changeSubscribeList: snapshot((params, subsc): ITraderSubscritpion[] => {
      //   return [...params.subscriptionList, subsc]
      // }, combineObject({ subscriptionList: config.subscribeList, subscription: config.subscription }), subscribeTreader),
      // unSubscribeSelectedTraders: snapshot((params, trader) => {
      //   const selectedIdx = params.selection.indexOf(trader)
      //   selectedIdx === -1 ? params.selection.push(trader) : params.selection.splice(selectedIdx, 1)
      //   return params.selection
      // }, combineObject({ selection: config.selectedTraders, subscription: config.subscription }), selectTrader),
    }
  ]
})





