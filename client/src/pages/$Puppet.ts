import { Behavior } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, layoutSheet } from "@aelea/ui-components"

import { awaitPromises, empty, map, mergeArray } from "@most/core"
import { CHAIN } from "gmx-middleware-const"
import { IRequestAccountTradeListApi, filterNull } from "gmx-middleware-utils"
import * as PUPPET from "puppet-middleware-const"
import { $responsiveFlex } from "../elements/$common"
import { fadeIn } from "../transitions/enter"
import { IProfileActiveTab } from "./$Profile"

import { JSProcessor, fromJSProcessor } from "ethereum-indexer-js-processor"
import { createIndexerState, keepStateOnIndexedDB } from "gmx-middleware-browser-indexer"
import { Address } from "viem"
import { rootStoreScope } from "../data"
import { connectContract } from "../logic/common"
import * as database from "../logic/database"
import { publicClient } from "../wallet/walletLink"
import { getStoredEvents } from "../logic/indexer"

// we need the contract info
// the abi will be used by the processor to have its type generated, allowing you to get type-safety
// the adress will be given to the indexer, so it index only this contract
// the startBlock field allow to tell the indexer to start indexing from that point only
// here it is the block at which the contract was deployed
const contract = {
  ...PUPPET.CONTRACT[42161].Route,
  address: '0x568810Dc2E4d5Bd115865CAc16Ffa0B44ef02955',
  startBlock: 99683620,
} as const

// we define the type of the state computed by the processor
// we can also declare it inline in the generic type of JSProcessor
type State = { greetings: { account: `0x${string}`; message: string }[] };

// the processor is given the type of the ABI as Generic type to get generated
// it also specify the type which represent the current state
// const processor: JSProcessor<typeof contract.abi, State> = {
//   // you can set a version, ideally you would generate it so that it changes for each change
//   // when a version changes, the indexer will detect that and clear the state
//   // if it has the event stream cached, it will repopulate the state automatically
//   version: "0.0.2",
//   // this function set the starting state
//   // this allow the app to always have access to a state, no undefined needed
//   construct() {
//     return {
//       greetings: []
//     }
//   },
//   onCreatedIncreasePositionRequest(state, event) {
//     debugger
//     const greetingFound = state.greetings.find(
//       (v) => v.account === event.args.acceptablePrice
//     )
//   }
// }


// const indexer = createIndexerState(
//   fromJSProcessor(processor)(),
//   {
//     keepState: keepStateOnIndexedDB("basic") as any,
//   }
// ).startAutoIndexing()


// indexer.init({
//   provider: ethereum,
//   source: { chainId, contracts: [contract] },
// })



export interface IPuppetPortfolio {
  address: Address,
  parentRoute: Route
  chainList: CHAIN[]
}

export const $PuppetPortfolio = (config: IPuppetPortfolio) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [requestRoutes, requestRoutesTether]: Behavior<number, IRequestAccountTradeListApi>,
  [selectProfileMode, selectProfileModeTether]: Behavior<IProfileActiveTab, IProfileActiveTab>,
) => {

  const $title = $text(style({ fontWeight: 'bold', fontSize: '1.55em' }))

  const tradingStore = rootStoreScope.scope('puppetPortfolio', empty())

  const route = {
    ...PUPPET.CONTRACT[42161].Route,
    address: '0x568810Dc2E4d5Bd115865CAc16Ffa0B44ef02955' as Address,
  }


  const requests = getStoredEvents({
    ...route,
    fromBlock: 99683620n,
    eventName: 'CreatedIncreasePositionRequest',
    store: tradingStore,
  }) 

  


  return [
    $responsiveFlex(
      layoutSheet.spacingBig,
      // style({ maxWidth: '560px', width: '100%', margin: '0 auto', })
    )(

      $column(layoutSheet.spacingBig, style({ flex: 2 }))(
        requests,

        fadeIn(
          $column(layoutSheet.spacingBig, style({ flex: 1 }))(
            $title('Open Positions'),
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




