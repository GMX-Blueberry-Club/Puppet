import { Behavior, O, combineObject, replayLatest } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { map, now } from "@most/core"
import { Stream } from "@most/types"
import { $Link, $Table, $infoTooltipLabel, ISortBy } from "gmx-middleware-ui-components"
import { pagingQuery, switchMap } from "gmx-middleware-utils"
import { IProfileActiveTab } from "../$Profile"
import { $tradePnl, $openPositionPnlBreakdown, $size } from "../../common/$common"
import { $accountPreview, $discoverIdentityDisplay } from "../../components/$AccountProfile"
import { IGmxProcessSeed, latestTokenPrice } from "../../data/process/process"
import { IPositionMirrorSlot } from "puppet-middleware-utils"
import { $defaultBerry } from "../../components/$DisplayBerry"





export type ITopOpen = {
  route: router.Route

  processData: Stream<IGmxProcessSeed>
}

export const $TopOpen = (config: ITopOpen) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>,
  // [topPnlTimeframeChange, topPnlTimeframeChangeTether]: Behavior<any, ILeaderboardRequest['timeInterval']>,
  
  [pageIndex, pageIndexTether]: Behavior<number, number>,
  [sortByChange, sortByChangeTether]: Behavior<ISortBy<IPositionMirrorSlot>, ISortBy<IPositionMirrorSlot>>,


) => {

  const sortBy: Stream<ISortBy<IPositionMirrorSlot>> = replayLatest(sortByChange, { direction: 'desc', selector: 'blockTimestamp' })

  const qparams = combineObject({
    sortBy,
    pageIndex,
  })

  const datass = switchMap(params => {
    return map(data => {
      const summaryList = Object.values(data.mirrorPositionSlot)

      return pagingQuery({ ...params.sortBy, offset: params.pageIndex * 20, pageSize: 20 }, summaryList)
    }, config.processData)
  }, qparams)


  return [
    $column(layoutSheet.spacingBig)(


      $column(style({ alignItems: 'center' }))(
        $Table({
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
                    $content: $discoverIdentityDisplay({
                      address: pos.trader,
                      $profileContainer: $defaultBerry(style({ width: '50px' }))
                    }),
                    route: config.route.create({ fragment: 'fefwef' }),
                    url: `/app/profile/${pos.trader}/${IProfileActiveTab.TRADER.toLowerCase()}`
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
                $text(style({ fontSize: '.85rem' }))('Avg. Leverage'),
              ),
              // sortBy: 'size',
              columnOp: style({ placeContent: 'flex-end', minWidth: '90px' }),
              $$body: map((pos) => {
                return $size(pos.position.size, pos.position.collateral)
              })
            },
            {
              $head: $text('PnL'),
              columnOp: O(layoutSheet.spacingTiny, style({ flex: 1, placeContent: 'flex-end' })),
              $$body: map((pos) => {
                // const positionMarkPrice = tradeReader.getLatestPrice(now(pos.indexToken))
                // const cumulativeFee = tradeReader.vault.read('cumulativeFundingRates', pos.collateralToken)

                return $infoTooltipLabel(
                  $openPositionPnlBreakdown(pos.position, now(0n)),
                  $tradePnl(pos.position, latestTokenPrice(config.processData, now(pos.position.indexToken)))
                )
              })
            },
            {
              $head: $text('Puppet'),
              columnOp: O(layoutSheet.spacingTiny, style({ flex: 1, placeContent: 'flex-end' })),
              $$body: map((pos) => {
                // const positionMarkPrice = tradeReader.getLatestPrice(now(pos.indexToken))
                // const cumulativeFee = tradeReader.vault.read('cumulativeFundingRates', pos.collateralToken)

                return $column(
                  $text(String(pos.puppets.length)),
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





