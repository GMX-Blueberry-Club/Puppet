import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $node, $text, MOTION_NO_WOBBLE, component, motion, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $NumberTicker, $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { awaitPromises, constant, empty, fromPromise, join, map, mergeArray, multicast, now, skipRepeatsWith, startWith } from "@most/core"
import { Stream } from "@most/types"
import * as GMX from "gmx-middleware-const"
import { $Baseline, $ButtonToggle, $defaulButtonToggleContainer, $icon, $infoTooltipLabel, IMarker } from "gmx-middleware-ui-components"
import {
  filterNull,
  getMappedValue,
  groupArrayMany,
  parseReadableNumber,
  readableFixedUSD30,
  readableTokenAmountLabel,
  readableUnitAmount,
  switchMap,
  unixTimestampNow
} from "gmx-middleware-utils"
import { BaselineData, MouseEventParams, Time } from "lightweight-charts"
import * as PUPPET from "puppet-middleware-const"
import { IPuppetSubscritpionParams, ISetRouteType, accountSettledPositionListSummary, getParticiapntMpPortion, getPuppetDepositAccountKey, getTraderPositionSettled, queryLatestPriceTick, queryPuppetTradeRoute, queryTraderPositionOpen } from "puppet-middleware-utils"
import * as viem from "viem"
import { $TraderDisplay, $pnlValue, $route } from "../common/$common"
import { $puppetLogo } from "../common/$icons"
import { $heading2 } from "../common/$text"
import { $card, $card2, $responsiveFlex } from "../common/elements/$common"
import { $caretDown } from "../common/elements/$icons"
import { $Popover } from "../components/$Popover"
import { $ButtonSecondary, $defaultMiniButtonSecondary } from "../components/form/$Button"
import { $TraderPortfolio } from "../components/participant/$Trader"
import { $AssetDepositEditor } from "../components/portfolio/$AssetDepositEditor.js"
import { $AssetWithdrawEditor } from "../components/portfolio/$AssetWithdrawEditor"
import { $RouteSubscriptionEditor, IChangeSubscription } from "../components/portfolio/$RouteSubscriptionEditor.js"
import { $ProfilePerformanceGraph, getPerformanceTimeline } from "../components/trade/$ProfilePerformanceGraph"
import * as storeDb from "../data/store/store.js"
import { connectContract } from "../logic/common"
import { getPuppetSubscriptionExpiry } from "../logic/puppetLogic.js"
import * as storage from "../utils/storage/storeScope.js"
import { IWalletClient } from "../wallet/walletLink.js"
import { $seperator2 } from "./common"
import { $LastAtivity, LAST_ACTIVITY_LABEL_MAP } from "./components/$LastActivity"
import { IProfileMode } from "../data/type"



export interface IWallet {
  wallet: IWalletClient
  route: router.Route
  routeTypeList: Stream<ISetRouteType[]>
}



const optionDisplay = {
  [IProfileMode.PUPPET]: {
    label: 'Puppet',
    url: '/puppet'
  },
  [IProfileMode.TRADER]: {
    label: 'Trader',
    url: '/trader'
  },
}


