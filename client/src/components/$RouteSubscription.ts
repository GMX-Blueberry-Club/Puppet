import { Behavior, combineObject } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { empty, map, mergeArray, multicast, now, sample, snapshot, startWith } from "@most/core"
import { Stream } from "@most/types"
import { $xCross } from "gmx-middleware-ui-components"
import { formatBps, groupArrayMany, parseBps, readableFixedBsp, replayState, switchMap } from "gmx-middleware-utils"
import * as PUPPET from "puppet-middleware-const"
import { IPuppetRouteSubscritpion } from "puppet-middleware-utils"
import * as viem from "viem"
import { $TextField } from "../common/$TextField.js"
import { $heading3 } from "../common/$text.js"
import { $card2, $iconCircular } from "../elements/$common.js"
import { wagmiWriteContract } from "../logic/common.js"
import { $seperator2 } from "../pages/common.js"
import { fadeIn } from "../transitions/enter.js"
import { $discoverIdentityDisplay } from "./$AccountProfile.js"
import { $IntermediateConnectButton } from "./$ConnectAccount.js"
import { $RouteDepositInfo } from "./$common.js"
import { $ButtonCircular, $ButtonPrimary, $ButtonPrimaryCtx } from "./form/$Button.js"
import { $Select } from "./form/$Select"
import { $route } from "../common/$common"
import { $Dropdown } from "./form/$Dropdown"

interface IRouteSubscribeDrawer {
  subscribeList: Stream<IPuppetRouteSubscritpion[]>
  subscribeTrader: Stream<IPuppetRouteSubscritpion>
}

export const $RouteSubscriptionDrawer = (config: IRouteSubscribeDrawer) => component((
  [requestChangeSubscription, requestChangeSubscriptionTether]: Behavior<PointerEvent, Promise<viem.TransactionReceipt>>,
  [changeSubscribeList, changeSubscribeListTether]: Behavior<IPuppetRouteSubscritpion[]>,
  [clickClose, clickCloseTether]: Behavior<any>,

) => {





  return [
    switchMap(list => {
      if (list.length === 0) {
        return empty()
      }

      
      const routeMap = Object.entries(groupArrayMany(list, x => x.routeTypeKey)) as [viem.Hex, IPuppetRouteSubscritpion[]][]
        
      return fadeIn(
        $card2(style({ position: 'absolute', maxWidth: '624px', margin: '0 auto', zIndex: 21, inset: 'auto 0 0 0', bottom: '0', border: `1px solid ${colorAlpha(pallete.foreground, .20)}`, borderBottom: 'none', padding: '18px', borderRadius: '20px 20px 0 0' }))(
          $IntermediateConnectButton({
            $$display: map(w3p => {
              
              return $column(layoutSheet.spacing)(
                $row(layoutSheet.spacingSmall, style({ placeContent: 'space-between', alignItems: 'center' }))(
                  $heading3('Modify Subscriptions'),

                  $ButtonCircular({
                    $iconPath: $xCross,
                  })({
                    click: clickCloseTether()
                  })
                ),

                ...routeMap.map(([routeKey, traders]) => {
                  const routeType = PUPPET.ROUTE_DESCRIPTIN_MAP[routeKey]

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
                              $iconCircular($xCross),
                              $text(readableFixedBsp(subsc.allowance)),
                            )
                          })
                        )
                      ),
                      $seperator2,
                    )
                  )
                }),

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
    }, config.subscribeList),

    {
      changeSubscribeList,
      clickClose
    }
  ]
})




interface IRouteSubscriptionEditor {
  routeSubscription?: IPuppetRouteSubscritpion
}

export const $RouteSubscriptionEditor = (config: IRouteSubscriptionEditor) => component((
  [inputEndDate, inputEndDateTether]: Behavior<any, bigint>,
  [inputAllowance, inputAllowanceTether]: Behavior<any, bigint>,
  [clickUnsubscribe, clickUnsubscribeTether]: Behavior<any, bigint>,
  [clickSubmit, clickSubmitTether]: Behavior<any>,
) => {

  const allowance = startWith(1000n, inputAllowance)
  const endDate = startWith(0n, inputEndDate)
  
  const form = combineObject({
    allowance,
    endDate
  })

  const routes = Object.entries(PUPPET.ROUTE_DESCRIPTIN_MAP)

  const selectedRoute = routes.find(([key, route]) => key === config.routeSubscription?.routeTypeKey) || routes[0]


  return [
    $column(layoutSheet.spacing)(

      $text(style({ width: '340px' }))('The following rules will apply to this trader whenever they open and maintain a position'),

      $Dropdown({
        value: {
          list: routes,
          $$option: map(([option, route]) => $route(route)),
          value: now(routes[0]),
        },
        $selection: $route(selectedRoute[1]),
      })({}),

      $row(layoutSheet.spacing, style({ alignItems: 'flex-start', width: '325px' }))(
        style({ flex: 6 })(
          $TextField({
            label: 'Allow',
            value: map(x => readableFixedBsp(x * 100n), allowance),
            hint: 'amount taken every trade on this route',
          })({
            change: inputAllowanceTether(
              map(x => parseBps(x.slice(0, -1)) / 100n)
            )
          })
        ),
        style({ flex: 7 })(
          $TextField({
            label: 'End Date',
            hint: 'limit the amount of time you are subscribed',
            placeholder: 'never',
            value: map(x => '', endDate),
          })({
            change: inputEndDateTether(
              map(x => parseBps(Number(x)))
            )
          })
        )
      ),

      $ButtonPrimary({
        $content: $text('Change'),
      })({
        click: clickSubmitTether()
      }),

      config.routeSubscription ? $seperator2 : empty(),

      config.routeSubscription ? 
        $ButtonPrimary({
          $content: $text('Unsubscribe'),
        })({
          click: clickUnsubscribeTether()
        })
        : empty(),

    ),

    {
      changeRouteSubscription: mergeArray([
        snapshot(subsc => {
          return { ...config.routeSubscription, ...subsc }
        }, form, clickSubmit),
        map(() => ({ ...config.routeSubscription, subscribed: false }), clickUnsubscribe)
      ]),
    }
  ]
})


