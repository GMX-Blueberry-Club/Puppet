import { Behavior, combineObject } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { awaitPromises, constant, fromPromise, join, map, mergeArray, now, startWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import * as GMX from 'gmx-middleware-const'
import { groupArrayMany, readableUsd, readableTokenAmountLabel, switchMap } from "gmx-middleware-utils"
import { IPuppetTradeRoute, ISetRouteType, accountSettledPositionListSummary, getParticiapntMpPortion, getPuppetDepositAccountKey, openPositionListPnl } from "puppet-middleware-utils"
import * as viem from "viem"
import { $TraderDisplay, $TraderRouteDisplay, $pnlDisplay, $route } from "../../common/$common.js"
import { $heading2, $heading3 } from "../../common/$text.js"
import { $card, $card2, $responsiveFlex } from "../../common/elements/$common.js"
import { IPageUserParams } from "../../data/type.js"
import { $seperator2 } from "../../pages/common.js"
import { IChangeSubscription } from "../portfolio/$RouteSubscriptionEditor.js"
import { $ProfilePerformanceGraph } from "../trade/$ProfilePerformanceGraph.js"
import { $ProfilePeformanceTimeline } from "./$ProfilePeformanceTimeline.js"
import { $infoTooltipLabel } from "gmx-middleware-ui-components"
import { $ButtonSecondary, $defaultMiniButtonSecondary } from "../form/$Button"
import { $AssetDepositEditor } from "../portfolio/$AssetDepositEditor"
import { $AssetWithdrawEditor } from "../portfolio/$AssetWithdrawEditor"
import { connectContract } from "../../logic/common"
import * as PUPPET from "puppet-middleware-const"
import { $Popover } from "../$Popover"
import { getPuppetDepositAmount } from "../../logic/puppetLogic"
import { arbitrum } from "viem/chains"
import { $PuppetTraderTradeRoute } from "./PuppetTraderTradeRoute"


export interface IPuppetPortfolio extends IPageUserParams {
  puppetTradeRouteListQuery: Stream<Promise<IPuppetTradeRoute[]>>
}

export const $PuppetPortfolio = (config: IPuppetPortfolio) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IChangeSubscription>,

  [openDepositPopover, openDepositPopoverTether]: Behavior<any>,
  [openWithdrawPopover, openWithdrawPopoverTether]: Behavior<any>,
  [requestDepositAsset, requestDepositAssetTether]: Behavior<Promise<viem.TransactionReceipt>>,
  [requestWithdrawAsset, requestWithdrawAssetTether]: Behavior<Promise<viem.TransactionReceipt>>,

  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, GMX.IntervalTime>,
  [selectTradeRouteList, selectTradeRouteListTether]: Behavior<ISetRouteType[]>,
) => {
  
  const { activityTimeframe, address, priceTickMapQuery, puppetTradeRouteListQuery, openPositionListQuery, settledPositionListQuery, selectedTradeRouteList, routeTypeListQuery, route } = config

  
  const readPuppetDeposit = mergeArray([
    fromPromise(getPuppetDepositAmount(address, arbitrum.id)),
    switchMap(async txQuery =>  {
      await txQuery
      return getPuppetDepositAmount(address, arbitrum.id)
    }, requestDepositAsset)
  ])

  return [

    $column(layoutSheet.spacingBig)(
      $card(layoutSheet.spacingBig, style({ flex: 1, width: '100%' }))(
        $card2(style({ padding: 0, height: screenUtils.isDesktopScreen ? '200px' : '200px', position: 'relative', margin: screenUtils.isDesktopScreen ? `-36px -36px 0` : `-12px -12px 0px` }))(
          $ProfilePeformanceTimeline({ ...config, puppet: address })({
            selectTradeRouteList: selectTradeRouteListTether(),
            changeActivityTimeframe: changeActivityTimeframeTether(),
          }),
        ),

        $column(layoutSheet.spacing)(
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
          switchLatest(awaitPromises(map(async params => {

            const puppetTradeRouteList = await params.puppetTradeRouteListQuery
            const priceTickMap = await params.priceTickMapQuery
            const routeTypeList = await params.routeTypeListQuery

            if (puppetTradeRouteList.length === 0) {
              return $text('No active trade found')
            }


            const tradeRouteList = Object.entries(groupArrayMany(puppetTradeRouteList, x => x.routeTypeKey)) as [viem.Address, IPuppetTradeRoute[]][]

            return $column(layoutSheet.spacingBig, style({ width: '100%' }))(
              ...tradeRouteList.map(([routeTypeKey, traderPuppetTradeRouteList]) => {
                const routeType = routeTypeList.find(route => route.routeTypeKey === routeTypeKey)!

                return $column(layoutSheet.spacing)(
                  $row(style({ alignItems: 'center' }))(
                    $route(routeType),
                    $node(style({ flex: 1 }))(),
                    $responsiveFlex(layoutSheet.spacingSmall)(
                      $infoTooltipLabel($text('The available amount ready to be matched against'), 'Used balance'),
                      $text(
                        startWith('-', awaitPromises(map(async query => {
                          const balance = (await query).reduce((acc, pos) => {
                            const collateralUsd = getParticiapntMpPortion(pos, pos.position.maxCollateralUsd, config.address)
                            return acc + collateralUsd
                          }, 0n)
                          return readableUsd(balance)
                        }, openPositionListQuery)))
                      )
                    ),
                  ),

                  $column(style({ paddingLeft: '16px' }))(
                    $row(layoutSheet.spacing)(
                      $seperator2,

                      $column(layoutSheet.spacing, style({ flex: 1 }))( 
                        ...traderPuppetTradeRouteList.map(puppetTradeRoute => {
                          return $PuppetTraderTradeRoute({ route, puppetTradeRoute, routeTypeList, activityTimeframe: params.activityTimeframe, priceTickMap })({
                            modifySubscriber: modifySubscriberTether(),
                          })
                        })
                      ),
                    ),
                    $seperator2,
                  ),
                )
              })
            )
          }, combineObject({ puppetTradeRouteListQuery, priceTickMapQuery, activityTimeframe, selectedTradeRouteList, routeTypeListQuery })))),
        ),
      ),
    ),
    
    {
      changeRoute, modifySubscriber, changeActivityTimeframe, selectTradeRouteList
    }
  ]
})



