import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $node, $text, MOTION_NO_WOBBLE, component, motion, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $NumberTicker, $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { awaitPromises, constant, empty, join, map, mergeArray, multicast, now, skipRepeatsWith, startWith } from "@most/core"
import { Stream } from "@most/types"
import * as GMX from "gmx-middleware-const"
import { $Baseline, $ButtonToggle, $Link, $alertTooltip, $arrowRight, $defaulButtonToggleContainer, $icon, $infoTooltipLabel, IMarker } from "gmx-middleware-ui-components"
import {
  IRequestAccountTradeListApi,
  filterNull,
  getMappedValue,
  getTokenUsd,
  groupArrayMany,
  lst,
  parseReadableNumber,
  readableFixedUSD30,
  readableTokenAmountLabel,
  readableUnitAmount,
  switchMap,
  tokenAmountLabel,
  unixTimestampNow
} from "gmx-middleware-utils"
import { IPuppetSubscritpion, IPuppetSubscritpionParams, accountSettledPositionListSummary, getParticiapntMpPortion, getPuppetDepositAccountKey, getPuppetSubscriptionKey, getRouteTypeKey } from "puppet-middleware-utils"
import { $PuppetPortfolio } from "../components/participant/$Puppet"
import { IGmxProcessState } from "../data/process/process.js"
import * as store from "../data/store/store.js"
import { ROUTE_DESCRIPTIN_MAP } from "../logic/utils.js"
import * as storage from "../utils/storage/storeScope.js"
import { IWalletClient } from "../wallet/walletLink.js"
import { $TraderProfileSummary } from "../components/participant/$Summary"
import { $TraderPortfolio, $TraderProfile } from "../components/participant/$Trader"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { $LastAtivity, LAST_ACTIVITY_LABEL_MAP } from "./components/$LastActivity"
import { $Popover } from "../components/$Popover"
import { connectContract } from "../logic/common"
import { $card, $card2, $responsiveFlex } from "../common/elements/$common"
import { $ButtonSecondary, $defaultMiniButtonSecondary } from "../components/form/$Button"
import { $AssetDepositEditor } from "../components/portfolio/$AssetDepositEditor.js"
import * as PUPPET from "puppet-middleware-const"
import * as viem from "viem"
import { $seperator2 } from "./common"
import { $heading2, $heading3 } from "../common/$text"
import { BaselineData, MouseEventParams, Time } from "lightweight-charts"
import { $ProfilePerformanceGraph, performanceTimeline } from "../components/trade/$ProfilePerformanceGraph"
import { $route, $TraderDisplay, $TraderRouteDisplay, $pnlValue } from "../common/$common"
import { $RouteSubscriptionEditor } from "../components/portfolio/$RouteSubscriptionEditor.js"
import { $caretDown } from "../common/elements/$icons"
import { $puppetLogo } from "../common/$icons"
import { $AssetWithdrawEditor } from "../components/portfolio/$AssetWithdrawEditor"



export interface IProfile {
  wallet: IWalletClient
  route: router.Route
  processData: Stream<IGmxProcessState>
  subscriptionList: Stream<IPuppetSubscritpion[]>
}

enum IProfileMode {
  TRADER = 'Trader',
  PUPPET = 'Puppet',
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


export const $Wallet = (config: IProfile) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [selectProfileMode, selectProfileModeTether]: Behavior<IProfileMode>,
  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, GMX.IntervalTime>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IPuppetSubscritpion>,

  [openDepositPopover, openDepositPopoverTether]: Behavior<any>,
  [openWithdrawPopover, openWithdrawPopoverTether]: Behavior<any>,
  [requestDepositAsset, requestDepositAssetTether]: Behavior<Promise<viem.TransactionReceipt>>,
  [requestWithdrawAsset, requestWithdrawAssetTether]: Behavior<Promise<viem.TransactionReceipt>>,

