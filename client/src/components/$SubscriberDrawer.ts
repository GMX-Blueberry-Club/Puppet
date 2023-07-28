import { Behavior, combineObject } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { $column, layoutSheet, $row } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { multicast, join, constant, startWith, snapshot, mergeArray, map } from "@most/core"
import { $alert, $alertTooltip, $infoTooltipLabel } from "gmx-middleware-ui-components"
import { switchMap, groupArrayMany, tokenAmount, tokenAmountLabel, parseFixed, readableFixedBsp } from "gmx-middleware-utils"
import { ITraderSubscritpion } from "puppet-middleware-utils"
import { $route } from "../common/$common"
import { $card2 } from "../elements/$common"
import { connectContract, wagmiWriteContract } from "../logic/common"
import { $seperator2 } from "../pages/common"
import { fadeIn } from "../transitions/enter"
import { nativeBalance } from "../wallet/walletLink"
import { $accountPreview } from "./$AccountProfile"
import { $IntermediateConnectButton } from "./$ConnectAccount"
import { $ButtonSecondary, $defaultMiniButtonSecondary, $ButtonPrimaryCtx } from "./form/$Button"
import { Stream } from "@most/types"
import * as viem from "viem"
import * as PUPPET from "puppet-middleware-const"
import * as GMX from "gmx-middleware-const"
import { $Popover } from "./$Popover"
import { $TextField } from "../common/$TextField"

interface ISubscribeDrawer {
  subscribeList: Stream<ITraderSubscritpion[]>
  subscribeTrader: Stream<ITraderSubscritpion>
}

