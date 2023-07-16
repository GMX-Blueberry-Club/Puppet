import { Behavior, O } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, layoutSheet } from "@aelea/ui-components"

import { awaitPromises, map, mergeArray, now, zip } from "@most/core"
import { CHAIN } from "gmx-middleware-const"
import { $ButtonToggle, $defaulButtonToggleContainer, $infoTooltipLabel  } from "gmx-middleware-ui-components"
import { IRequestAccountTradeListApi, TradeStatus, filterNull, gmxSubgraph, readableDate, readableFixedUSD30, timeSince, unixTimestampNow } from "gmx-middleware-utils"
import * as PUPPET from "puppet-middleware-const"
import { $CardTable } from "../components/$common"
import { $responsiveFlex } from "../elements/$common"
import * as tradeReader from "../logic/trade"
import { fadeIn } from "../transitions/enter"
import { walletLink } from "../wallet"
import { IProfileActiveTab } from "./$Profile"
import { $entry, $riskLiquidator, $openPositionPnlBreakdown, $TradePnl, $sizeDisplay, $pnlValue } from "../common/$common"




export interface IAccount {
  parentRoute: Route
  chainList: CHAIN[]
}

export const $ProfileConnected = (config: IAccount) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [requestAccountTradeList, requestAccountTradeListTether]: Behavior<number, IRequestAccountTradeListApi>,
  [selectProfileMode, selectProfileModeTether]: Behavior<IProfileActiveTab, IProfileActiveTab>,
) => {

  const $title = $text(style({ fontWeight: 'bold', fontSize: '1.55em' }))



  return [
    $responsiveFlex(
      layoutSheet.spacingBig,
      // style({ maxWidth: '560px', width: '100%', margin: '0 auto', })
    )(
      // $column(layoutSheet.spacing, style({ flex: 1 }))(

      //   $column(layoutSheet.spacing, style({ alignItems: 'center' }))(
      //     $Link({
      //       $content: $anchor(
      //         $ButtonSecondary({
      //           $container: $defaultButtonSecondary,
      //           $content: $row(layoutSheet.spacingTiny, style({ alignItems: 'center', cursor: 'pointer' }))(
      //             $icon({ $content: $labLogo, width: '16px', fill: pallete.middleground, viewBox: '0 0 32 32' }),
      //             $text('Wardrobe')
      //           )
      //         })({}),
      //       ),
      //       url: '/app/wardrobe', route: config.parentRoute
      //     })({
      //       click: changeRouteTether()
      //     })
      //   ),
      // ),

      $node(),

      $column(layoutSheet.spacingBig, style({ flex: 2 }))(
        $ButtonToggle({
          $container: $defaulButtonToggleContainer(style({ alignSelf: 'center', })),
          selected: mergeArray([selectProfileMode, now(location.pathname.split('/').slice(-1)[0] === IProfileActiveTab.BERRIES.toLowerCase() ? IProfileActiveTab.BERRIES : IProfileActiveTab.TRADING)]),
          options: [
            IProfileActiveTab.BERRIES,
            IProfileActiveTab.TRADING,
            // IProfileActiveTab.IDENTITY,
            // IProfileActiveTab.LAB,
          ],
          $$option: map(option => {
            return $text(option)
          })
        })({ select: selectProfileModeTether() }),




        fadeIn(
          $column(layoutSheet.spacingBig, style({ flex: 1 }))(
            $title('Open Positions'),
            $CardTable({
              dataSource: awaitPromises(gmxSubgraph.accountOpenTradeList(requestAccountTradeList)),
              columns: [
                {
                  $head: $text('Time'),
                  columnOp: O(style({ maxWidth: '60px' })),

                  $$body: map((req) => {
                    const isKeeperReq = 'ctx' in req

                    const timestamp = isKeeperReq ? unixTimestampNow() : req.timestamp

                    return $column(layoutSheet.spacingTiny, style({ fontSize: '.75rem' }))(
                      $text(timeSince(timestamp) + ' ago'),
                      $text(readableDate(timestamp)),
                    )
                  })
                },
                {
                  $head: $text('Entry'),
                  columnOp: O(style({ maxWidth: '100px' }), layoutSheet.spacingTiny),
                  $$body: map((pos) => {
                    return $entry(pos)
                  })
                },
                {
                  $head: $column(style({ textAlign: 'right' }))(
                    $text(style({ fontSize: '.75rem' }))('Collateral'),
                    $text('Size'),
                  ),
                  columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.2, placeContent: 'flex-end' })),
                  $$body: map(pos => {
                    const positionMarkPrice = tradeReader.getLatestPrice(now(pos.indexToken))

                    return $riskLiquidator(pos, positionMarkPrice)
                  })
                },
                {
                  $head: $text('PnL'),
                  columnOp: O(layoutSheet.spacingTiny, style({ flex: 1, placeContent: 'flex-end' })),
                  $$body: map((pos) => {
                    const positionMarkPrice = tradeReader.getLatestPrice(now(pos.indexToken))
                    const cumulativeFee = tradeReader.vault.read('cumulativeFundingRates', pos.collateralToken)

                    return $infoTooltipLabel(
                      $openPositionPnlBreakdown(pos, cumulativeFee, positionMarkPrice),
                      $TradePnl(pos, cumulativeFee, positionMarkPrice)
                    )
                  })
                },
              ],
            })({}),

            $title('Settled Positions'),
            $CardTable({
              dataSource: awaitPromises(gmxSubgraph.accountTradeList(requestAccountTradeList)),
              columns: [
                {
                  $head: $text('Time'),
                  columnOp: O(style({ maxWidth: '60px' })),

                  $$body: map((req) => {
                    const isKeeperReq = 'ctx' in req

                    const timestamp = isKeeperReq ? unixTimestampNow() : req.settledTimestamp

                    return $column(layoutSheet.spacingTiny, style({ fontSize: '.75rem' }))(
                      $text(timeSince(timestamp) + ' ago'),
                      $text(readableFixedUSD30(timestamp)),
                    )
                  })
                },
                {
                  $head: $text('Entry'),
                  columnOp: O(style({ maxWidth: '100px' }), layoutSheet.spacingTiny),
                  $$body: map((pos) => {
                    return $entry(pos)
                  })
                },
                {
                  $head: $column(style({ textAlign: 'right' }))(
                    $text(style({ fontSize: '.75rem' }))('Collateral'),
                    $text('Size'),
                  ),
                  columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.2, placeContent: 'flex-end' })),
                  $$body: map(pos => {
                    return $sizeDisplay(pos)
                  })
                },
                {
                  $head: $text('PnL'),
                  columnOp: O(layoutSheet.spacingTiny, style({ flex: 1, placeContent: 'flex-end' })),
                  $$body: map((pos) => {
                    return $pnlValue(pos.realisedPnl - pos.fee)
                  })
                },
              ],
            })({
              scrollIndex: requestAccountTradeListTether(
                zip((wallet, pageIndex) => {
                  if (!wallet || wallet.chain === null) {
                    return null
                  }

                  return {
                    status: TradeStatus.CLOSED,
                    account: wallet.account.address,
                    chain: wallet.chain.id,
                    offset: pageIndex * 20,
                    pageSize: 20,
                  }
                }, walletLink.wallet),
                filterNull
              )
            }),
          ),
        ),
      )



      // router.match(config.parentRoute.create({ fragment: IProfileActiveTab.LAB.toLowerCase() }))(
      //   fadeIn(
      //     $Wardrobe({
      //       chainList: [CHAIN.ARBITRUM],
      //       walletLink: config.walletLink,
      //       parentRoute: config.parentRoute
      //     })({
      //       changeRoute: changeRouteTether(),
      //       changeNetwork: changeNetworkTether(),
      //       walletChange: walletChangeTether(),
      //     })
      //   )
      // ),


      // $responsiveFlex(
      //   $row(style({ flex: 1 }))(
      //     $StakingGraph({
      //       sourceList: config.stake,
      //       stakingInfo: multicast(arbitrumContract),
      //       walletLink: config.walletLink,
      //       // priceFeedHistoryMap: pricefeedQuery,
      //       // graphInterval: GMX.TIME_INTERVAL_MAP.HR4,
      //     })({}),
      //   ),
      // ),

      // $IntermediatePromise({
      //   query: blueberrySubgraph.owner(now({ id: config.account })),
      //   $$done: map(owner => {
      //     if (owner == null) {
      //       return $alert($text(style({ alignSelf: 'center' }))(`Connected account does not own any GBC's`))
      //     }

      //     return $row(layoutSheet.spacingSmall, style({ flexWrap: 'wrap' }))(...owner.ownedTokens.map(token => {
      //       return $berryTileId(token, 85)
      //     }))
      //   }),
      // })({}),

    ),

    {
      changeRoute: mergeArray([
        changeRoute,
        map(mode => {
          const pathName = `/app/wallet/` + mode.toLowerCase()
          if (location.pathname !== pathName) {
            history.pushState(null, '', pathName)
          }

          return pathName
        }, selectProfileMode)
      ])
    }
  ]
})




