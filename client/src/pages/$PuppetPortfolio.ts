import { Behavior, O } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { map, mergeArray, now } from "@most/core"
import { CHAIN } from "gmx-middleware-const"
import { $Table, $infoTooltipLabel } from "gmx-middleware-ui-components"
import { IRequestAccountTradeListApi, readableDate, timeSince, unixTimestampNow } from "gmx-middleware-utils"
import { $pnlValue, $TradePnl, $entry, $openPositionPnlBreakdown, $riskLiquidator, $settledSizeDisplay } from "../common/$common"
import { $discoverIdentityDisplay } from "../components/$AccountProfile"
import { $CardTable } from "../components/$common"
import { $responsiveFlex } from "../elements/$common"
import { connectTrade } from "../logic/trade"
import { fadeIn } from "../transitions/enter"
import { IWalletClient } from "../wallet/walletLink"
import { IProfileActiveTab } from "./$Profile"
import { connectContract } from "../logic/common"
import * as PUPPET from "puppet-middleware-const"
import * as viem from "viem"


// const logEvents = mergeArray(logs.map(l => {
//   const n = Number(l.orderIdentifier)
//   const scheduleTime = n / Math.pow(10, n.toString().length)
//   return at(scheduleTime, l)
// })).run({
//   ...nullSink,
//   event: (time, value) => {
//     console.log(value.orderIdentifier)
//   },
// }, newDefaultScheduler())

export interface IPuppetPortfolio {
  address: viem.Address,
  parentRoute: Route
  chainList: CHAIN[]
}

export const $PuppetPortfolio = (config: IPuppetPortfolio) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [requestRoutes, requestRoutesTether]: Behavior<number, IRequestAccountTradeListApi>,
  [selectProfileMode, selectProfileModeTether]: Behavior<IProfileActiveTab, IProfileActiveTab>,
) => {

  const $title = $text(style({ fontWeight: 'bold', fontSize: '1.55em' }))
  const orchestrator = connectContract(PUPPET.CONTRACT[42161].Orchestrator)
  const subscription = orchestrator.read('puppetSubscriptions', config.address)

  // const tradeReader = connectTrade(config.wallet.chain)



  return [
    $responsiveFlex(
      layoutSheet.spacingBig,
      // style({ maxWidth: '560px', width: '100%', margin: '0 auto', })
    )(
      

      $column(layoutSheet.spacingBig, style({ flex: 2 }))(

        // $card(style({ height: '200px' }))(
        //   switchLatest(map(data => $Baseline({
        //     initializeSeries: map(api => {
        //       const series = api.addBaselineSeries({
        //         topLineColor: pallete.positive,
        //         baseValue: {
        //           type: 'price',
        //           price: 0,
        //         },
        //         lineWidth: 2,
        //         baseLineVisible: false,
        //         lastValueVisible: false,
        //         priceLineVisible: false,
        //       })

        //       series.setData(data.map(({ time, value }) => ({ time: time as Time, value: formatFixed(value, 30) })))

        //       const high = data[data.reduce((seed, b, idx) => b.value > data[seed].value ? idx : seed, Math.min(6, data.length - 1))]
        //       const low = data[data.reduce((seed, b, idx) => b.value <= data[seed].value ? idx : seed, 0)]

        //       if (high.value > 0 && low.value < 0) {
        //         series.createPriceLine({
        //           price: 0,
        //           color: pallete.foreground,
        //           lineVisible: true,
        //           lineWidth: 1,
        //           axisLabelVisible: true,
        //           title: '',
        //           lineStyle: LineStyle.SparseDotted,
        //         })
        //       }

        //       series.applyOptions({
        //         scaleMargins: {
        //           top: .45,
        //           bottom: 0
        //         }
        //       })

        //       setTimeout(() => {
        //         api.timeScale().fitContent()
        //       }, 50)

        //       return series
        //     }),
        //     chartConfig: {
        //       handleScale: false,

        //       rightPriceScale: {
        //         visible: false,
        //         scaleMargins: {
        //           top: .45,
        //           bottom: 0
        //         },
        //       },
        //       handleScroll: false,
        //       timeScale: {
        //         // rightOffset: 110,
        //         secondsVisible: false,
        //         timeVisible: true,
        //         // visible: false,
        //         rightBarStaysOnScroll: true,
        //       }
        //     },
        //     containerOp: style({
        //       display: 'flex',
        //       // position: 'absolute', left: 0, top: 0, right: 0, bottom: 0
        //     }),
        //   })({
        //     crosshairMove: pnlCrosshairMoveTether(
        //       skipRepeatsWith((a, b) => a.point?.x === b.point?.x)
        //     )
        //   }), combineObject({})))
        // ),



        $node(),


        fadeIn(
          $column(layoutSheet.spacingBig, style({ flex: 1 }))(


            $title('Open Positions'),
            // $Table({
            //   dataSource: openPositionList,
            //   columns: [
            //     {
            //       $head: $text('Open Time'),
            //       columnOp: style({ maxWidth: '80px' }),
            //       $$body: map((pos) => {

            //         const timestamp = pos.increaseList[0].blockTimestamp

            //         return $column(layoutSheet.spacingTiny, style({ fontSize: '.75rem' }))(
            //           $text(timeSince(timestamp) + ' ago'),
            //           $text(readableDate(timestamp)),
            //         )
            //       })
            //     },
            //     {
            //       $head: $text('Entry'),
            //       columnOp: O(style({ maxWidth: '100px' }), layoutSheet.spacingTiny),
            //       $$body: map((pos) => {
            //         return $entry(pos)
            //       })
            //     },
            //     {
            //       $head: $column(style({ textAlign: 'right' }))(
            //         $text(style({ fontSize: '.75rem' }))('Collateral'),
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
            //           $TradePnl(pos, positionMarkPrice)
            //         )
            //       })
            //     },
            //   ],
            // })({}),

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




