import { Behavior, O, combineObject } from "@aelea/core"
import { $element, $text, attr, component, nodeEvent, style, stylePseudo } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { constant, empty, map, mergeArray, multicast, skipRepeats, snapshot, startWith } from "@most/core"
import { Stream } from "@most/types"
import { $caretDown, $check, $icon, $infoLabeledValue, $target, $xCross } from "gmx-middleware-ui-components"
import { formatBps, getMappedValue, groupArrayMany, parseBps, readableDate, readableFixedBsp, switchMap, tokenAmountLabel, unixTimestampNow } from "gmx-middleware-utils"
import * as PUPPET from "puppet-middleware-const"
import { IPuppetRouteSubscritpion } from "puppet-middleware-utils"
import * as viem from "viem"
import { $TextField } from "../common/$TextField.js"
import { $route } from "../common/$common"
import { $heading3 } from "../common/$text.js"
import { $card2, $iconCircular } from "../elements/$common.js"
import { connectContract, wagmiWriteContract } from "../logic/common.js"
import { $seperator2 } from "../pages/common.js"
import { fadeIn } from "../transitions/enter.js"
import { $profileDisplay } from "./$AccountProfile.js"
import { $IntermediateConnectButton } from "./$ConnectAccount.js"
import { $RouteDepositInfo } from "./$common.js"
import { $ButtonCircular, $ButtonPrimary, $ButtonPrimaryCtx, $ButtonSecondary } from "./form/$Button.js"
import { $Dropdown } from "./form/$Dropdown"
import { TIME_INTERVAL_MAP } from "gmx-middleware-const"
import { theme } from "../assignThemeSync"
import { ROUTE_DESCRIPTIN_MAP } from "../logic/utils"



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

            const orchestrator = connectContract(PUPPET.CONTRACT[42161].Orchestrator)

              
            return $column(layoutSheet.spacing)(
              $row(layoutSheet.spacingSmall, style({ placeContent: 'space-between', alignItems: 'center' }))(
                $heading3('Match-making Rules'),

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
                    const routeType = ROUTE_DESCRIPTIN_MAP[routeKey]



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

                              const iconColorParams = subsc
                                ? modSubsc.subscribed
                                  ? { fill: pallete.message, icon: $target, label: 'Edit' }: { fill: pallete.negative, icon: $xCross, label: 'Remove' }
                                : { fill: pallete.positive, icon: $check, label: 'Add' }

                              // text-align: center;
                              // color: rgb(56, 229, 103);
                              // padding: 4px 12px;
                              // border-radius: 6px;
                              // background-color: rgba(56, 229, 103, 0.1);
                              return $row(layoutSheet.spacing, style({ alignItems: 'center', padding: `10px 0` }))(
                                O(style({ marginLeft: '-32px', backgroundColor: pallete.horizon, cursor: 'pointer' }), clickRemoveSubscTether(nodeEvent('click'), constant(modSubsc)))(
                                  $iconCircular($xCross)
                                ),
                                $row(style({ width: '62px' }))(
                                  $text(style({ backgroundColor: colorAlpha(iconColorParams.fill, .1), marginLeft: `-30px`, borderRadius: '6px', padding: '6px 12px 6px 22px', color: iconColorParams.fill,  }))(iconColorParams.label),  
                                ),

                                // switchMap(amount => {
                                //   return $text(tokenAmountLabel(routeType.indexToken, amount))
                                // }, orchestrator.read('puppetAccountBalance', w3p.account.address, routeType.indexToken)),

                                $profileDisplay({
                                  address: modSubsc.trader,
                                  // $profileContainer: $defaultBerry(style({ width: '50px' }))
                                }),

                                $row(style({ flex: 1 }))(),
                                $infoLabeledValue('Copy Until', readableDate(Number(modSubsc.expiry))),
                                $infoLabeledValue(
                                  'Allow',
                                  $text(`${readableFixedBsp(modSubsc.allowance * 100n)}`)
                                ),
                                
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
                    const owner = w3p.account.address
                    const allowances = list.map(x => x.allowance)
                    const expiries = list.map(x => x.expiry)
                    const traders = list.map(a => a.trader)
                    const routeTypes = list.map(x => x.routeTypeKey)
                    const subscribes = list.map(x => x.subscribed)

                    return wagmiWriteContract({
                      ...PUPPET.CONTRACT[42161].Orchestrator,
                      functionName: 'batchSubscribeRoute',
                      args: [owner, allowances, expiries, traders, routeTypes, subscribes]
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
  [inputEndDate, inputEndDateTether]: Behavior<any, bigint>,
  [inputAllowance, inputAllowanceTether]: Behavior<any, bigint>,
  [clickUnsubscribe, clickUnsubscribeTether]: Behavior<any, false>,
  [clickSubmit, clickSubmitTether]: Behavior<any>,
  [selectRouteType, selectRouteTypeTether]: Behavior<viem.Hex>,
) => {
  const routeTypeList = Object.keys(PUPPET.ROUTE_DESCRIPTIN_MAP) as viem.Hex[]


  const subscribed = startWith(true, clickUnsubscribe)
  const allowance = startWith(config.routeSubscription?.allowance || 500n, inputAllowance)
  const routeTypeKey = startWith(routeTypeList.find(key => key === config.routeSubscription?.routeTypeKey) || routeTypeList[0], selectRouteType)
  const initEnddate = config.routeSubscription?.expiry ? config.routeSubscription?.expiry : BigInt(unixTimestampNow() + TIME_INTERVAL_MAP.YEAR)
  const expiry = startWith(initEnddate, inputEndDate)
  
  const form = combineObject({
    subscribed,
    allowance,
    expiry,
    routeTypeKey
  })


  return [
    $column(layoutSheet.spacing, style({ maxWidth: '350px' }))(

      $text('The following rules will apply to this trader whenever he opens and maintain a position'),

      $row(style({ placeContent: 'center' }))(
        $Dropdown({
          $container: $row(style({ borderRadius: '30px', backgroundColor: pallete.background, padding: '4px 8px', position: 'relative', border: `1px solid ${colorAlpha(pallete.foreground, .2)}`, cursor: 'pointer' })),
          selector: {
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
      ),

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
      $TextField({
        label: 'Expiration',
        $input: $element('input')(
          attr({ type: 'date' }),
          stylePseudo('::-webkit-calendar-picker-indicator', { filter: theme.name === 'dark' ? `invert(1)` : '' })
        ),
        hint: 'set a date when this rule will expire, default is 1 year',
        placeholder: 'never',
        labelWidth: 100,
        value: map(time => {
          return new Date(Number(time * 1000n)).toISOString().slice(0, 10)
        }, expiry),
      })({
        change: inputEndDateTether(
          map(x => BigInt(new Date(x).getTime() / 1000))
        )
      }),


      $seperator2,

      $row(style({ placeContent: 'space-between' }))(
        $ButtonSecondary({
          $content: $text('Change'),
        })({
          click: clickSubmitTether()
        }),

        
        config.routeSubscription ? 
          $ButtonSecondary({
            $content: $text('Unsubscribe'),
          })({
            click: clickUnsubscribeTether(constant(false))
          })
          : empty(),
      )
    

    ),

    {
      changeRouteSubscription: snapshot(subsc => {
        return { ...config.routeSubscription, ...subsc }
      }, form, clickSubmit),
    }
  ]
})


