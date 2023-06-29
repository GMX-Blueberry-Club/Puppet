import { Behavior, O, combineObject } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { Route } from "@aelea/router"
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { join, map, mergeArray, now, skipRepeatsWith, switchLatest } from "@most/core"
import * as GMX from "gmx-middleware-const"
import { CHAIN } from "gmx-middleware-const"
import { $Baseline, $PnlValue, $TradePnl, $infoTooltipLabel, $openPositionPnlBreakdown, $riskLiquidator, $sizeDisplay } from "gmx-middleware-ui-components"
import { IRequestAccountTradeListApi, ITrade, ITradeSettled, formatFixed, formatReadableUSD, getTokenDescription, getTradeTotalFee, readableDate, timeSince, unixTimeTzOffset, unixTimestampNow } from "gmx-middleware-utils"
import * as viem from "viem"
import { $discoverIdentityDisplay } from "../components/$AccountProfile"
import { $CardTable } from "../components/$common"
import { rootStoreScope } from "../data"
import { $card, $responsiveFlex } from "../elements/$common"
import { processSources, replaySubgraphEvent } from "../logic/indexer"
import { connectTrade } from "../logic/trade"
import { fadeIn } from "../transitions/enter"
import { IWalletClient } from "../wallet/walletLink"
import { IProfileActiveTab } from "./$Profile"
import { $Index } from "./competition/$Leaderboard"
import { $Chart } from "gmx-middleware-ui-components/src/chart/$Chart"
import { pallete } from "@aelea/ui-components-theme"
import { SeriesMarker, Time, PriceScaleMode, CrosshairMode, LineStyle } from "lightweight-charts"

