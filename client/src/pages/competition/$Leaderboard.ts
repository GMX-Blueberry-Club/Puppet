import { Behavior, O } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { $CumulativePnl, ICompetitonCumulativeRoi } from "./$CumulativePnl"
import { processSources } from "../../logic/indexer"
import { rootStoreScope } from "../../data"
import * as viem from "viem"
import { ITradeSettled, formatReadableUSD, formatToBasis, invertColor, readableNumber } from "gmx-middleware-utils"
import { closeEvents, decreaseEvents, increaseEvents, liquidateEvents, updateEvents } from "../../data/tradeList"
import { pallete, colorAlpha } from "@aelea/ui-components-theme"
import { snapshot, empty, map } from "@most/core"
import { $alertTooltip, $Link } from "gmx-middleware-ui-components"
import { IProfileActiveTab } from "../$Profile"
import { IBlueberryLadder } from "../../../../@gambitdao-gbc-middleware/src"
import { $defaultProfileContainer } from "../../common/$avatar"
import { $accountPreview, $profilePreview } from "../../components/$AccountProfile"
import { $defaultBerry } from "../../components/$DisplayBerry"
import { $CardTable } from "../../components/$common"
import { walletLink } from "../../wallet"
import { $seperator2 } from "../common"


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
    source: closeEvents({  }),
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
    source: liquidateEvents({  }),
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
          //     const val = formatReadableUSD(pos.cumSize, false)

          //     return $column(style({ gap: '3px', textAlign: 'right' }))(
          //       $text(style({ fontSize: '.75em' }))(formatReadableUSD(pos.cumCollateral, false)),
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
          //     const pnl = currentMetric === 'pnl' ? formatReadableUSD(metricVal, false) : `${Number(newLocal)} %`

          //     return $column(layoutSheet.spacingTiny, style({ gap: '3px', textAlign: 'right' }))(
          //       $text(style({ fontSize: '.75em' }))(pnl),
          //       $seperator2,
          //       pos.prize > 0n
          //         ? $text(style({ color: pallete.positive }))(formatReadableUSD(pos.prize, false))
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