export const $SubscriberDrawer = (config: ISubscribeDrawer) => component((
  [requestChangeSubscription, requestChangeSubscriptionTether]: Behavior<PointerEvent, Promise<viem.TransactionReceipt>>,
  [requestDepositAsset, requestDepositAssetTether]: Behavior<PointerEvent, Promise<viem.TransactionReceipt>>,
  [changeSubscribeList, changeSubscribeListTether]: Behavior<ITraderSubscritpion[]>,
  [inputDepositAmount, inputDepositAmountTether]: Behavior<string>,

  [openDepositPopover, openDepositPopoverTether]: Behavior<any>,
  [clickMaxDeposit, clickMaxDepositTether]: Behavior<any>,

) => {

  const orchestrator = connectContract(PUPPET.CONTRACT[42161].Orchestrator)

  const lstate = snapshot((list, add) => {
    return [...list, add]
  }, config.subscribeList, config.subscribeTrader)


  return [
    switchMap(list => {
      const routeMap = Object.entries(groupArrayMany(list, x => x.routeTypeKey)) as [viem.Hex, ITraderSubscritpion[]][]
        
      return fadeIn(
        $card2(style({ position: 'absolute', zIndex: 11, inset: 'auto 0 0 0', bottom: '0', border: `1px solid ${colorAlpha(pallete.foreground, .20)}`, borderBottom: 'none', padding: '26px', borderRadius: '20px 20px 0 0' }))(
          $IntermediateConnectButton({
            $$display: map(w3p => {
              
              return $column(layoutSheet.spacing)(
                $row(layoutSheet.spacingSmall)(
                  $text(style({ fontWeight: 'bold', fontSize: '1.45rem', }))('Add Subscriptions'),
                ),

                ...routeMap.map(([routeKey, traders]) => {
                  const routeType = PUPPET.ROUTE_TYPE_DESCRIPTIN[routeKey]
                  const indexToken = GMX.TOKEN_ADDRESS_DESCRIPTION[routeType.indexToken]

                  return $column(layoutSheet.spacing)(
                    $row(layoutSheet.spacingSmall)(
                      $route(PUPPET.ROUTE_TYPE_DESCRIPTIN[routeKey], '34px'),

                      $node(style({ flex: 1 }))(),

                      $alertTooltip($text('Deposit funds to this route to enable Mirroring')),

                      $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
                        $Popover({
                          $target: $ButtonSecondary({
                            $container: $defaultMiniButtonSecondary,
                            $content: $text('Deposit')
                          })({
                            click: openDepositPopoverTether()
                          }),
                          $popContent: map(() => {

                            const maxBalance = multicast(join(constant(map(amount => tokenAmount(routeType.indexToken, amount), nativeBalance), clickMaxDeposit)))
                            return $column(layoutSheet.spacing)(

                              $text(style({ maxWidth: '310px' }))('The amount utialised by traders you subscribed'),

                              $row(layoutSheet.spacingSmall, style({ position: 'relative' }))(
                                $TextField({
                                  label: 'Amount',
                                  value: maxBalance,
                                  placeholder: 'Enter amount',
                                  hint: startWith('Balance: ', map(amount => `Balance: ${tokenAmountLabel(routeType.indexToken, amount)}`, nativeBalance)),
                                })({
                                  change: inputDepositAmountTether()
                                }),

                                $ButtonSecondary({
                                  $container: $defaultMiniButtonSecondary(style({ position: 'absolute', right: 0, bottom: '28px' })),
                                  $content: $text('Max'),
                                })({
                                  click: clickMaxDepositTether()
                                })
                              ),
                                
                              $row(style({ placeContent: 'space-between' }))(
                                $node(),
                                $ButtonPrimaryCtx({
                                  $content: $text('Deposit'),
                                  request: requestDepositAsset,
                                })({
                                  click: requestDepositAssetTether(snapshot(params => {
                                    const parsedFormatAmount = parseFixed(params.amount, indexToken.decimals)

                                    return wagmiWriteContract({
                                      ...PUPPET.CONTRACT[42161].Orchestrator,
                                      functionName: 'deposit',
                                      value: parsedFormatAmount,
                                      args: [parsedFormatAmount, routeType.indexToken, w3p.account.address] as const
                                    })
                                  }, combineObject({ amount: mergeArray([maxBalance, inputDepositAmount]) })))
                                })
                              )
                            )
                          }, openDepositPopover)
                        })({}),

                        $row(layoutSheet.spacingSmall)(
                          $infoTooltipLabel($text('The amount utialised by traders you subscribe'), 'Balance'),
                          switchMap(amount => {
                            return $text(tokenAmountLabel(routeType.indexToken, amount))
                          }, orchestrator.read('puppetAccountBalance', w3p.account.address, routeType.indexToken))
                        )
                      )
                      
                    ),

                    $column(style({ paddingLeft: '15px' }))(
                      $row(layoutSheet.spacing)(
                        $seperator2,
                        $column(style({ flex: 1 }))(
                          ...traders.map(subsc => {
                            return $row(layoutSheet.spacing, style({ alignItems: 'center', padding: `10px 0` }))(
                              $accountPreview({ address: subsc.trader }),
                              $text(style({ flex: 1 }))(subsc.subscribed ? 'Subscribe' : 'Unsubscribe'),
                              $text(readableFixedBsp(subsc.allowance))
                            )
                          })
                        )
                      ),
                      $seperator2,
                    )
                  )
                }),
                // $seperator2,
                $ButtonPrimaryCtx({
                  $content: $text('Subscribe'),
                  request: requestChangeSubscription
                })({
                  click: requestChangeSubscriptionTether(
                    map(() => {

                      const allowance = list.map(x => x.allowance)
                      const traders = list.map(a => a.trader)
                      const routeTypes = list.map(x => x.routeTypeKey)
                      const subscribe = list.map(x => x.subscribed)

                      return wagmiWriteContract({
                        ...PUPPET.CONTRACT[42161].Orchestrator,
                        functionName: 'batchSubscribeRoute',
                        args: [allowance, traders, routeTypes, subscribe]
                      })
                    }),
                    multicast
                  )
                })
              )
            })
          })({})
        )
      )
    }, lstate),

    {
      changeSubscribeList
    }
  ]
})