import { Behavior, O, combineObject, replayLatest } from "@aelea/core"
import { $element, $text, attr, component, nodeEvent, style, styleBehavior } from "@aelea/dom"
import { $column, $row, InputType, layoutSheet } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { constant, empty, map, mergeArray, multicast, never, now, sample, skipRepeats, snapshot, startWith, tap } from "@most/core"
import { Stream } from "@most/types"
import { $caretDown, $check, $icon, $target, $xCross } from "gmx-middleware-ui-components"
import { formatBps, getMappedValue, groupArrayMany, parseBps, readableFixedBsp, replayState, switchMap, unixTimestampNow } from "gmx-middleware-utils"
import * as PUPPET from "puppet-middleware-const"
import { IPuppetRouteSubscritpion } from "puppet-middleware-utils"
import * as viem from "viem"
import { $TextField } from "../common/$TextField.js"
import { $heading3 } from "../common/$text.js"
import { $card2, $iconCircular } from "../elements/$common.js"
import { wagmiWriteContract } from "../logic/common.js"
import { $seperator2 } from "../pages/common.js"
import { fadeIn } from "../transitions/enter.js"
import { $profileDisplay } from "./$AccountProfile.js"
import { $IntermediateConnectButton } from "./$ConnectAccount.js"
import { $RouteDepositInfo } from "./$common.js"
import { $ButtonCircular, $ButtonPrimary, $ButtonPrimaryCtx } from "./form/$Button.js"
import { $Select } from "./form/$Select"
import { $route } from "../common/$common"
import { $Dropdown } from "./form/$Dropdown"
import { $trash } from "../elements/$icons"

interface IRouteSubscribeDrawer {
  subscriptionList: Stream<IPuppetRouteSubscritpion[]>
  modifySubscriber: Stream<IPuppetRouteSubscritpion>
  modifySubscriptionList: Stream<IPuppetRouteSubscritpion[]>
}

export const $RouteSubscriptionDrawer = (config: IRouteSubscribeDrawer) => component((
  [requestChangeSubscription, requestChangeSubscriptionTether]: Behavior<PointerEvent, Promise<viem.TransactionReceipt>>,
  [clickClose, clickCloseTether]: Behavior<any>,
  [clickRemoveSubsc, clickRemoveSubscTether]: Behavior<any, IPuppetRouteSubscritpion >,

) => {



  const openIfEmpty = skipRepeats(map(l => l.length > 0, config.modifySubscriptionList))



  return [
    switchMap(isOpen => {
      if (!isOpen) {
        return empty()
      }

      
        
      return fadeIn($card2(style({ border: `1px solid ${colorAlpha(pallete.foreground, .20)}`, borderBottom: 'none', padding: '18px', borderRadius: '20px 20px 0 0' }))(
        $IntermediateConnectButton({
          $$display: map(w3p => {
              
            return $column(layoutSheet.spacing)(
              $row(layoutSheet.spacingSmall, style({ placeContent: 'space-between', alignItems: 'center' }))(
                $heading3('Change Subscriptions'),

                $ButtonCircular({
                  $iconPath: $xCross,
                })({
                  click: clickCloseTether()
                })
              ),

              switchMap(params => {
                const routeMap = Object.entries(groupArrayMany(params.modifySubscriptionList, x => x.routeTypeKey)) as [viem.Hex, IPuppetRouteSubscritpion[]][]



                return $column(layoutSheet.spacing)(
                  ...routeMap.map(([routeKey, subscList]) => {
                    const routeType = PUPPET.ROUTE_DESCRIPTIN_MAP[routeKey]



                    return $column(layoutSheet.spacing)(
                      $RouteDepositInfo({
                        routeDescription: routeType,
                        wallet: w3p
                      })({}),

                      $column(style({ paddingLeft: '16px' }))(
                        $row(layoutSheet.spacing)(
                          $seperator2,
                          $column(style({ flex: 1 }))(
                            ...subscList.map(modSubsc => {

                              const subsc = params.subscriptionList.find(x => x.routeTypeKey === routeKey && x.trader === modSubsc.trader)

                              const iconColorParams = subsc ? modSubsc.subscribed ? { fill: pallete.foreground, icon: $target } : { fill: pallete.negative, icon: $xCross } : { fill: pallete.positive, icon: $check }

                              return $row(layoutSheet.spacing, style({ alignItems: 'center', padding: `10px 0` }))(
                                O(style({ marginLeft: '-32px', backgroundColor: pallete.horizon, cursor: 'pointer' }), clickRemoveSubscTether(nodeEvent('click'), constant(modSubsc)))(
                                  $iconCircular($xCross)
                                ),
                                $profileDisplay({
                                  address: modSubsc.trader,
                                  // $profileContainer: $defaultBerry(style({ width: '50px' }))
                                }),
                                $text(readableFixedBsp(modSubsc.allowance * 100n)),
                              )
                            })
                          )
                        ),
                        $seperator2,
                      )
                    )
                  })
                )
              }, combineObject({ subscriptionList: config.subscriptionList, modifySubscriptionList: config.modifySubscriptionList })),

              $ButtonPrimaryCtx({
                $content: $text('Subscribe'),
                request: requestChangeSubscription
              })({
                click: requestChangeSubscriptionTether(
                  snapshot(list => {

                    const allowance = list.map(x => x.allowance)
                    const traders = list.map(a => a.trader)
                    const routeTypes = list.map(x => x.routeTypeKey)
                    const subscribe = list.map(x => x.subscribed)

                    return wagmiWriteContract({
                      ...PUPPET.CONTRACT[42161].Orchestrator,
                      functionName: 'batchSubscribeRoute',
                      args: [allowance, traders, routeTypes, subscribe]
                    })
                  }, config.modifySubscriptionList),
                  multicast
                )
              })
            )
          })
        })({})
      ))
      
    }, openIfEmpty),

    {
      modifySubscriptionList: mergeArray([
        snapshot((list, modify) => {
          const index = list.findIndex(x =>
            x.routeTypeKey === modify.routeTypeKey && x.trader === modify.trader
          )
          const newList = [...list]

          if (index === -1) {
            newList.push(modify)
            return newList
          }

          newList[index] = modify
          return newList
        }, config.modifySubscriptionList, config.modifySubscriber),
        snapshot((list, subsc) => {
          const idx = list.indexOf(subsc)

          if (idx === -1) {
            return list
          }

          list.splice(idx, 1)

          return list
        }, config.modifySubscriptionList, clickRemoveSubsc),
        constant([], clickClose)
      ])
      // changeSubscribeList: mergeArray([
      //   modifySubscribeList,
      //   constant([], clickClose)
      // ])
    }
  ]
})




