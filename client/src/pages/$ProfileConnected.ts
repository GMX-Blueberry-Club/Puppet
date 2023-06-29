import { Behavior, O } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, layoutSheet } from "@aelea/ui-components"

import { awaitPromises, map, mergeArray, now, zip } from "@most/core"
import { CHAIN } from "gmx-middleware-const"
import { $ButtonToggle, $defaulButtonToggleContainer, $infoTooltipLabel  } from "gmx-middleware-ui-components"
import { IRequestAccountTradeListApi, TradeStatus, filterNull, gmxSubgraph, readableDate, timeSince, unixTimestampNow } from "gmx-middleware-utils"
import * as PUPPET from "puppet-middleware-const"
import { $CardTable } from "../components/$common"
import { $responsiveFlex } from "../elements/$common"
import * as tradeReader from "../logic/trade"
import { fadeIn } from "../transitions/enter"
import { walletLink } from "../wallet"
import { IProfileActiveTab } from "./$Profile"

import { JSProcessor, fromJSProcessor } from "ethereum-indexer-js-processor"
import { createIndexerState, keepStateOnIndexedDB } from "gmx-middleware-browser-indexer"
import { $entry, $riskLiquidator, $openPositionPnlBreakdown, $TradePnl, $sizeDisplay, $PnlValue } from "../common/$common"


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
const processor: JSProcessor<typeof contract.abi, State> = {
  // you can set a version, ideally you would generate it so that it changes for each change
  // when a version changes, the indexer will detect that and clear the state
  // if it has the event stream cached, it will repopulate the state automatically
  version: "0.0.2",
  // this function set the starting state
  // this allow the app to always have access to a state, no undefined needed
  construct() {
    return {
      greetings: []
    }
  },
  onCreatedIncreasePositionRequest(state, event) {

    debugger
    const greetingFound = state.greetings.find(
      (v) => v.account === event.args.acceptablePrice
    )

  }
  // each event has an associated on<EventName> function which is given both the current state and the typed event
  // each event's argument can be accessed via the `args` field
  // it then modify the state as it wishes
  // behind the scene, the JSProcessor will handle reorg by reverting and applying new events automatically
  // onMessageChanged(state, event): void {
  //   const greetingFound = state.greetings.find(
  //     (v) => v.account === event.args.user
  //   )
  //   if (greetingFound) {
  //     greetingFound.message = event.args.message
  //   } else {
  //     state.greetings.push({
  //       message: event.args.message,
  //       account: event.args.user,
  //     })
  //   }
  // },
}

// we setup the indexer via a call to `createIndexerState`
// this setup a set of observable (subscribe pattern)
// including one for the current state (computed by the processor above)
// and one for the syncing
// we then call `.withHooks(react)` to transform these observable in react hooks ready to be used.
const indexer = createIndexerState(
  fromJSProcessor(processor)(),
  {
    keepState: keepStateOnIndexedDB("basic") as any,
  }
)





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




