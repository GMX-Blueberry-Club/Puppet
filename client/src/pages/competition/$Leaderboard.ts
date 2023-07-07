import { Behavior, O } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { map, now, recoverWith } from "@most/core"
import { $Link } from "gmx-middleware-ui-components"
import { IPositionLink, IPositionSettled, toAccountSummaryList } from "gmx-middleware-utils"
import { IProfileActiveTab } from "../$Profile"
import { $defaultProfileContainer } from "../../common/$avatar"
import { $accountPreview } from "../../components/$AccountProfile"
import { $CardTable } from "../../components/$common"
import { rootStoreScope } from "../../data"
import { replaySubgraphQuery } from "../../logic/indexer"
import { ISchema } from "../../logic/querySubgraph"
import { ICompetitonCumulativeRoi } from "./$CumulativePnl"



// ISubgraphSchema<IPositionIncrease | IPositionDecrease>
const adjustEntity = {
  collateralDelta: 'uint256',
  collateralToken: 'uint256',
  fee: 'uint256',
  id: 'uint256',
  indexToken: 'uint256',
  isLong: 'bool',
  key: 'uint256',
  account: 'uint256',
  price: 'uint256',
  sizeDelta: 'uint256',

  blockNumber: 'int',
  blockTimestamp: 'uint256',
  transactionHash: 'uint256',
  transactionIndex: 'uint256',
  logIndex: 'uint256',
} as const

const linkSchema: ISchema<IPositionLink> = {
  id: 'uint256',
  account: 'uint256',
  collateralToken: 'uint256',
  indexToken: 'uint256',
  isLong: 'bool',
  key: 'uint256',
  updateList: {
    id: 'uint256',

    averagePrice: 'uint256',
    collateral: 'uint256',
    entryFundingRate: 'uint256',
    key: 'uint256',
    realisedPnl: 'uint256',
    reserveAmount: 'uint256',
    size: 'uint256',

    blockNumber: 'int',
    blockTimestamp: 'uint256',
    transactionHash: 'uint256',
    transactionIndex: 'uint256',
    logIndex: 'uint256',
    __typename: 'UpdatePosition',
  },
  increaseList: { ...adjustEntity, __typename: 'IncreasePosition' },
  decreaseList: { ...adjustEntity, __typename: 'DecreasePosition' },

  blockNumber: 'int',
  blockTimestamp: 'uint256',
  transactionHash: 'uint256',
  transactionIndex: 'uint256',
  logIndex: 'uint256',

  __typename: 'PositionLink',
}

const schemaPositionSettled: ISchema<IPositionSettled> = {
  link: linkSchema,
  id: 'string',
  key: 'uint256',
  idCount: 'int',

  account: 'string',
  collateralToken: 'string',
  indexToken: 'string',
  isLong: 'bool',

  size: 'uint256',
  collateral: 'uint256',
  averagePrice: 'uint256',
  entryFundingRate: 'uint256',
  reserveAmount: 'uint256',
  realisedPnl: 'int256',

  cumulativeSize: 'uint256',
  cumulativeCollateral: 'uint256',
  cumulativeFee: 'uint256',

  maxSize: 'uint256',
  maxCollateral: 'uint256',

  settlePrice: 'uint256',
  isLiquidated: 'bool',

  blockNumber: 'int',
  blockTimestamp: 'uint256',
  transactionHash: 'uint256',
  transactionIndex: 'uint256',
  logIndex: 'uint256',

  __typename: 'PositionSettled',
}


function fullQuery(obj: any){
  return Object.keys(obj).reduce((acc, key) => {
    const value = obj[key]
    acc[key] = value instanceof Object ? fullQuery(value) : null
    return acc
  }, {} as any)
}

const newLocal: IPositionSettled = {
  ...fullQuery(schemaPositionSettled)
}

const gmxTradingSubgraph = replaySubgraphQuery(
  {
    subgraph: `https://api.studio.thegraph.com/query/112/gmx-house/v0.0.10`,
    parentStoreScope: rootStoreScope,
  },
  schemaPositionSettled,
  newLocal
)




const datass = map(trades => {


  const newLocal = toAccountSummaryList(trades.logHistory)
  return newLocal
}, gmxTradingSubgraph)


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



  return [
    $column(
      containerStyle(
        $CardTable({
          dataSource: datass,
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
      )
    ),

    {
      routeChange,
    }
  ]
})