interface IRouteSubscriptionEditor {
  routeSubscription?: IPuppetRouteSubscritpion
}

export const $RouteSubscriptionEditor = (config: IRouteSubscriptionEditor) => component((
  // [inputEndDate, inputEndDateTether]: Behavior<any, bigint>,
  [inputAllowance, inputAllowanceTether]: Behavior<any, bigint>,
  [clickUnsubscribe, clickUnsubscribeTether]: Behavior<any, bigint>,
  [clickSubmit, clickSubmitTether]: Behavior<any>,
  [selectRouteType, selectRouteTypeTether]: Behavior<viem.Hex>,
) => {
  const routeTypeList = Object.keys(PUPPET.ROUTE_DESCRIPTIN_MAP) as viem.Hex[]


  const allowance = startWith(config.routeSubscription?.allowance || 500n, inputAllowance)
  const routeTypeKey = startWith(routeTypeList.find(key => key === config.routeSubscription?.routeTypeKey) || routeTypeList[0], selectRouteType)
  // const initEnddate = config.routeSubscription?.endDate && config.routeSubscription.endDate > unixTimestampNow() ? config.routeSubscription?.endDate : 0n
  // const endDate = startWith(initEnddate, inputEndDate)
  
  const form = combineObject({
    allowance,
    // endDate,
    routeTypeKey
  })


  return [
    $column(layoutSheet.spacing, style({ maxWidth: '350px' }))(

      $text('The following rules will apply to this trader whenever he opens and maintain a position'),

      $Dropdown({
        // $container: $row(style({ alignSelf: 'center', position: 'relative' })),
        value: {
          list: routeTypeList,
          $$option: map(key => $route(getMappedValue(PUPPET.ROUTE_DESCRIPTIN_MAP, key))),
          value: routeTypeKey,
        },
        $selection: switchMap(key => {
          return $row(layoutSheet.spacingSmall)(
            $route(getMappedValue(PUPPET.ROUTE_DESCRIPTIN_MAP, key)),
            $icon({ $content: $caretDown, width: '14px', viewBox: '0 0 32 32' })
          )
        }, routeTypeKey),
      })({
        select: selectRouteTypeTether()
      }),      

      $column(layoutSheet.spacing, style({ }))(
        $TextField({
          label: 'Allow %',
          value: map(x => formatBps(x * 100n), allowance),
          labelWidth: 100,
          hint: `% allocated per position adjustment. Lower values decrease risk. Helps with easier management if peformance is below expectation"`,
        })({
          change: inputAllowanceTether(
            map(x => parseBps(x) / 100n)
          )
        }),
        // $TextField({
        //   label: 'End Date',
        //   $input: $element('input')(attr({ type: 'datetime-local' })),
        //   hint: 'limit the amount of time you are subscribed',
        //   placeholder: 'never',
        //   labelWidth: 100,
        //   value: map(x => {
        //     if (x === 0n) {
        //       return ''
        //     }

        //     return new Date(Number(x) * 1000).toISOString().slice(0, 16)
        //   }, endDate),
        // })({
        //   change: inputEndDateTether(
        //     map(x => BigInt(new Date(x).getTime() / 1000))
        //   )
        // })
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


