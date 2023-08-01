import { Behavior, O, combineObject, replayLatest } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { constant, empty, map, snapshot } from "@most/core"
import { Stream } from "@most/types"
import { ARBITRUM_ADDRESS } from "gmx-middleware-const"
import { $Link, $Table, ISortBy } from "gmx-middleware-ui-components"
import { ITraderSummary, div, pagingQuery, readableFixedBsp, switchMap } from "gmx-middleware-utils"
import { getPuppetSubscriptionKey, getRouteTypeKey } from "puppet-middleware-const"
import { ITraderSubscritpion, leaderboardMirrorTrader } from "puppet-middleware-utils"
import * as viem from "viem"
import { IProfileActiveTab } from "../$Profile"
import { $pnlValue, $puppets, $sizeDisplay } from "../../common/$common"
import { $discoverIdentityDisplay } from "../../components/$AccountProfile"
import { $defaultBerry } from "../../components/$DisplayBerry"
import { $ButtonSecondary, $defaultMiniButtonSecondary } from "../../components/form/$Button"
import { IGmxProcessSeed } from "../../data/process/process"
import { wallet } from "../../wallet/walletLink"
import { $seperator2 } from "../common"
import * as GMX from 'gmx-middleware-const'




export type ITopSettled = {
  route: router.Route
  processData: Stream<IGmxProcessSeed>

  subscription: Stream<viem.Address[]>
  subscribeList: Stream<ITraderSubscritpion[]>
}

export const $TopSettled = (config: ITopSettled) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>,
  [subscribeTrader, subscribeTraderTether]: Behavior<any, ITraderSubscritpion>,
  
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
          {
            $head: $text('Trader'),
            columnOp: style({ minWidth: '120px', flex: 2, alignItems: 'center' }),
            $$body: map((pos) => {

              return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                // $alertTooltip($text(`This account requires GBC to receive the prize once competition ends`)),
                $Link({
                  $content: $discoverIdentityDisplay({
                    address: pos.account,
                    $profileContainer: $defaultBerry(style({ width: '50px' }))
                  }),
                  route: config.route.create({ fragment: 'fefwef' }),
                  url: `/app/profile/${pos.account}/${IProfileActiveTab.TRADER.toLowerCase()}`
                })({ click: routeChangeTether() }),
                // $anchor(clickAccountBehaviour)(
                //   $accountPreview({ address: pos.account })
                // )
                // style({ zoom: '0.7' })(
                //   $alert($text('Unclaimed'))
                // )
              )


              // const $container = pos.rank < 4
              //   ? $defaultBerry(style(
              //     {
              //       width: '50px',
              //       minWidth: '50px',
              //       border: `1px solid ${pallete.message}`,
              //       boxShadow: `${colorAlpha(pallete.positive, .4)} 0px 3px 20px 5px`
              //     }
              //     // pos.rank === 1 ? {
              //     //   minWidth: '50px',
              //     //   width: '60px',
              //     //   border: `1px solid ${pallete.positive}`,
              //     //   boxShadow: `${colorAlpha(pallete.positive, .4)} 0px 3px 20px 5px`
              //     // }
              //     //   : pos.rank === 2 ? {
              //     //     minWidth: '50px',
              //     //     width: '60px',
              //     //     border: `1px solid ${pallete.indeterminate}`,
              //     //     boxShadow: `${colorAlpha(pallete.indeterminate, .4)} 0px 3px 20px 5px`
              //     //   }
              //     //     : {
              //     //       minWidth: '50px',
              //     //       width: '60px',
              //     //       border: `1px solid ${pallete.negative}`,
              //     //       boxShadow: `${colorAlpha(pallete.negative, .4)} 0px 3px 20px 5px`
              //     //     }

              //   ))
              //   : $defaultBerry(style({ width: '50px', minWidth: '50px', }))

              // return $row(layoutSheet.spacingSmall, w3p?.account.address === pos.account ? style({ background: invertColor(pallete.message), borderRadius: '15px', padding: '6px 12px' }) : style({}), style({ alignItems: 'center', minWidth: 0 }))(
              //   $row(style({ alignItems: 'baseline', zIndex: 5, textAlign: 'center', minWidth: '18px', placeContent: 'center' }))(
              //     $text(style({ fontSize: '.85rem' }))(`${pos.rank}`),
              //   ),
              //   $Link({
              //     $content: $profilePreview({ profile: pos.profile, $container }),
              //     route: config.parentRoute.create({ fragment: 'fefwef' }),
              //     url: `/app/profile/${pos.account}/${IProfileActiveTab.TRADING.toLowerCase()}`
              //   })({ click: routeChangeTether() }),
              // )
            })
          },
          {
            $head: $text('Puppets'),
            columnOp: O(layoutSheet.spacingTiny, style({ flex: 1 })),
            $$body: map((pos) => {
              // const positionMarkPrice = tradeReader.getLatestPrice(now(pos.indexToken))
              // const cumulativeFee = tradeReader.vault.read('cumulativeFundingRates', pos.collateralToken)



              const $copyBtn = switchMap(params => {
                if (params.wallet === null || params.subscriptionList.find(s => s.trader === pos.account) !== undefined) {
                  return empty()
                }

                const routeTypeKey = getRouteTypeKey(GMX.ARBITRUM_ADDRESS.NATIVE_TOKEN, GMX.ARBITRUM_ADDRESS.NATIVE_TOKEN, true)
                const puppetSubscriptionKey = getPuppetSubscriptionKey(params.wallet.account.address, pos.account, routeTypeKey)

                const newLocal: ITraderSubscritpion = {
                  trader: pos.account,
                  puppet: params.wallet.account.address,
                  allowance: 1000n,
                  routeTypeKey,
                  puppetSubscriptionKey,
                  subscribed: params.subscription.find(x => x.indexOf(pos.route) > -1) === undefined,
                }

                return  $ButtonSecondary({ $content: $text('Copy'), $container: $defaultMiniButtonSecondary })({
                  click: subscribeTraderTether(constant(newLocal))
                })
              }, combineObject({ wallet, subscription: config.subscription, subscriptionList: config.subscribeList })) 
                
              return $puppets(pos.puppets, $copyBtn)
            })
          },
          {
            $head: $column(style({ textAlign: 'right' }))(
              $text('Cum. Size $'),
              $text(style({ fontSize: '.85rem' }))('Avg. Leverage'),
            ),
            sortBy: 'size',
            columnOp: style({ placeContent: 'flex-end', minWidth: '90px' }),
            $$body: map((pos) => {
              return $sizeDisplay(pos.size, pos.collateral)
            })
          },
          {
            $head: $text('Win / Loss'),
            columnOp: style({ alignItems: 'center', placeContent: 'center' }),
            $$body: map((pos) => {
              return $row(
                $text(`${pos.winCount} / ${pos.lossCount}`)
              )
            })
          },
          {
            $head: $column(style({ textAlign: 'right' }))(
              $text('PnL $'),
              $text(style({ fontSize: '.85rem' }))('Return %'),
            ),
            sortBy: 'pnl',
            columnOp: style({ placeContent: 'flex-end', minWidth: '90px' }),
            $$body: map((pos) => {

              return $column(style({ gap: '3px', textAlign: 'right' }))(
                $pnlValue(pos.pnl),
                $seperator2,
                $text(style({ fontSize: '.85rem' }))(readableFixedBsp(div(pos.pnl, pos.collateral))),
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