const logs = [
  {
    account: "0x364ed130c39baa6f9f64c2961d93c52321bc4f4d",
    indexToken: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
    transactionIndex: 2n,
    logIndex: 20n,
    blockTimestamp: 1687365680n,
    blockNumber: 103487081n,
    orderIdentifier: 1034870812020n,
  },
  {
    account: "0xa37d1bfc67f20ac3d88a3d50e2d315a95161d89c",
    indexToken: "0xf97f4df75117a78c1a5a0dbb814af92458539fb4",
    transactionIndex: 2n,
    logIndex: 18n,
    blockTimestamp: 1687354227n,
    blockNumber: 103441117n,
    orderIdentifier: 1034411172018n,

  },
  {
    account: "0xb855598131e5ad8f727d9e19fa299e9d23466c95",
    indexToken: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
    transactionIndex: 3n,
    logIndex: 16n,
    blockTimestamp: 1687401633n,
    blockNumber: 103626756n,
    orderIdentifier: 1036267563016n,
  }
]

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


  // const routeEvents = replaySubgraphEvent({
  //   ...PUPPET.CONTRACT[42161].Route,
  //   address: '0x568810Dc2E4d5Bd115865CAc16Ffa0B44ef02955',
  //   eventName: 'CallbackReceived',
  //   parentStoreScope: rootStoreScope,
  //   args: {
  //     isIncrease: true
  //   }
  // })

  // const gmxEvents = replaySubgraphEvent({
  //   ...GMX.CONTRACT[42161].PositionRouter,
  //   // address: '0x568810Dc2E4d5Bd115865CAc16Ffa0B44ef02955' as Address,
  //   eventName: 'ExecuteIncreasePosition',
  //   parentStoreScope: rootStoreScope,
  //   startBlock: 101037003n,
  //   args: {
  //     account: '0x568810Dc2E4d5Bd115865CAc16Ffa0B44ef02955'
  //   }
  // })

  // const depositEvents = replaySubgraphEvent({
  //   ...PUPPET.CONTRACT[42161].Orchestrator,
  //   eventName: 'Deposited',
  //   parentStoreScope: rootStoreScope,
  // })

  // const withdrawEvents = replaySubgraphEvent({
  //   ...PUPPET.CONTRACT[42161].Orchestrator,
  //   eventName: 'Withdrawn',
  //   parentStoreScope: rootStoreScope,
  // })

  const tradeReader = connectTrade(config.wallet.chain)


  const increaseEvents = replaySubgraphEvent({
    ...GMX.CONTRACT[42161].Vault,
    eventName: 'IncreasePosition',
    parentStoreScope: rootStoreScope,
    args: {
      account: '0x30fd54c890f250d260c4d7daead65925492936e0',
    }
  })

  const decreaseEvents = replaySubgraphEvent({
    ...GMX.CONTRACT[42161].Vault,
    eventName: 'DecreasePosition',
    parentStoreScope: rootStoreScope,
    args: {
      account: '0x30fd54c890f250d260c4d7daead65925492936e0',
    }
  })

  const closeEvents = replaySubgraphEvent({
    ...GMX.CONTRACT[42161].Vault,
    eventName: 'ClosePosition',
    parentStoreScope: rootStoreScope,
    args: {
      account: '0x30fd54c890f250d260c4d7daead65925492936e0',
    }
  })
  const liquidateEvents = replaySubgraphEvent({
    ...GMX.CONTRACT[42161].Vault,
    eventName: 'LiquidatePosition',
    parentStoreScope: rootStoreScope,
    args: {
      account: '0x30fd54c890f250d260c4d7daead65925492936e0',
    }
  })

  const updateEvents = replaySubgraphEvent({
    ...GMX.CONTRACT[42161].Vault,
    eventName: 'UpdatePosition',
    parentStoreScope: rootStoreScope,
    args: {
      account: '0x30fd54c890f250d260c4d7daead65925492936e0',
    }
  })


  interface IStoredPositionMap {
    positions: Record<viem.Hex, ITrade>
    positionsSettled: Record<viem.Hex, ITradeSettled>
    countId: number
  }


  function getStoredPositionCounterId(seed: IStoredPositionMap, key: viem.Hex): viem.Hex {
    return `${key}-${seed.countId}`
  }

  const positions = processSources(
    rootStoreScope,
    {
      countId: 0,
      positions: {},
      positionsSettled: {},
    } as IStoredPositionMap,
    {
      source: increaseEvents,
      step(seed, value) {
        const key = getStoredPositionCounterId(seed, value.key)

        seed.positions[key].increaseList.push(value)

        return {
          ...seed,
          key,
          account: value.account,
          collateralToken: value.collateralToken,
          indexToken: value.indexToken,
          isLong: value.isLong,

          updateList: [],
        }
      },
    },
    {
      source: decreaseEvents,
      step(seed, value) {
        const key = getStoredPositionCounterId(seed, value.key)
        if (!seed.positions[key]) {
          throw new Error('position not found')
        }

        seed.positions[key].decreaseList.push(value)

        return seed
      },
    },
    {
      source: updateEvents,
      step(seed, value) {
        const key = getStoredPositionCounterId(seed, value.key)

        if (!seed.positions[key]) {
          throw new Error('position not found')
        }

        const trade = seed.positions[key]

        trade.updateList.push(value as any)
        trade.maxCollateral = value.collateral > trade.maxCollateral ? value.collateral : trade.maxCollateral
        trade.maxSize = value.size > trade.maxSize ? value.size : trade.maxSize

        return seed
      },
    },
    {
      source: closeEvents,
      step(seed, value) {
        const key = getStoredPositionCounterId(seed, value.key)

        if (!seed.positions[key]) {
          throw new Error('position not found')
        }

        const trade = seed.positions[key]

        delete seed.positions[key]


        seed.positionsSettled[key] = {
          ...trade,
          isLiquidated: false,
          settlement: value
        }

        seed.countId++

        return seed
      },
    },
    {
      source: liquidateEvents,
      step(seed, value) {
        const key = getStoredPositionCounterId(seed, value.key)

        if (!seed.positions[key]) {
          throw new Error('position not found')
        }

        const trade = seed.positions[key]

        debugger

        delete seed.positions[key]

        seed.positionsSettled[key] = {
          ...trade,
          isLiquidated: false,
          settlement: value
        }

        seed.countId++

        return seed
      },
    },
  )


  const openPositionList = map(pos => {
    return Object.values(pos.positions)
  }, positions)
  const settledPositionList = map(pos => {
    return Object.values(pos.positionsSettled)
  }, positions)

  const positionList = map(pos => {
    return [...Object.values(pos.positionsSettled), ...Object.values(pos.positions)]
  }, positions)
  return [
    $responsiveFlex(
      layoutSheet.spacingBig,
      // style({ maxWidth: '560px', width: '100%', margin: '0 auto', })
    )(
      

      $column(layoutSheet.spacingBig, style({ flex: 2 }))(

        $row(style({  placeContent: 'center' }))(
          $discoverIdentityDisplay({
            address: config.wallet.account.address,
            labelSize: '1.5em'
          }),
        ),

        $card(style({ height: '200px' }))(
          switchLatest(map(data => $Baseline({
            initializeSeries: map(api => {
              const series = api.addBaselineSeries({
                topLineColor: pallete.positive,
                baseValue: {
                  type: 'price',
                  price: 0,
                },
                lineWidth: 2,
                baseLineVisible: false,
                lastValueVisible: false,
                priceLineVisible: false,
              })

              series.setData(data.map(({ time, value }) => ({ time: time as Time, value: formatFixed(value, 30) })))

              const high = data[data.reduce((seed, b, idx) => b.value > data[seed].value ? idx : seed, Math.min(6, data.length - 1))]
              const low = data[data.reduce((seed, b, idx) => b.value <= data[seed].value ? idx : seed, 0)]

              if (high.value > 0 && low.value < 0) {
                series.createPriceLine({
                  price: 0,
                  color: pallete.foreground,
                  lineVisible: true,
                  lineWidth: 1,
                  axisLabelVisible: true,
                  title: '',
                  lineStyle: LineStyle.SparseDotted,
                })
              }

              series.applyOptions({
                scaleMargins: {
                  top: .45,
                  bottom: 0
                }
              })

              setTimeout(() => {
                api.timeScale().fitContent()
              }, 50)

              return series
            }),
            chartConfig: {
              handleScale: false,

              rightPriceScale: {
                visible: false,
                scaleMargins: {
                  top: .45,
                  bottom: 0
                },
              },
              handleScroll: false,
              timeScale: {
                // rightOffset: 110,
                secondsVisible: false,
                timeVisible: true,
                // visible: false,
                rightBarStaysOnScroll: true,
              }
            },
            containerOp: style({
              display: 'flex',
              // position: 'absolute', left: 0, top: 0, right: 0, bottom: 0
            }),
          })({
            crosshairMove: pnlCrosshairMoveTether(
              skipRepeatsWith((a, b) => a.point?.x === b.point?.x)
            )
          }), combineObject({})))
        ),



        $node(),


        fadeIn(
          $column(layoutSheet.spacingBig, style({ flex: 1 }))(

            join(map(logs => {

              return $text(JSON.stringify(logs))
            }, openPositionList))

            // $title('Open Positions'),
            // $CardTable({
            //   dataSource: openPositionList,
            //   columns: [
            //     {
            //       $head: $text('Open Time'),
            //       columnOp: style({ maxWidth: '80px' }),
            //       $$body: map((pos) => {

            //         const timestamp = pos.increaseList[0].blockTimestamp

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
            //   dataSource: settledPositionList,
            //   columns: [
            //     {
            //       $head: $text('Settle Time'),
            //       columnOp: O(style({ maxWidth: '80px' })),

            //       $$body: map((req) => {
            //         const isKeeperReq = 'ctx' in req

            //         const timestamp = isKeeperReq ? unixTimestampNow() : req.settlement.blockTimestamp

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
            //         $text(style({ fontSize: '.75em' }))('Max Size'),
            //         $text('Max Size'),
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
            //         return $PnlValue(pos.settlement.realisedPnl - getTradeTotalFee(pos))
            //       })
            //     },
            //   ],
            // })({
            //   // scrollIndex: requestAccountTradeListTether(
            //   //   zip((wallet, pageIndex) => {
            //   //     if (!wallet || wallet.chain === null) {
            //   //       return null
            //   //     }

            //   //     return {
            //   //       status: TradeStatus.CLOSED,
            //   //       account: wallet.account.address,
            //   //       chain: wallet.chain.id,
            //   //       offset: pageIndex * 20,
            //   //       pageSize: 20,
            //   //     }
            //   //   }, walletLink.wallet),
            //   //   filterNull
            //   // )
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




