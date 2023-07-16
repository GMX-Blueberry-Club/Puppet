import { Behavior, O } from "@aelea/core"
import { $Node, $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, layoutSheet } from "@aelea/ui-components"
import { map, mergeArray, multicast, now } from "@most/core"
import { Chain } from "@wagmi/core"
import { $ButtonToggle, $defaulButtonToggleContainer, $infoTooltipLabel } from "gmx-middleware-ui-components"
import {
  IRequestAccountTradeListApi, readableDate, timeSince
} from "gmx-middleware-utils"
import { Address } from "viem"
import { $TradePnl, $entry, $openPositionPnlBreakdown, $pnlValue, $riskLiquidator, $settledSizeDisplay } from "../common/$common"
import { $CardTable } from "../components/$common"
import { connectTrade } from "../logic/trade"
import { gmxData } from "../data/process"



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
  chain: Chain

  $accountDisplay: $Node
}

const $title = $text(style({ fontWeight: 'bold', fontSize: '1.35em' }))

export const $Profile = (config: IProfile) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [selectProfileMode, selectProfileModeTether]: Behavior<IProfileActiveTab, IProfileActiveTab>,
  [requestAccountTradeList, requestAccountTradeListTether]: Behavior<number, IRequestAccountTradeListApi>,
) => {


  const mcP = multicast(gmxData.gmxTrading)

  const openTrades = map(list => {
    const newLocal = Object.values(list.positionSlots).filter(p => p.account === config.account)
    return newLocal
  }, mcP)


  const trades = map(list => {
    const newLocal = Object.values(list.positionsSettled).filter(p => p.account === config.account)
    return newLocal
  }, mcP)

  // const accountOpenTradeList = gmxSubgraph.accountOpenTradeList(
  //   map(chain => {
  //     return {
  //       account: config.account,
  //       chain: chain.id,
  //     }
  //   }, walletLink.chain)
  // )

  const tradeReader = connectTrade(config.chain)

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


      $column(layoutSheet.spacingBig, style({ flex: 1 }))(


        $title('Open Positions'),
        $CardTable({
          dataSource: openTrades,
          columns: [
            {
              $head: $text('Open Time'),
              columnOp: style({ maxWidth: '80px' }),
              $$body: map((pos) => {

                const timestamp = pos.cumulativeSize

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
                  $TradePnl(pos, positionMarkPrice)
                )
              })
            },
          ],
        })({}),

        $title('Settled Positions'),
        $CardTable({
          dataSource: trades,
          columns: [
            {
              $head: $text('Settle Time'),
              columnOp: O(style({ maxWidth: '100px' })),

              $$body: map((req) => {
                const isKeeperReq = 'ctx' in req

                // const timestamp = isKeeperReq ? unixTimestampNow() : req.settlement.blockTimestamp

                return $column(layoutSheet.spacingTiny)(
                  // $text(timeSince(timestamp) + ' ago'),
                  // $text(style({ fontSize: '.75rem' }))(readableDate(timestamp)),
                )
              })
            },
            {
              $head: $column(style({ textAlign: 'right' }))(
                $text('Entry'),
                $text(style({ fontSize: '.75rem' }))('Price'),
              ),
              columnOp: O(style({ maxWidth: '100px' }), layoutSheet.spacingTiny),
              $$body: map((pos) => {
                return $entry(pos)
              })
            },
            {
              $head: $column(style({ textAlign: 'right' }))(
                $text('Max Size'),
                $text(style({ fontSize: '.75rem' }))('Leverage / Liquidation'),
              ),
              columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.2, placeContent: 'flex-end' })),
              $$body: map(pos => {
                return $settledSizeDisplay(pos)
              })
            },
            {
              $head: $text('PnL'),
              columnOp: O(layoutSheet.spacingTiny, style({ flex: 1, placeContent: 'flex-end' })),
              $$body: map((pos) => {
                return $pnlValue(pos.realisedPnl - pos.cumulativeFee)
              })
            },
          ],
        })({
          // scrollIndex: requestAccountTradeListTether(
          //   zip((wallet, pageIndex) => {
          //     if (!wallet || wallet.chain === null) {
          //       return null
          //     }

          //     return {
          //       status: TradeStatus.CLOSED,
          //       account: wallet.account.address,
          //       chain: wallet.chain.id,
          //       offset: pageIndex * 20,
          //       pageSize: 20,
          //     }
          //   }, walletLink.wallet),
          //   filterNull
          // )
        }),
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


