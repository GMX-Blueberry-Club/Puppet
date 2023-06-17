import { Behavior } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, layoutSheet } from "@aelea/ui-components"
import { chain, map, mergeArray } from "@most/core"
import { CHAIN } from "gmx-middleware-const"
import { IRequestAccountTradeListApi } from "gmx-middleware-utils"
import * as PUPPET from "puppet-middleware-const"
import * as GMX from "gmx-middleware-const"
import { $responsiveFlex } from "../elements/$common"
import { fadeIn } from "../transitions/enter"
import { IProfileActiveTab } from "./$Profile"
import { Address } from "viem"
import { rootStoreScope } from "../data"
import { syncEvent } from "../logic/indexer"
import { IWalletClient } from "../wallet/walletLink"
import { $discoverIdentityDisplay } from "../components/$AccountProfile"



export interface IPuppetPortfolio {
  wallet: IWalletClient,
  parentRoute: Route
  chainList: CHAIN[]
}

export const $PuppetPortfolio = (config: IPuppetPortfolio) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [requestRoutes, requestRoutesTether]: Behavior<number, IRequestAccountTradeListApi>,
  [selectProfileMode, selectProfileModeTether]: Behavior<IProfileActiveTab, IProfileActiveTab>,
) => {

  const $title = $text(style({ fontWeight: 'bold', fontSize: '1.55em' }))

  // const tradingStore = rootStoreScope.scope('puppetPortfolio', empty())



  const routeEvents = syncEvent({
    ...PUPPET.CONTRACT[42161].Route,
    address: '0x568810Dc2E4d5Bd115865CAc16Ffa0B44ef02955' as Address,
    eventName: 'CallbackReceived',
    store: rootStoreScope,
    args: {
      isIncrease: true
    }
  })

  const gmxEvents = syncEvent({
    ...GMX.CONTRACT[42161].PositionRouter,
    // address: '0x568810Dc2E4d5Bd115865CAc16Ffa0B44ef02955' as Address,
    eventName: 'ExecuteIncreasePosition',
    store: rootStoreScope,
    startBlock: 101037003n,
    args: {
      account: '0x568810Dc2E4d5Bd115865CAc16Ffa0B44ef02955'
    }
  }) 

  const depositEvents = syncEvent({
    ...PUPPET.CONTRACT[42161].Orchestrator,
    eventName: 'Deposited',
    store: rootStoreScope,
  }) 

  const withdrawEvents = syncEvent({
    ...PUPPET.CONTRACT[42161].Orchestrator,
    eventName: 'Withdrawn',
    store: rootStoreScope,
  }) 


  return [
    $responsiveFlex(
      layoutSheet.spacingBig,
      // style({ maxWidth: '560px', width: '100%', margin: '0 auto', })
    )(

      $column(layoutSheet.spacingBig, style({ flex: 2 }))(
        chain(ev => $text(JSON.stringify(ev.args)), depositEvents),
        // chain(ev => $text(JSON.stringify(ev.args)), routeEvents),

        fadeIn(
          $column(layoutSheet.spacingBig, style({ flex: 1 }))(
            $discoverIdentityDisplay({
              address: config.wallet.account.address,
              labelSize: '1.5em'
            }),
            // $title('Open Positions'),
            // $CardTable({
            //   dataSource: awaitPromises(gmxSubgraph.accountOpenTradeList(requestAccountTradeList)),
            //   columns: [
            //     {
            //       $head: $text('Time'),
            //       columnOp: O(style({ maxWidth: '60px' })),

            //       $$body: map((req) => {
            //         const isKeeperReq = 'ctx' in req

            //         const timestamp = isKeeperReq ? unixTimestampNow() : req.timestamp

            //         return $column(layoutSheet.spacingTiny, style({ fontSize: '.65em' }))(
            //           $text(timeSince(timestamp) + ' ago'),
            //           $text(readableDate(timestamp)),
            //         )
            //       })
            //     },
            //     {
            //       $head: $text('Entry'),
            //       columnOp: O(style({ maxWidth: '100px' }), layoutSheet.spacingTiny),
            //       $$body: map((pos) => {
            //         return $Index(pos)
            //       })
            //     },
            //     {
            //       $head: $column(style({ textAlign: 'right' }))(
            //         $text(style({ fontSize: '.75em' }))('Collateral'),
            //         $text('Size'),
            //       ),
            //       columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.2, placeContent: 'flex-end' })),
            //       $$body: map(pos => {
            //         const positionMarkPrice = tradeReader.getLatestPrice(now(pos.indexToken))

            //         return $riskLiquidator(pos, positionMarkPrice)
            //       })
            //     },
            //     {
            //       $head: $text('PnL'),
            //       columnOp: O(layoutSheet.spacingTiny, style({ flex: 1, placeContent: 'flex-end' })),
            //       $$body: map((pos) => {
            //         const positionMarkPrice = tradeReader.getLatestPrice(now(pos.indexToken))
            //         const cumulativeFee = tradeReader.vault.read('cumulativeFundingRates', pos.collateralToken)

            //         return $infoTooltipLabel(
            //           $openPositionPnlBreakdown(pos, cumulativeFee, positionMarkPrice),
            //           $TradePnl(pos, cumulativeFee, positionMarkPrice)
            //         )
            //       })
            //     },
            //   ],
            // })({}),

            // $title('Settled Positions'),
            // $CardTable({
            //   dataSource: awaitPromises(gmxSubgraph.accountTradeList(requestAccountTradeList)),
            //   columns: [
            //     {
            //       $head: $text('Time'),
            //       columnOp: O(style({ maxWidth: '60px' })),

            //       $$body: map((req) => {
            //         const isKeeperReq = 'ctx' in req

            //         const timestamp = isKeeperReq ? unixTimestampNow() : req.settledTimestamp

            //         return $column(layoutSheet.spacingTiny, style({ fontSize: '.65em' }))(
            //           $text(timeSince(timestamp) + ' ago'),
            //           $text(readableDate(timestamp)),
            //         )
            //       })
            //     },
            //     {
            //       $head: $text('Entry'),
            //       columnOp: O(style({ maxWidth: '100px' }), layoutSheet.spacingTiny),
            //       $$body: map((pos) => {
            //         return $Index(pos)
            //       })
            //     },
            //     {
            //       $head: $column(style({ textAlign: 'right' }))(
            //         $text(style({ fontSize: '.75em' }))('Collateral'),
            //         $text('Size'),
            //       ),
            //       columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.2, placeContent: 'flex-end' })),
            //       $$body: map(pos => {
            //         return $sizeDisplay(pos)
            //       })
            //     },
            //     {
            //       $head: $text('PnL'),
            //       columnOp: O(layoutSheet.spacingTiny, style({ flex: 1, placeContent: 'flex-end' })),
            //       $$body: map((pos) => {
            //         return $PnlValue(pos.realisedPnl - pos.fee)
            //       })
            //     },
            //   ],
            // })({
            //   scrollIndex: requestAccountTradeListTether(
            //     zip((wallet, pageIndex) => {
            //       if (!wallet || wallet.chain === null) {
            //         return null
            //       }

            //       return {
            //         status: TradeStatus.CLOSED,
            //         account: wallet.account.address,
            //         chain: wallet.chain.id,
            //         offset: pageIndex * 20,
            //         pageSize: 20,
            //       }
            //     }, walletLink.wallet),
            //     filterNull
            //   )
            // }),
          ),
        ),
      )


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




