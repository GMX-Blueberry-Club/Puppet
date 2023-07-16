import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { map } from "@most/core"
import { Stream } from "@most/types"
import { $Link, ISortBy } from "gmx-middleware-ui-components"
import { IAccountSummary, IPositionSettled, div, pagingQuery, readableFixedBsp, switchMap } from "gmx-middleware-utils"
import { IProfileActiveTab } from "../$Profile"
import { $pnlValue, $sizeDisplay } from "../../common/$common"
import { $accountPreview } from "../../components/$AccountProfile"
import { $CardTable } from "../../components/$common"
import { gmxData } from "../../data/process"
import { schema } from "../../data/subgraph/schema"
import { fillQuery } from "../../utils/indexer/indexer"
import { $seperator2 } from "../common"





const processSeed: IPositionSettled = {
  ...fillQuery(schema.positionSettled)
}


// const gmxTradingSubgraph = replaySubgraphQuery(
//   {
//     subgraph: `https://gateway-arbitrum.network.thegraph.com/api/${import.meta.env.THE_GRAPH}/subgraphs/id/DJ4SBqiG8A8ytcsNJSuUU2gDTLFXxxPrAN8Aags84JH2`,
//     parentStoreScope: rootStoreScope,
//   },
//   schema.positionSettled,
//   processSeed
// )




export type ITopSettled = {
  route: router.Route
}

export const $TopSettled = (config: ITopSettled) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>,
  // [topPnlTimeframeChange, topPnlTimeframeChangeTether]: Behavior<any, ILeaderboardRequest['timeInterval']>,
  
  [pageIndex, pageIndexTether]: Behavior<number, number>,
  [sortByChange, sortByChangeTether]: Behavior<ISortBy<IAccountSummary>, ISortBy<IAccountSummary>>,


) => {


  const sortBy: Stream<ISortBy<IAccountSummary>> = replayLatest(sortByChange, { direction: 'desc', selector: 'pnl' })

  const qparams = combineObject({
    sortBy,
    pageIndex,
  })

  const datass = switchMap(params => {
    return map(data => {
      const summaryList = Object.values(data.leaderboard)

      return pagingQuery({ ...params.sortBy, offset: params.pageIndex * 20, pageSize: 20 }, summaryList)
    }, gmxData.gmxTrading)
  }, qparams)


  return [
    $column(layoutSheet.spacingBig)(


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

      $column(style({ alignItems: 'center' }))(
        $CardTable({
          dataSource: datass,
          sortBy,
          columns: [
            {
              $head: $text('Account'),
              columnOp: style({ minWidth: '120px', flex: 2, alignItems: 'center' }),
              $$body: map((pos) => {

                return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                // $alertTooltip($text(`This account requires GBC to receive the prize once competition ends`)),
                  $Link({
                    $content: $accountPreview({ address: pos.account }),
                    route: config.route.create({ fragment: 'fefwef' }),
                    url: `/app/profile/${pos.account}/${IProfileActiveTab.TRADING.toLowerCase()}`
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
              //     $text(style({ fontSize: '.75rem' }))(`${pos.rank}`),
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
                $text('Cum. Size $'),
                $text(style({ fontSize: '.75rem' }))('Avg. Leverage'),
              ),
              sortBy: 'size',
              columnOp: style({ placeContent: 'flex-end', minWidth: '90px' }),
              $$body: map((pos) => {
                return $sizeDisplay(pos.size, pos.collateral)
              })
            },
            {
              $head: $column(style({ textAlign: 'right' }))(
                $text('PnL $'),
                $text(style({ fontSize: '.75rem' }))('Return %'),
              ),
              sortBy: 'pnl',
              columnOp: style({ placeContent: 'flex-end', minWidth: '90px' }),
              $$body: map((pos) => {

                return $column(style({ gap: '3px', textAlign: 'right' }))(
                  $pnlValue(pos.pnl),
                  $seperator2,
                  $text(style({ fontSize: '.75rem' }))(readableFixedBsp(div(pos.pnl, pos.collateral))),
                )
              })
            },
          ],
        })({
          sortBy: sortByChangeTether(),
          scrollIndex: pageIndexTether()
        })
      )
    ),

    {
      routeChange,
    }
  ]
})





