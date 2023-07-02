import { Behavior, O } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import { $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { map } from "@most/core"
import { $Link } from "gmx-middleware-ui-components"
import * as viem from "viem"
import { IProfileActiveTab } from "../$Profile"
import { $defaultProfileContainer } from "../../common/$avatar"
import { $accountPreview } from "../../components/$AccountProfile"
import { $CardTable } from "../../components/$common"
import { rootStoreScope } from "../../data"
import { closeEvents, liquidateEvents } from "../../data/tradeList"
import { ISchemaDefinition as ISubgraphSchema, processSources, replaySubgraphQuery } from "../../logic/indexer"
import { ICompetitonCumulativeRoi } from "./$CumulativePnl"
import { IPositionDecrease, IPositionIncrease, IPositionSettled, ITradeLink } from "gmx-middleware-utils"


const gmxTradingSubgraph = replaySubgraphQuery({
  subgraph: `https://gateway-arbitrum.network.thegraph.com/api/${import.meta.env.THE_GRAPH}/subgraphs/id/DJ4SBqiG8A8ytcsNJSuUU2gDTLFXxxPrAN8Aags84JH2`,
  parentStoreScope: rootStoreScope,

})
// ISubgraphSchema<IPositionIncrease | IPositionDecrease>
const adjustEntity = {
  __typename: null,
  blockNumber: null,
  blockTimestamp: null,
  collateralDelta: null,
  collateralToken: null,
  fee: null,
  id: null,
  indexToken: null,
  isLong: null,
  key: null,
  account: null,
  logIndex: null,
  price: null,
  sizeDelta: null,
  transactionHash: null,
  transactionIndex: null
}

const linkSchema: ISubgraphSchema<ITradeLink> = {
  id: null,
  __typename: null,
  account: null,
  blockTimestamp: null,
  collateralToken: null,
  indexToken: null,
  isLong: null,
  key: null,
  logIndex: null,
  transactionHash: null,
  transactionIndex: null,
  updateList: {
    __typename: null,
    averagePrice: null,
    blockNumber: null,
    blockTimestamp: null,
    collateral: null,
    entryFundingRate: null,
    id: null,
    key: null,
    logIndex: null,
    realisedPnl: null,
    reserveAmount: null,
    size: null,
    transactionHash: null,
    transactionIndex: null
  },
  blockNumber: null,
  increaseList: adjustEntity,
  decreaseList: adjustEntity
}

const schemaPositionSettled: ISubgraphSchema<IPositionSettled> = {
  link: linkSchema,
  account: null,
  averagePrice: null,
  collateral: null,
  collateralToken: null,
  cumulativeCollateral: null,
  cumulativeFee: null,
  cumulativeSize: null,
  entryFundingRate: null,
  id: null,
  indexToken: null,
  isCount: null,
  isLiquidated: null,
  isLong: null,
  logIndex: null,
  markPrice: null,
  maxCollateral: null,
  maxSize: null,
  realisedPnl: null,
  reserveAmount: null,
  size: null,
  transactionHash: null,
  transactionIndex: null,
  __typename: 'PositionSettled',
  blockNumber: null,
  blockTimestamp: null
}

const queryww = gmxTradingSubgraph(schemaPositionSettled)


declare function querySubgraph<TSchema, TResult extends keyof TSchema>(queryProperties: Pick<TSchema, TResult>): Pick<TSchema, TResult>

type MyType = { aaa: number; bbbo: number };

const result = querySubgraph<MyType, 'aaa'>({ aaa: 111 })


// result has the type => { aaa: number }

const datass = processSources(
  rootStoreScope,
  {
    positionsSettled: {},
  } as {
    positionsSettled: Record<viem.Address, {
      account: viem.Address,
      winCount: number,
      lossCount: number,
      realisedPnl: bigint,
    }>
    countId: number
  },
  {
    source: closeEvents({}),
    step(seed, value) {


      seed.positionsSettled[value.account] ??= {
        account: value.account,
        realisedPnl: 0n,
        winCount: 0,
        lossCount: 0,
      }

      if (value.realisedPnl > 0n) {
        seed.positionsSettled[value.account].winCount++
      }

      if (value.realisedPnl < 0n) {
        seed.positionsSettled[value.account].lossCount++
      }


      return seed
    },
  },
  {
    source: liquidateEvents({}),
    step(seed, value) {

      seed.positionsSettled[value.account] ??= {
        account: value.account,
        realisedPnl: 0n,
        winCount: 0,
        lossCount: 0,
      }

      seed.positionsSettled[value.account].lossCount++

      return seed
    },
  },
)


export type ILeaderboard = ICompetitonCumulativeRoi

export const $Leaderboard = (config: ILeaderboard) => component((
  [routeChange, routeChangeTether]: Behavior<string, string>,
) => {


  const containerStyle = O(
    layoutSheet.spacingBig,
    style({
      display: 'flex',
      fontFeatureSettings: '"tnum" on,"lnum" on',
      fontFamily: `-apple-system,BlinkMacSystemFont,Trebuchet MS,Roboto,Ubuntu,sans-serif`,
    }),
    screenUtils.isDesktopScreen
      ? style({ width: '780px', alignSelf: 'center' })
      : style({ width: '100%' })
  )

  const newLocal_1 = map(xx => Object.values(xx.positionsSettled), datass)


  return [
    containerStyle(
      $CardTable({
        dataSource: newLocal_1,
        // sortBy,
        columns: [
          {
            $head: $text('Account'),
            columnOp: style({ minWidth: '120px', flex: 2, alignItems: 'center' }),
            $$body: map((pos) => {

              return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                // $alertTooltip($text(`This account requires GBC to receive the prize once competition ends`)),
                $Link({
                  $content: $accountPreview({ address: pos.account, $container: $defaultProfileContainer(style({ minWidth: '50px' })) }),
                  route: config.parentRoute.create({ fragment: 'fefwef' }),
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
              //     $text(style({ fontSize: '.75em' }))(`${pos.rank}`),
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
            columnOp: style({ maxWidth: '88px', alignItems: 'center', placeContent: 'center' }),
            $$body: map((pos) => {
              return $row(
                $text(`${pos.winCount} / ${pos.lossCount}`)
              )
            })
          },

          // {
          //   $head: $column(style({ textAlign: 'right' }))(
          //     $text(style({ fontSize: '.75em' }))('Cum. Collateral'),
          //     $text('Cum. Size'),
          //   ),
          //   sortBy: 'pnl',
          //   columnOp: style({ placeContent: 'flex-end', minWidth: '90px' }),
          //   $$body: map((pos) => {
          //     const val = readableUSD(pos.cumSize, false)

          //     return $column(style({ gap: '3px', textAlign: 'right' }))(
          //       $text(style({ fontSize: '.75em' }))(readableUSD(pos.cumCollateral, false)),
          //       $seperator2,
          //       $text(
          //         val
          //       ),
          //     )
          //   })
          // },
          // {
          //   $head: $column(style({ textAlign: 'right' }))(
          //     $text(style({ fontSize: '.75em' }))(currentMetricLabel),
          //     $text('Prize'),
          //   ),
          //   sortBy: 'score',
          //   columnOp: style({ minWidth: '90px', alignItems: 'center', placeContent: 'flex-end' }),
          //   $$body: map(pos => {
          //     const metricVal = pos.score

          //     const newLocal = readableNumber(formatToBasis(metricVal) * 100)
          //     const pnl = currentMetric === 'pnl' ? readableUSD(metricVal, false) : `${Number(newLocal)} %`

          //     return $column(layoutSheet.spacingTiny, style({ gap: '3px', textAlign: 'right' }))(
          //       $text(style({ fontSize: '.75em' }))(pnl),
          //       $seperator2,
          //       pos.prize > 0n
          //         ? $text(style({ color: pallete.positive }))(readableUSD(pos.prize, false))
          //         : empty(),
          //     )
          //   }),
          // }
        ],
      })({
        // sortBy: sortByChangeTether(),
        // scrollIndex: pageIndexTether()
      })
    ),

    {
      routeChange,
    }
  ]
})