export const $Wallet = (config: IWallet) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [selectProfileMode, selectProfileModeTether]: Behavior<IProfileMode>,
  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, GMX.IntervalTime>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IChangeSubscription>,

  [openDepositPopover, openDepositPopoverTether]: Behavior<any>,
  [openWithdrawPopover, openWithdrawPopoverTether]: Behavior<any>,
  [requestDepositAsset, requestDepositAssetTether]: Behavior<Promise<viem.TransactionReceipt>>,
  [requestWithdrawAsset, requestWithdrawAssetTether]: Behavior<Promise<viem.TransactionReceipt>>,

  [popRouteSubscriptionEditor, popRouteSubscriptionEditorTether]: Behavior<any, IPuppetSubscritpionParams>,
  [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams>

) => {

  const { wallet, route, routeTypeList } = config

  const activityTimeframe = storage.replayWrite(storeDb.store.global, changeActivityTimeframe, 'activityTimeframe')
  const profileMode = storage.replayWrite(storeDb.store.wallet, selectProfileMode, 'selectedTab')

  const datastore = connectContract(PUPPET.CONTRACT[42161].Datastore)
  const readDepositBalance = datastore.read('getUint', getPuppetDepositAccountKey(config.wallet.account.address, GMX.ARBITRUM_ADDRESS.USDC))

  const readPuppetDeposit = mergeArray([
    readDepositBalance,
    join(constant(readDepositBalance, awaitPromises(requestDepositAsset))),
    join(constant(readDepositBalance, awaitPromises(requestWithdrawAsset))),
  ])

  const priceTickMap = switchMap(params => {
    return fromPromise(queryLatestPriceTick({ activityTimeframe: params.activityTimeframe }))
  }, combineObject({ activityTimeframe: activityTimeframe }))

  return [

    $column(layoutSheet.spacingBig)(
      $node(),

      $ButtonToggle({
        $container: $defaulButtonToggleContainer(style({ alignSelf: 'center', })),
        selected: profileMode,
        options: [IProfileMode.PUPPET, IProfileMode.TRADER],
        $$option: map(option => {
          return $text(optionDisplay[option].label)
        })
      })({ select: selectProfileModeTether() }),

      switchMap(mode => {
        const address = wallet.account.address
        if (mode === IProfileMode.PUPPET) {

          const puppetTradeRouteList = awaitPromises(map(params => {
            return queryPuppetTradeRoute({ puppet: address, activityTimeframe: params.activityTimeframe })
          }, combineObject({ activityTimeframe })))

          return $column(layoutSheet.spacingTiny)(
            $row(style({ placeContent: 'space-between', alignItems: 'center' }))(
              $node(),
              $LastAtivity(activityTimeframe)({
                changeActivityTimeframe: changeActivityTimeframeTether()
              })
            ),

            $card(layoutSheet.spacingBig, style({ flex: 1, width: '100%' }))(
              $card2(style({ padding: 0, height: screenUtils.isDesktopScreen ? '200px' : '200px', position: 'relative', margin: screenUtils.isDesktopScreen ? `-36px -36px 0` : `-12px -12px 0px` }))(
                switchMap(params => {
                  const openPositionList = params.puppetTradeRouteList.flatMap(route => route.openList.flatMap(pos => pos.position))
                  const settledPositionList = params.puppetTradeRouteList.flatMap(route => route.settledList.flatMap(pos => pos.position))

                  const allPositions = [...openPositionList, ...settledPositionList]
                  const $container = $column(style({ width: '100%', padding: 0, height: '200px' }))
                  const timeline = getPerformanceTimeline({ ...params, openPositionList, settledPositionList, puppet: config.wallet.account.address, tickCount: 100 })
                  const pnlCrossHairTimeChange = replayLatest(multicast(startWith(null, skipRepeatsWith(((xsx, xsy) => xsx.time === xsy.time), crosshairMove))))

                  const totalUsedBalance = openPositionList.reduce((acc, pos) => {
                    const collateralUsd = getParticiapntMpPortion(pos, pos.position.maxCollateralUsd, config.wallet.account.address)
                    return acc + collateralUsd
                  }, 0n)

                  // console.log(params)
                  const hoverChartPnl = filterNull(map(params => {
                    if (params.pnlCrossHairTimeChange?.point) {
                      const value = params.pnlCrossHairTimeChange.seriesData.values().next().value.value
                      return value
                    }

                    const data = timeline
                    const value = data[data.length - 1]?.value
                    return value || null
                  }, combineObject({ pnlCrossHairTimeChange })))



                  const markerList = allPositions.map((pos): IMarker => {
                    const isSettled = 'settlement' in pos
                    const position = pos.position.realisedPnlUsd > 0n ? 'aboveBar' as const : 'belowBar' as const
                    const time = Number(pos.blockTimestamp) as Time

                    return {
                      position, time,
                      text: readableFixedUSD30(pos.position.realisedPnlUsd),
                      color: colorAlpha(pallete.message, .25),
                      size: 0.1,
                      shape: !isSettled ? 'arrowUp' as const : 'circle' as const,
                    }
                  }).sort((a, b) => Number(a.time) - Number(b.time))


                  return $container(
                    $row(style({ position: 'absolute', width: '100%', top: 0, flex: 1, zIndex: 11, alignItems: 'flex-start', padding: '16px' }))(
                      $row(layoutSheet.spacingBig, style({ alignItems: 'center', minWidth: '0', flexShrink: 0, flex: 1 }))(
                        $responsiveFlex(layoutSheet.spacingSmall)(
                          $infoTooltipLabel($text('The available amount ready to be matched against'), 'Used balance'),
                          $text(readableFixedUSD30(totalUsedBalance))
                        ),
                      ),
                    ),
                    allPositions.length > 0
                      ? $Baseline({
                        markers: now(markerList),
                        chartConfig: {
                          leftPriceScale: {
                            autoScale: true,
                            ticksVisible: true,
                            scaleMargins: {
                              top: 0.35,
                              bottom: 0,
                            }
                          },
                        },
                        baselineOptions: {
                          baseLineColor: pallete.message,
                          baseLineVisible: true,
                          lineWidth: 2,
                          baseValue: {
                            price: 0,
                            type: 'price',
                          },
                        },
                        // appendData: scan((prev, next) => {
                        //   const marketPrice = formatFixed(next.indexTokenPrice, 30)
                        //   const timeNow = unixTimestampNow()
                        //   const prevTimeSlot = Math.floor(prev.time as number / tf)
                        //   const nextTimeSlot = Math.floor(timeNow / tf)
                        //   const time = nextTimeSlot * tf as Time
                        //   const isNext = nextTimeSlot > prevTimeSlot

                        //   return {
                        //     value: marketPrice,
                        //     time
                        //   }
                        // }, data[data.length - 1], config.processData),
                        data: timeline as any as BaselineData[],
                      })({
                        crosshairMove: crosshairMoveTether(
                          skipRepeatsWith((a, b) => a.point?.x === b.point?.x)
                        )
                      })
                      : empty(),
                    $column(style({ position: 'absolute', inset: 0 }))(
                      allPositions.length > 0
                        ? $column(style({ placeContent: 'center', alignItems: 'center', flex: 1, zIndex: 10, pointerEvents: 'none' }))(
                          $column(style({ filter: `drop-shadow(0px 0px 20px black) drop-shadow(0px 0px 40px black)`, placeContent: 'center', alignItems: 'center',  }))(
                            $NumberTicker({
                              textStyle: {
                                fontSize: '1.85rem',
                                fontWeight: '900',
                              },
                              // background: `radial-gradient(${colorAlpha(invertColor(pallete.message), .7)} 9%, transparent 63%)`,
                              value$: map(hoverValue => {
                                const newLocal2 = readableUnitAmount(hoverValue)
                                const newLocal = parseReadableNumber(newLocal2)
                                return newLocal
                              }, motion({ ...MOTION_NO_WOBBLE, precision: 15, stiffness: 210 }, 0, hoverChartPnl)),
                              incrementColor: pallete.positive,
                              decrementColor: pallete.negative
                            }),
                            style({ pointerEvents: 'all' })(
                              $infoTooltipLabel('The total combined settled and open trades', $text(style({ fontSize: '.85rem' }))('PnL'))
                            )
                          )
                        )
                        : $row(layoutSheet.spacingTiny, style({ flex: 1, alignItems: 'center', placeContent: 'center' }))(
                          $text(style({ 
                            color: pallete.foreground, textAlign: 'center',
                          }))('No activity within last '),
                          $text(getMappedValue(LAST_ACTIVITY_LABEL_MAP, params.activityTimeframe) )
                        ),
                    ),
                  )

                // return $ProfilePerformanceCard({
                //   account: config.address,
                //   $container: $column(style({ width: '100%', padding: 0, height: '200px' })),
                //   pricefeed: params.pricefeed,
                //   activityTimeframe: params.activityTimeframe,
                //   tickCount: 100,
                //   positionList: allPositions,
                //   // trader: config.address,
                // })({ })
                }, combineObject({ puppetTradeRouteList, activityTimeframe, priceTickMap })),
              ),

              $column(layoutSheet.spacingBig)(

                $responsiveFlex(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                  $heading2('Trade Routes'),
                  $node(style({ flex: 1 }))(),
                  $row(layoutSheet.spacingBig, style({ alignItems: 'center', minWidth: '0', flexShrink: 0 }))(
                    switchMap(amount => {
                      return $Popover({
                        open: mergeArray([
                          constant(
                            $AssetDepositEditor({
                              token: GMX.ARBITRUM_ADDRESS.USDC
                            })({
                              requestDepositAsset: requestDepositAssetTether(),
                            }),
                            openDepositPopover
                          ),
                          constant(
                            $AssetWithdrawEditor({
                              token: GMX.ARBITRUM_ADDRESS.USDC,
                              balance: amount
                            })({
                              requestDepositAsset: requestWithdrawAssetTether(),
                            }),
                            openWithdrawPopover
                          ),
                        ]),
                        $target: $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
                          $responsiveFlex(layoutSheet.spacingSmall)(
                            $infoTooltipLabel($text('The available amount ready to be matched against'), 'Available balance'),
                            $text(readableTokenAmountLabel(GMX.ARBITRUM_ADDRESS.USDC, amount))
                          ),
                          $ButtonSecondary({
                            $container: $defaultMiniButtonSecondary,
                            $content: $text('Deposit')
                          })({
                            click: openDepositPopoverTether()
                          }),
                          $ButtonSecondary({
                            $container: $defaultMiniButtonSecondary,
                            $content: $text('Withdraw'),
                            disabled: now(amount === 0n)
                          })({
                            click: openWithdrawPopoverTether()
                          }),
                        ),
                      })({})
                    }, readPuppetDeposit),

                  ),
                ),
                
                switchMap(params => {

                  if (params.puppetTradeRouteList.length === 0) {
                    return $text('No active trade routes')
                  }

                  const routeTypeTraderListMap = groupArrayMany(params.puppetTradeRouteList, route => route.routeTypeKey)


                  return $column(layoutSheet.spacingBig, style({ width: '100%' }))(
                    ...Object.entries(routeTypeTraderListMap).map(([routeTypeKey, tradeRouteList]) => {
                      const routeType = params.routeTypeList.find(route => route.routeTypeKey === routeTypeKey)!

                      return $column(layoutSheet.spacing)(
                        $route(routeType),

                        $column(style({ paddingLeft: '16px' }))(
                          $row(layoutSheet.spacing)(
                            $seperator2,

                            $column(layoutSheet.spacing, style({ flex: 1 }))(
                              ...tradeRouteList.map(tradeRouteDto => {
                                const puppetSubscriptionKey = getPuppetSubscriptionExpiry(config.wallet.account.address, routeType.collateralToken, routeType.indexToken, routeType.isLong)
                                const openPositionList = tradeRouteDto.openList.flatMap(pos => pos.position)
                                const settledPositionList = tradeRouteDto.settledList.flatMap(pos => pos.position)
                                const allPositions = [...openPositionList, ...settledPositionList]
                                const summary = accountSettledPositionListSummary(allPositions, config.wallet.account.address)

                                return $row(layoutSheet.spacing, style({ alignItems: 'center', padding: '10px 0' }))(
                                  $TraderDisplay({
                                    route: config.route,
                                    trader: tradeRouteDto.trader,
                                  })({
                                    clickTrader: changeRouteTether(),
                                    modifySubscribeList: modifySubscriberTether(),
                                  }),

                                  switchMap(expiry => {
                                    return $Popover({
                                      open: constant(
                                        $RouteSubscriptionEditor({ expiry, routeTypeKey: tradeRouteDto.routeTypeKey, trader: tradeRouteDto.trader, tradeRoute: tradeRouteDto.tradeRoute })({
                                          modifySubscribeList: modifySubscriberTether()
                                        }),
                                        popRouteSubscriptionEditor
                                      ),
                                      dismiss: modifySubscriber,
                                      $target: $row(layoutSheet.spacing)(
                                        $ButtonSecondary({
                                          $content: $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
                                            $icon({ $content: $puppetLogo, fill: pallete.message, width: '24px', viewBox: `0 0 32 32` }),
                                            $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginRight: '-4px' }), viewBox: '0 0 32 32' }),
                                          ),
                                          $container: $defaultMiniButtonSecondary(style({ borderColor: Number(expiry) > unixTimestampNow() ? pallete.primary : '' })) 
                                        })({
                                          click: popRouteSubscriptionEditorTether()
                                        }),
                                      )
                                    })({})
                                  }, puppetSubscriptionKey),

                                  $ProfilePerformanceGraph({
                                    puppet: config.wallet.account.address,
                                    $container: $column(style({ width: '100%', padding: 0, height: '75px', position: 'relative', margin: '-16px 0' })),
                                    priceTickMap: params.priceTickMap,
                                    openPositionList, settledPositionList,
                                    tickCount: 100,
                                    activityTimeframe: params.activityTimeframe
                                  })({}),

                                  $pnlValue(summary.pnl)
                                )
                              })
                            ),
                          ),
                          $seperator2,
                        ),
                      )
                    })
                  )
                }, combineObject({ puppetTradeRouteList, routeTypeList, priceTickMap, activityTimeframe })),
              ),

            ),
            
            // $PuppetPortfolio({
            //   address, activityTimeframe,
            //   processData: config.processData,
            //   route: config.route,
            //   subscriptionList: config.subscriptionList,
            // })({
            //   changeActivityTimeframe: changeActivityTimeframeTether(),
            //   changeRoute: changeRouteTether(),
            //   modifySubscriber: modifySubscriberTether(),
            // }) 
          ) 
        }

        const settledTradeList = awaitPromises(map(async params => {
          const positionList = await getTraderPositionSettled({ trader: config.wallet.account.address, blockTimestamp_gte: params.activityTimeframe })
          return positionList
        }, combineObject({ activityTimeframe })))

        const openTradeList = fromPromise(queryTraderPositionOpen({ trader: config.wallet.account.address }))


        return $column(layoutSheet.spacingTiny)(
          $row(style({ placeContent: 'space-between', alignItems: 'center' }))(
            $node(),
            $LastAtivity(activityTimeframe)({
              changeActivityTimeframe: changeActivityTimeframeTether()
            })
          ),
          $TraderPortfolio({
            priceTickMap, openTradeList, settledTradeList,
            address, activityTimeframe,
            route: config.route,
          })({
            modifySubscriber: modifySubscriberTether(),
            changeRoute: changeRouteTether(),
            changeActivityTimeframe: changeActivityTimeframeTether(),
          })
        ) 
      }, profileMode)


    ),

    {
      modifySubscriber,
      changeRoute
    }
  ]
})


