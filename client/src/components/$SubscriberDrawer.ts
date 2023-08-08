import { Behavior } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { map, multicast, snapshot } from "@most/core"
import { Stream } from "@most/types"
import { formatBps, groupArrayMany, readableFixedBsp, switchMap } from "gmx-middleware-utils"
import * as PUPPET from "puppet-middleware-const"
import { IPuppetRouteSubscritpion } from "puppet-middleware-utils"
import * as viem from "viem"
import { $card2 } from "../elements/$common"
import { wagmiWriteContract } from "../logic/common"
import { $seperator2 } from "../pages/common"
import { fadeIn } from "../transitions/enter"
import { $discoverIdentityDisplay } from "./$AccountProfile"
import { $IntermediateConnectButton } from "./$ConnectAccount"
import { $RouteDepositInfo } from "./$common"
import { $ButtonPrimaryCtx } from "./form/$Button"

interface ISubscribeDrawer {
  subscribeList: Stream<IPuppetRouteSubscritpion[]>
  subscribeTrader: Stream<IPuppetRouteSubscritpion>
}

export const $SubscriberDrawer = (config: ISubscribeDrawer) => component((
  [requestChangeSubscription, requestChangeSubscriptionTether]: Behavior<PointerEvent, Promise<viem.TransactionReceipt>>,
  [requestDepositAsset, requestDepositAssetTether]: Behavior<PointerEvent, Promise<viem.TransactionReceipt>>,
  [changeSubscribeList, changeSubscribeListTether]: Behavior<IPuppetRouteSubscritpion[]>,
  [inputDepositAmount, inputDepositAmountTether]: Behavior<string>,

  [openDepositPopover, openDepositPopoverTether]: Behavior<any>,
  [clickMaxDeposit, clickMaxDepositTether]: Behavior<any>,

) => {


  const lstate = snapshot((list, add) => {
    return [...list, add]
  }, config.subscribeList, config.subscribeTrader)


  return [
    switchMap(list => {
      const routeMap = Object.entries(groupArrayMany(list, x => x.routeTypeKey)) as [viem.Hex, IPuppetRouteSubscritpion[]][]
        
      return fadeIn(
        $card2(style({ position: 'absolute', maxWidth: '1024px', margin: '0 auto', zIndex: 11, inset: 'auto 0 0 0', bottom: '0', border: `1px solid ${colorAlpha(pallete.foreground, .20)}`, borderBottom: 'none', padding: '26px', borderRadius: '20px 20px 0 0' }))(
          $IntermediateConnectButton({
            $$display: map(w3p => {
              
              return $column(layoutSheet.spacing)(
                $row(layoutSheet.spacingSmall)(
                  $text(style({ fontWeight: 'bold', fontSize: '1.45rem', }))('Modify Subscriptions'),
                ),

                ...routeMap.map(([routeKey, traders]) => {
                  const routeType = PUPPET.ROUTE_TYPE_DESCRIPTIN[routeKey]

                  return $column(layoutSheet.spacing)(
                    $RouteDepositInfo({
                      routeDescription: routeType,
                      wallet: w3p
                    })({}),

                    $column(style({ paddingLeft: '15px' }))(
                      $row(layoutSheet.spacing)(
                        $seperator2,
                        $column(style({ flex: 1 }))(
                          ...traders.map(subsc => {
                            return $row(layoutSheet.spacing, style({ alignItems: 'center', padding: `10px 0` }))(
                              $discoverIdentityDisplay({
                                address: subsc.trader,
                                // $profileContainer: $defaultBerry(style({ width: '50px' }))
                              }),
                              $text(style({ flex: 1 }))(subsc.subscribed ? 'Subscribe' : 'Unsubscribe'),
                              $text(readableFixedBsp(subsc.allowance)),
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


