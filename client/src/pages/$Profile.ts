import { Behavior, O } from "@aelea/core"
import { $Node, $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, layoutSheet } from "@aelea/ui-components"
import { awaitPromises, combine, map, mergeArray, now } from "@most/core"
import { $ButtonToggle, $Table, $defaulButtonToggleContainer, $infoTooltipLabel } from "gmx-middleware-ui-components"
import {
  IRequestAccountTradeListApi,
  gmxSubgraph,
  readableDate, timeSince,
  unixTimestampNow
} from "gmx-middleware-utils"
import { Address } from "viem"
import { $PnlValue, $TradePnl, $entry, $openPositionPnlBreakdown, $riskLiquidator, $sizeDisplay } from "../common/$common"
import { $CardTable } from "../components/$common"
import { $card } from "../elements/$common"
import * as tradeReader from "../logic/trade"
import { fadeIn } from "../transitions/enter"
import { walletLink } from "../wallet"



export enum IProfileActiveTab {
  TRADING = 'Trading',
  BERRIES = 'Berries',
  LAB = "Lab",
  IDENTITY = "Identity"
}

export interface IProfile {
  account: Address
  parentUrl: string
  parentRoute: Route

  $accountDisplay: $Node
}

const $title = $text(style({ fontWeight: 'bold', fontSize: '1.35em' }))

export const $Profile = (config: IProfile) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [selectProfileMode, selectProfileModeTether]: Behavior<IProfileActiveTab, IProfileActiveTab>,
  [requestAccountTradeList, requestAccountTradeListTether]: Behavior<number, IRequestAccountTradeListApi>,
) => {


  const accountOpenTradeList = gmxSubgraph.accountOpenTradeList(
    map(chain => {
      return {
        account: config.account,
        chain: chain.id,
      }
    }, walletLink.chain)
  )


  return [

    $column(layoutSheet.spacingBig, style({ width: '100%', maxWidth: '550px', margin: '0 auto', alignItems: 'center' }))(
      config.$accountDisplay,

      $ButtonToggle({
        $container: $defaulButtonToggleContainer(style({ alignSelf: 'center', })),
        selected: mergeArray([selectProfileMode, now(location.pathname.split('/').slice(-1)[0] === IProfileActiveTab.BERRIES.toLowerCase() ? IProfileActiveTab.BERRIES : IProfileActiveTab.TRADING)]),
        options: [
          IProfileActiveTab.BERRIES,
          IProfileActiveTab.TRADING,
          // IProfileActiveTab.WARDROBE,
        ],
        $$option: map(option => {
          return $text(option)
        })
      })({ select: selectProfileModeTether() }),


      $column(layoutSheet.spacingBig, style({ width: '100%' }))(
        fadeIn(
          $card(layoutSheet.spacingBig, style({ flex: 1 }))(
            $title('Open Positions'),
            $Table({
              dataSource: awaitPromises(accountOpenTradeList),
              columns: [
                {
                  $head: $text('Time'),
                  columnOp: O(style({ maxWidth: '60px' })),

                  $$body: map((req) => {
                    const isKeeperReq = 'ctx' in req

                    const timestamp = isKeeperReq ? unixTimestampNow() : req.timestamp

                    return $column(layoutSheet.spacingTiny, style({ fontSize: '.65em' }))(
                      $text(timeSince(timestamp) + ' ago'),
                      $text(readableDate(timestamp)),
                    )
                  })
                },
                {
                  $head: $text('Entry'),
                  columnOp: O(style({ maxWidth: '100px' }), layoutSheet.spacingTiny),
                  $$body: map((pos) => {
                    return $Entry(pos)
                  })
                },
                {
                  $head: $column(style({ textAlign: 'right' }))(
                    $text(style({ fontSize: '.75em' }))('Collateral'),
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

                    return $column(layoutSheet.spacingTiny, style({ fontSize: '.65em' }))(
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
                    $text(style({ fontSize: '.75em' }))('Collateral'),
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
                    return $PnlValue(pos.realisedPnl - pos.fee)
                  })
                },
              ],
            })({
              scrollIndex: requestAccountTradeListTether(
                combine((chain, pageIndex) => {
                  return {
                    account: config.account,
                    chain: chain.id,
                    offset: pageIndex * 20,
                    pageSize: 20,
                  }
                }, walletLink.chain)
              )
            }),
          ),
        )

        // router.match(config.parentRoute.create({ fragment: IProfileActiveTab.WARDROBE.toLowerCase() }))(
        //   fadeIn(
        //     $Wardrobe({ chainList: [CHAIN.ARBITRUM], walletLink: config.walletLink, parentRoute: config.parentRoute })({
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

    ),

    {
      changeRoute: mergeArray([
        changeRoute,
        map(mode => {
          const pathName = config.parentUrl + mode.toLowerCase()
          if (location.pathname !== pathName) {
            history.pushState(null, '', pathName)
          }

          return pathName
        }, selectProfileMode)
      ])
    }
  ]
})


