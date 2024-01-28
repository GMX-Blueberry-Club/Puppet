import { Behavior, combineObject } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { awaitPromises, constant, map, mergeArray, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { IntervalTime, groupArrayMany, readableTokenAmountLabel, readableUsd, switchMap } from "common-utils"
import * as GMX from 'gmx-middleware-const'
import { getTokenDescription } from "gmx-middleware-utils"
import { IPuppetTradeRoute, ISetRouteType, getParticiapntMpPortion } from "puppet-middleware-utils"
import { $infoTooltipLabel, $intermediateMessage } from "ui-components"
import * as viem from "viem"
import { $route } from "../../common/$common.js"
import { $heading3 } from "../../common/$text.js"
import { $card, $card2, $responsiveFlex } from "../../common/elements/$common.js"
import { $Popover } from "../../components/$Popover.js"
import { $ButtonSecondary, $defaultMiniButtonSecondary } from "../../components/form/$Button.js"
import { $ProfilePeformanceTimeline } from "../../components/participant/$ProfilePeformanceTimeline.js"
import { $PuppetTraderTradeRoute } from "../../components/participant/PuppetTraderTradeRoute.js"
import { $AssetDepositEditor } from "../../components/portfolio/$AssetDepositEditor.js"
import { $AssetWithdrawEditor } from "../../components/portfolio/$AssetWithdrawEditor.js"
import { IChangeSubscription } from "../../components/portfolio/$RouteSubscriptionEditor.js"
import { getPuppetDepositAmount } from "../../logic/puppetLogic.js"
import { $seperator2 } from "../common.js"
import { IUserPositionPageParams } from "../type.js"


interface IWalletPuppet extends IUserPositionPageParams {
  puppetTradeRouteListQuery: Stream<Promise<IPuppetTradeRoute[]>>
}

export const $WalletPuppet = (config: IWalletPuppet) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IChangeSubscription>,

  [openDepositPopover, openDepositPopoverTether]: Behavior<any>,
  [openWithdrawPopover, openWithdrawPopoverTether]: Behavior<any>,
  [requestDepositAsset, requestDepositAssetTether]: Behavior<Promise<bigint>>,
  [requestWithdrawAsset, requestWithdrawAssetTether]: Behavior<Promise<bigint>>,

  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, IntervalTime>,
  [selectTradeRouteList, selectTradeRouteListTether]: Behavior<ISetRouteType[]>,
) => {
  
  const { activityTimeframe, walletClientQuery, priceTickMapQuery, publicProviderQuery, puppetTradeRouteListQuery, openPositionListQuery, settledPositionListQuery, selectedTradeRouteList, routeTypeListQuery, route } = config

  const initialDepositAmountQuery = map(async walletQuery => {
    const wallet = await walletQuery

    if (wallet === null) {
      return 0n
    }

    return getPuppetDepositAmount(wallet, wallet.account.address)
  }, walletClientQuery)

  const depositAmountQuery = mergeArray([
    initialDepositAmountQuery,  
    map(async params => {
      return await params.initialDepositAmountQuery + await params.requestDepositAsset
    }, combineObject({ initialDepositAmountQuery, requestDepositAsset })),
    map(async params => {
      return await params.initialDepositAmountQuery - await params.requestWithdrawAsset
    }, combineObject({ initialDepositAmountQuery, requestWithdrawAsset }))
  ])

  const depositToken = GMX.ARBITRUM_ADDRESS.USDC
  const depositTokenDescription = getTokenDescription(depositToken)

  
  return [

    $column(layoutSheet.spacingBig)(
      $card(layoutSheet.spacingBig, style({ flex: 1, width: '100%' }))(
        $card2(style({ padding: 0, height: screenUtils.isDesktopScreen ? '200px' : '200px', position: 'relative', margin: screenUtils.isDesktopScreen ? `-36px -36px 0` : `-12px -12px 0px` }))(
          $ProfilePeformanceTimeline({ ...config })({
            selectTradeRouteList: selectTradeRouteListTether(),
            changeActivityTimeframe: changeActivityTimeframeTether(),
          }),
        ),

        $column(layoutSheet.spacing)(
          $responsiveFlex(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
            $heading3('Active Trader Routes'),
            $node(style({ flex: 1 }))(),
            $row(layoutSheet.spacingBig, style({ alignItems: 'center', minWidth: '0', flexShrink: 0 }))(

              $Popover({
                open: mergeArray([
                  constant(
                    $AssetDepositEditor({
                      token: depositToken,
                      publicProviderQuery,
                      walletClientQuery,
                    })({
                      requestDepositAsset: requestDepositAssetTether(),
                    }),
                    openDepositPopover
                  ),
                  constant(
                    $AssetWithdrawEditor({
                      walletClientQuery,
                      publicProviderQuery,
                      token: depositToken,
                      balanceQuery: depositAmountQuery
                    })({
                      requestDepositAsset: requestWithdrawAssetTether(),
                    }),
                    openWithdrawPopover
                  ),
                ]),
                $target: $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
                  $responsiveFlex(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                    $infoTooltipLabel($text('The available amount ready to be matched against'), 'Available balance'),
                    $intermediateMessage(map(async amount => {
                      return readableTokenAmountLabel(depositTokenDescription, await amount)
                    }, depositAmountQuery))
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
                    disabled: switchMap(async amount => await amount === 0n, depositAmountQuery)
                  })({
                    click: openWithdrawPopoverTether()
                  }),
                ),
              })({}),
            ),
          ),
          switchLatest(awaitPromises(map(async params => {
            const wallet = await params.walletClientQuery

            if (wallet === null) {
              return $text('Connect wallet to view activity')
            }

            const puppetTradeRouteList = await params.puppetTradeRouteListQuery
            const priceTickMap = await params.priceTickMapQuery
            const routeTypeList = await params.routeTypeListQuery

            if (puppetTradeRouteList.length === 0) {
              return $text('No activity found')
            }

            const usedBalance = puppetTradeRouteList.flatMap(route => route.openList).reduce((acc, pos) => {
              const collateralUsd = getParticiapntMpPortion(pos.position, pos.position.position.maxCollateralUsd, wallet.account.address)
              return acc + collateralUsd
            }, 0n)

            const tradeRouteList = Object.entries(groupArrayMany(puppetTradeRouteList, x => x.routeTypeKey)) as [viem.Address, IPuppetTradeRoute[]][]

            return $column(layoutSheet.spacingBig, style({ width: '100%' }))(
              ...tradeRouteList.map(([routeTypeKey, traderPuppetTradeRouteList]) => {
                const routeType = routeTypeList.find(route => route.routeTypeKey === routeTypeKey)!

                return $column(layoutSheet.spacing)(
                  $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
                    $route(routeType),
                    $responsiveFlex(layoutSheet.spacingSmall)(
                      $infoTooltipLabel($text('The available amount ready to be matched against'), 'Used balance'),
                      $text(readableUsd(usedBalance))
                    ),
                    $node(style({ flex: 1 }))(),
                  ),

                  $column(style({ paddingLeft: '16px' }))(
                    $row(layoutSheet.spacing)(
                      $seperator2,

                      $column(layoutSheet.spacing, style({ flex: 1 }))( 
                        ...traderPuppetTradeRouteList.map(puppetTradeRoute => {
                          return $PuppetTraderTradeRoute({ route, walletClientQuery, puppetTradeRoute, publicProviderQuery, routeTypeList, activityTimeframe: params.activityTimeframe, priceTickMap })({
                            modifySubscriber: modifySubscriberTether(),
                            changeRoute: changeRouteTether(),
                          })
                        })
                      ),
                    ),
                    $seperator2,
                  ),
                )
              })
            )
          }, combineObject({ puppetTradeRouteListQuery, priceTickMapQuery, activityTimeframe, selectedTradeRouteList, routeTypeListQuery, walletClientQuery })))),
        ),
      ),
    ),
    
    {
      changeRoute, modifySubscriber, changeActivityTimeframe, selectTradeRouteList
    }
  ]
})