  [popRouteSubscriptionEditor, popRouteSubscriptionEditorTether]: Behavior<any, IPuppetSubscritpionParams>,
  [crosshairMove, crosshairMoveTether]: Behavior<MouseEventParams>

) => {

  // const orchestrator = connectContract(PUPPET.CONTRACT[42161].Orchestrator)
  // const subscription = orchestrator.read('puppetSubscriptions', config.wallet.account.address)

  const activityTimeframe = storage.replayWrite(store.activityTimeframe, GMX.TIME_INTERVAL_MAP.MONTH, changeActivityTimeframe)
  const profileMode = storage.replayWrite(store.walletProfileMode, IProfileMode.PUPPET, selectProfileMode)


  const routeTrades = replayLatest(multicast(map(params => {
    if (!(config.wallet.account.address in params.processData.subscription)) {
      return []
    }

    return params.processData.subscription.filter(s => s.puppet === config.wallet.account.address) || []
  }, combineObject({ processData: config.processData }))))

  const datastore = connectContract(PUPPET.CONTRACT[42161].Datastore)
  const readDepositBalance = datastore.read('getUint', getPuppetDepositAccountKey(config.wallet.account.address, GMX.ARBITRUM_ADDRESS.USDC))

  const readPuppetDeposit = mergeArray([
    readDepositBalance,
    join(constant(readDepositBalance, awaitPromises(requestDepositAsset))),
    join(constant(readDepositBalance, awaitPromises(requestWithdrawAsset))),
  ])



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
        const address = config.wallet.account.address
        if (mode === IProfileMode.PUPPET) {

          const openTrades = map(processData => {
            const list = Object.values(processData.mirrorPositionSlot)
              .filter(pos => pos.puppets.indexOf(config.wallet.account.address) > -1)
              .reverse()
            return list
          }, config.processData)

          const settledTrades = map(processData => {
            const tradeList = processData.mirrorPositionSettled
              .filter(pos => pos.puppets.indexOf(config.wallet.account.address) > -1)
              .reverse()
            return tradeList
          }, config.processData)

          const routeMap = map(data => data.routeMap, config.processData)
          const pricefeedMap = map(data => data.pricefeed, config.processData)
          const priceLatestMap = map(data => data.latestPrice, config.processData)

          const subscribedRoutes = map(data => data.subscription.filter(s => s.puppet === config.wallet.account.address), config.processData)

          const routeTradeGroupMap = map(params => {
            const allTrades = [...params.openTrades, ...params.settledTrades]
            const tradeRouteMap = groupArrayMany(allTrades, t => t.routeTypeKey)
            const subscribeRouteMap = groupArrayMany(params.subscribedRoutes, s => s.routeTypeKey)

            return { ...params, tradeRouteMap, subscribeRouteMap, allTrades }
          }, combineObject({ settledTrades, openTrades, subscribedRoutes, activityTimeframe, routeMap, priceLatestMap, pricefeedMap, subscriptionList: config.subscriptionList }))

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
                  const filterStartTime = unixTimestampNow() - params.activityTimeframe
                  // const traderPos = Object.values(params.processData.mirrorPositionSettled[config.address] || {}).flat().filter(pos => pos.blockTimestamp > filterStartTime)
                  // const openList = Object.values(params.processData.mirrorPositionSlot).filter(pos => pos.trader === config.address).filter(pos => pos.blockTimestamp > filterStartTime)
                  const allPositions = [...params.openTrades, ...params.settledTrades]
                  const $container = $column(style({ width: '100%', padding: 0, height: '200px' }))
                  const timeline = performanceTimeline({ puppet: config.wallet.account.address, positionList: allPositions, pricefeedMap: params.pricefeedMap, tickCount: 100, activityTimeframe: params.activityTimeframe })
                  const pnlCrossHairTimeChange = replayLatest(multicast(startWith(null, skipRepeatsWith(((xsx, xsy) => xsx.time === xsy.time), crosshairMove))))

                  const totalUsedBalance = params.openTrades.reduce((acc, pos) => {
                    const position = lst(pos.updates)
                    const collateralAmount = getParticiapntMpPortion(pos, position.collateralDeltaAmount, config.wallet.account.address)
                    const collateralUsd = getTokenUsd(collateralAmount, params.priceLatestMap[position.collateralToken].max)

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
                    const position = pos.realisedPnl > 0n ? 'aboveBar' as const : 'belowBar' as const
                    const time = pos.blockTimestamp as Time

                    return {
                      position, time,
                      text: readableFixedUSD30(pos.realisedPnl),
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
                        : $row(layoutSheet.spacingTiny, style({ flex: 1, paddingTop: '52px', alignItems: 'center', placeContent: 'center' }))(
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
                }, combineObject({ processData: config.processData, activityTimeframe, openTrades, settledTrades, pricefeedMap, priceLatestMap })),
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

                  if (params.subscribedRoutes.length === 0) {
                    return $text('No active trade routes')
                  }

                  const group = Object.entries(params.subscribeRouteMap)

                  return $column(layoutSheet.spacingBig, style({ width: '100%' }))(
                    ...group.map(([key, list]) => {

                      const route = getMappedValue(params.routeMap, key)
                      const routeTrades = params.tradeRouteMap[key as viem.Hex]
                      const traderTrades = groupArrayMany(routeTrades, s => s.trader)

                      return $column(layoutSheet.spacing)(
                        $route(route),

                        // $RouteDepositInfo({
                        //   routeDescription: route,
                        //   wallet: w3p
                        // })({}),

                        $column(style({ paddingLeft: '16px' }))(
                          $row(layoutSheet.spacing)(
                            $seperator2,

                            $column(layoutSheet.spacing, style({ flex: 1 }))(
                              ...list.map(sub => {

                                const routeTypeKey = getRouteTypeKey(GMX.ARBITRUM_ADDRESS.NATIVE_TOKEN, GMX.ARBITRUM_ADDRESS.NATIVE_TOKEN, true, '0x')
                                const puppetSubscriptionKey = getPuppetSubscriptionKey(config.wallet.account.address, sub.trader, routeTypeKey)
                                const routeSubscription: IPuppetSubscritpion = {
                                  routeTypeKey: route.routeTypeKey,
                                  trader: sub.trader,
                                  puppet: config.wallet.account.address,
                                  allowance: sub?.allowance || 0n,
                                  subscriptionExpiry: sub?.subscriptionExpiry || 0n,
                                  puppetSubscriptionKey,
                                  subscribe: sub?.subscribe || false
                                }

                            
                                // if (params.settledTrades.length === 0) {
                                //   return $row(layoutSheet.spacing, style({ alignItems: 'center', padding: '10px 0' }))(
                                //     $Link({
                                //       $content: $profileDisplay({
                                //         address: sub.trader,
                                //       }),
                                //       route: config.route.create({ fragment: 'baseRoute' }),
                                //       url: `/app/profile/${sub.trader}/${IProfileActiveTab.TRADER.toLowerCase()}`
                                //     })({ click: changeRouteTether() }),
                                //     $infoLabel($text('No trades yet')),

                                //     $infoLabeledValue('Expiration', readableDate(Number(sub.subscriptionExpiry)), true),
                                //     $infoLabeledValue('Allow', $text(`${readablePercentage(sub.allowance)}`), true),
                                //   )
                                // }

                                const traderTradeList = traderTrades[sub.trader]
                                const summary = accountSettledPositionListSummary(traderTradeList, params.priceLatestMap, config.wallet.account.address)

                                return $row(layoutSheet.spacing, style({ alignItems: 'center', padding: '10px 0' }))(
                                  $TraderDisplay({
                                    route: config.route,
                                    trader: sub.trader,
                                  })({
                                    clickTrader: changeRouteTether(),
                                    modifySubscribeList: modifySubscriberTether(),
                                  }),
                                  $Popover({
                                    open: constant(
                                      $RouteSubscriptionEditor({ routeSubscription })({
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
                                        $container: $defaultMiniButtonSecondary(style({ borderRadius: '16px' })) 
                                      })({
                                        click: popRouteSubscriptionEditorTether()
                                      }),
                                    )
                                  })({}),


                                  $ProfilePerformanceGraph({
                                    puppet: config.wallet.account.address,
                                    $container: $column(style({ width: '100%', padding: 0, height: '75px', position: 'relative', margin: '-16px 0' })),
                                    pricefeedMap: params.pricefeedMap,
                                    positionList: traderTradeList,
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
                }, routeTradeGroupMap),
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

        return $column(layoutSheet.spacingTiny)(
          $row(style({ placeContent: 'space-between', alignItems: 'center' }))(
            $node(),
            $LastAtivity(activityTimeframe)({
              changeActivityTimeframe: changeActivityTimeframeTether()
            })
          ),
          $TraderPortfolio({
            address, activityTimeframe,
            processData: config.processData,
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


