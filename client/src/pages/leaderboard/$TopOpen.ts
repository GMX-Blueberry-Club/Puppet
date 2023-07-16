import { Behavior, O, combineObject, replayLatest } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { map, now } from "@most/core"
import { Stream } from "@most/types"
import { $ButtonToggle, $Link, $infoTooltipLabel, ISortBy } from "gmx-middleware-ui-components"
import { IAccountSummary, IPositionSlot, div, pagingQuery, readableFixedBsp, switchMap } from "gmx-middleware-utils"
import { IProfileActiveTab } from "../$Profile"
import { $TradePnl, $openPositionPnlBreakdown, $pnlValue, $sizeDisplay } from "../../common/$common"
import { $accountPreview } from "../../components/$AccountProfile"
import { $CardTable } from "../../components/$common"
import { gmxData } from "../../data/process"
import { $seperator2 } from "../common"
import * as router from '@aelea/router'





export type ITopOpen = {
  route: router.Route
}

export const $TopOpen = (config: ITopOpen) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>,
  // [topPnlTimeframeChange, topPnlTimeframeChangeTether]: Behavior<any, ILeaderboardRequest['timeInterval']>,
  
  [pageIndex, pageIndexTether]: Behavior<number, number>,
  [sortByChange, sortByChangeTether]: Behavior<ISortBy<IPositionSlot>, ISortBy<IPositionSlot>>,


) => {

  const sortBy: Stream<ISortBy<IPositionSlot>> = replayLatest(sortByChange, { direction: 'desc', selector: 'size' })

  const qparams = combineObject({
    sortBy,
    pageIndex,
  })

  const datass = switchMap(params => {
    return map(data => {
      const summaryList = Object.values(data.positionSlots)

      return pagingQuery({ ...params.sortBy, offset: params.pageIndex * 20, pageSize: 20 }, summaryList)
    }, gmxData.gmxTrading)
  }, qparams)


  return [
    $column(layoutSheet.spacingBig)(


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

                )

              })
            },

            // {
            //   $head: $text('Win / Loss'),
            //   columnOp: style({ alignItems: 'center', placeContent: 'center' }),
            //   $$body: map((pos) => {
            //     return $row(
            //       $text(`${pos.winCount} / ${pos.lossCount}`)
            //     )
            //   })
            // },

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
              $head: $text('PnL'),
              columnOp: O(layoutSheet.spacingTiny, style({ flex: 1, placeContent: 'flex-end' })),
              $$body: map((pos) => {
                // const positionMarkPrice = tradeReader.getLatestPrice(now(pos.indexToken))
                // const cumulativeFee = tradeReader.vault.read('cumulativeFundingRates', pos.collateralToken)

                return $infoTooltipLabel(
                  $openPositionPnlBreakdown(pos, now(0n)),
                  $TradePnl(pos, 0n)
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





