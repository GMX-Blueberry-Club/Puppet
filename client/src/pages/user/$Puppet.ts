import { Behavior, combineObject } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { awaitPromises, constant, map, mergeArray, now, startWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { IntervalTime, groupArrayMany, readableTokenAmountLabel, readableUsd, switchMap } from "common-utils"
import * as GMX from 'gmx-middleware-const'
import { getTokenDescription } from "gmx-middleware-utils"
import { IPuppetTradeRoute, ISetRouteType, getParticiapntMpPortion } from "puppet-middleware-utils"
import { $infoTooltipLabel } from "ui-components"
import * as viem from "viem"
import { arbitrum } from "viem/chains"
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
import { IUserUserParams } from "../../const/type.js"
import { getPuppetDepositAmount } from "../../logic/puppetLogic.js"
import { $seperator2 } from "../common.js"


export interface IPuppetPortfolio extends IUserUserParams {
  puppetTradeRouteListQuery: Stream<Promise<IPuppetTradeRoute[]>>
}

export const $PuppetPage = (config: IPuppetPortfolio) => component((
  [changeRoute, changeRouteTether]: Behavior<string, string>,
  [modifySubscriber, modifySubscriberTether]: Behavior<IChangeSubscription>,

  [openDepositPopover, openDepositPopoverTether]: Behavior<any>,
  [openWithdrawPopover, openWithdrawPopoverTether]: Behavior<any>,
  [requestDepositAsset, requestDepositAssetTether]: Behavior<Promise<bigint>>,
  [requestWithdrawAsset, requestWithdrawAssetTether]: Behavior<Promise<viem.TransactionReceipt>>,

  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, IntervalTime>,
  [selectTradeRouteList, selectTradeRouteListTether]: Behavior<ISetRouteType[]>,
) => {
  
  const { activityTimeframe, address, priceTickMapQuery, puppetTradeRouteListQuery, openPositionListQuery, settledPositionListQuery, selectedTradeRouteList, routeTypeListQuery, route } = config

  const depositAmountQuery = getPuppetDepositAmount(address, arbitrum.id)

  const readPuppetDeposit = startWith(
    depositAmountQuery,  
    map(async added =>  await depositAmountQuery + await added, requestDepositAsset)
  )

  const depositToken = GMX.ARBITRUM_ADDRESS.USDC
  const depositTokenDescription = getTokenDescription(depositToken)

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
            $heading3('Active Trader Routes'),
            $node(style({ flex: 1 }))(),
            $row(layoutSheet.spacingBig, style({ alignItems: 'center', minWidth: '0', flexShrink: 0 }))(
              switchMap(amount => {
                return $Popover({
                  open: mergeArray([
                    constant(
                      $AssetDepositEditor({
                        token: depositToken
                      })({
                        requestDepositAsset: requestDepositAssetTether(),
                      }),
                      openDepositPopover
                    ),
                    constant(
                      $AssetWithdrawEditor({
                        token: depositToken,
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
                      $text(readableTokenAmountLabel(depositTokenDescription, amount))
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
              }, awaitPromises(readPuppetDeposit)),
            ),
          ),
          switchLatest(awaitPromises(map(async params => {

            const puppetTradeRouteList = await params.puppetTradeRouteListQuery
            const priceTickMap = await params.priceTickMapQuery
            const routeTypeList = await params.routeTypeListQuery

            if (puppetTradeRouteList.length === 0) {
              return $text('No activity found')
            }

            const tradeRouteList = Object.entries(groupArrayMany(puppetTradeRouteList, x => x.routeTypeKey)) as [viem.Address, IPuppetTradeRoute[]][]

            return $column(layoutSheet.spacingBig, style({ width: '100%' }))(
              ...tradeRouteList.map(([routeTypeKey, traderPuppetTradeRouteList]) => {
                const routeType = routeTypeList.find(route => route.routeTypeKey === routeTypeKey)!

                return $column(layoutSheet.spacing)(
                  $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
                    $route(routeType),
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
                    $node(style({ flex: 1 }))(),
                  ),

                  $column(style({ paddingLeft: '16px' }))(
                    $row(layoutSheet.spacing)(
                      $seperator2,

                      $column(layoutSheet.spacing, style({ flex: 1 }))( 
                        ...traderPuppetTradeRouteList.map(puppetTradeRoute => {
                          return $PuppetTraderTradeRoute({ route, puppetTradeRoute, routeTypeList, activityTimeframe: params.activityTimeframe, priceTickMap })({
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
          }, combineObject({ puppetTradeRouteListQuery, priceTickMapQuery, activityTimeframe, selectedTradeRouteList, routeTypeListQuery })))),
        ),
      ),
    ),
    
    {
      changeRoute, modifySubscriber, changeActivityTimeframe, selectTradeRouteList
    }
  ]
})



