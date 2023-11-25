import { Behavior, O, combineObject, replayLatest } from "@aelea/core"
import { $element, $node, $text, attr, component, nodeEvent, style, stylePseudo } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { constant, empty, map, mergeArray, multicast, skipRepeats, snapshot, startWith, switchLatest, take } from "@most/core"
import { Stream } from "@most/types"
import { TIME_INTERVAL_MAP } from "gmx-middleware-const"
import { $bear, $bull, $caretDown, $check, $icon, $infoLabeledValue, $marketSmallLabel, $target, $tokenIconMap, $tokenLabelFromSummary, $xCross } from "gmx-middleware-ui-components"
import { IMarketCreatedEvent, formatFixed, getTokenDescription, groupArrayMany, hashData, parseBps, readableDate, readablePercentage, switchMap, unixTimestampNow } from "gmx-middleware-utils"
import * as PUPPET from "puppet-middleware-const"
import { IPuppetRouteSubscritpion, getRouteTypeKey } from "puppet-middleware-utils"
import * as viem from "viem"
import { theme } from "../assignThemeSync.js"
import { $TextField } from "../common/$TextField.js"
import { $heading3 } from "../common/$text.js"
import { $card2, $iconCircular, $labeledDivider } from "../common/elements/$common.js"
import { IGmxProcessState } from "../data/process/process"
import { connectContract, wagmiWriteContract } from "../logic/common.js"
import { $seperator2 } from "../pages/common.js"
import { fadeIn } from "../transitions/enter.js"
import { $profileDisplay } from "./$AccountProfile.js"
import { $IntermediateConnectButton } from "./$ConnectAccount.js"
import { $RouteDepositInfo } from "./$common.js"
import { $ButtonCircular, $ButtonPrimary, $ButtonPrimaryCtx } from "./form/$Button.js"
import { $Dropdown, $defaultSelectContainer } from "./form/$Dropdown.js"
import * as GMX from "gmx-middleware-const"
import { $route } from "../common/$common"



interface IRouteSubscribeDrawer {
  subscriptionList: Stream<IPuppetRouteSubscritpion[]>
  modifySubscriber: Stream<IPuppetRouteSubscritpion>
  modifySubscriptionList: Stream<IPuppetRouteSubscritpion[]>
  processData: Stream<IGmxProcessState>
}

export const $RouteSubscriptionDrawer = (config: IRouteSubscribeDrawer) => component((
  [requestChangeSubscription, requestChangeSubscriptionTether]: Behavior<PointerEvent, Promise<viem.TransactionReceipt>>,
  [clickClose, clickCloseTether]: Behavior<any>,
  [clickRemoveSubsc, clickRemoveSubscTether]: Behavior<any, IPuppetRouteSubscritpion >,

) => {


  const { subscriptionList, modifySubscriptionList } = config
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

            const tradeRouteList = map(data => Object.values(data.routeMap), config.processData)

              
            return $column(layoutSheet.spacing)(
              $row(layoutSheet.spacingSmall, style({ placeContent: 'space-between', alignItems: 'center' }))(
                $heading3('Match-making Rules'),

                $RouteDepositInfo({
                  account: w3p.account.address,
                })({}),

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
                    const tradeRoute = params.tradeRouteList.find(m => m.routeTypeKey === routeKey)

                    if (!tradeRoute) {
                      return empty()
                    }


                    return $column(style({ paddingLeft: '16px' }))(
                      $row(style({ marginLeft: '-28px' }))(
                        $route(tradeRoute)
                      ),
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
                              $infoLabeledValue(
                                'Allow',
                                $text(`${readablePercentage(modSubsc.allowance)}`)
                              ),
                              $infoLabeledValue('Until', readableDate(Number(modSubsc.expiry))),
                                
                                
                            )
                          })
                        )
                      ),
                      $seperator2,
                    )
                    
                  })
                )
              }, combineObject({ tradeRouteList, subscriptionList, modifySubscriptionList })),

              $ButtonPrimaryCtx({
                $content: $text('Save Changes'),
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
  // marketList: Stream<IMarketCreatedEvent[]>
}

export const $RouteSubscriptionEditor = (config: IRouteSubscriptionEditor) => component((
  [inputEndDate, inputEndDateTether]: Behavior<any, bigint>,
  [inputAllowance, inputAllowanceTether]: Behavior<any, bigint>,
  [clickUnsubscribe, clickUnsubscribeTether]: Behavior<any, false>,
  [clickSubmit, clickSubmitTether]: Behavior<any>,

  // [switchIsLong, switchIsLongTether]: Behavior<boolean>,
  // [switchisMarketIndexToken, switchisMarketIndexTokenTether]: Behavior<boolean>,
) => {
  const { routeSubscription } = config


  // const collateralToken = replayLatest(switchIsLong, true)
  // const indexToken = replayLatest(switchIsLong, true)
  // const isLong = replayLatest(switchIsLong, true)
  // const isMarketIndexToken = replayLatest(switchisMarketIndexToken, true)

  // const market = mergeArray([
  //   selectMarket,
  //   map(params => {
  //     return params.marketList.find(mkt => mkt.routeTypeKey === config.routeSubscription?.routeTypeKey) || params.marketList[1]
  //   }, combineObject({ marketList, isLong }))
  // ])

  const subscribed = startWith(!!config.routeSubscription?.subscribed || false, clickUnsubscribe)
  const allowance = startWith(config.routeSubscription?.allowance || 500n, inputAllowance)
  
  // const routeTypeKey = map(params => {
  //   const collateralToken = params.isMarketIndexToken ? params.market.indexToken : params.market.shortToken
  //   const routeTypeKeyData = hashData(['address'], [params.market.marketToken])
    
  //   return getRouteTypeKey(collateralToken, params.market.indexToken, params.isLong, routeTypeKeyData)
  // }, combineObject({ indexToken, isLong, collateralToken }))
  const initEnddate = config.routeSubscription?.expiry ? config.routeSubscription?.expiry : BigInt(unixTimestampNow() + TIME_INTERVAL_MAP.YEAR)
  const expiry = startWith(initEnddate, inputEndDate)
  
  const form = combineObject({
    subscribed,
    allowance,
    expiry
  })


  return [
    $column(layoutSheet.spacing, style({ maxWidth: '350px' }))(

      $text('The following rules will apply to this trader whenever he opens and maintain a position'),
      // $labeledDivider('Matching Trigger'),

      // $row(layoutSheet.spacingSmall)(
      //   switchMap(params => {
      //     return $infoLabeledValue(
      //       $text(style({ width: '100px' }))('Position'),
      //       $Dropdown({
      //         $container: $row(style({ borderRadius: '30px', backgroundColor: pallete.background, padding: '4px 8px', position: 'relative', border: `1px solid ${colorAlpha(pallete.foreground, .2)}`, cursor: 'pointer' })),
      //         selector: {
      //           list: params.marketList,
      //           $$option: map(market => $marketSmallLabel(market)),
      //           value: market,
      //         },
      //         $selection: switchMap(market => {
      //           return $row(layoutSheet.spacingSmall)(
      //             $marketSmallLabel(market),
      //             $icon({ $content: $caretDown, width: '14px', viewBox: '0 0 32 32' })
      //           )
      //         }, market),
      //       })({
      //         select: selectMarketTether()
      //       })
      //     )
      //   }, combineObject({ marketList })),
      //   $Dropdown({
      //     $container: $row(style({ borderRadius: '30px', backgroundColor: pallete.background, padding: '4px 8px', position: 'relative', border: `1px solid ${colorAlpha(pallete.foreground, .2)}`, cursor: 'pointer' })),
      //     selector: {
      //       list: [
      //         true,
      //         false,
      //       ],
      //       $$option: map(il => {
      //         return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
      //           $icon({ $content: il ? $bull : $bear, width: '24px', viewBox: '0 0 32 32' }),
      //           $text(il ? 'Long' : 'Short'),
      //         )
      //       }),
      //       value: isLong,
      //     },
      //     $selection: switchLatest(map(il => {
      //       return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
      //         $icon({ $content: il ? $bull : $bear, width: '24px', viewBox: '0 0 32 32' }),
      //         $text(il ? 'Long' : 'Short'),
      //         $icon({ $content: $caretDown, width: '14px', viewBox: '0 0 32 32' })
      //       )
      //     }, isLong)),
      //   })({
      //     select: switchIsLongTether()
      //   }),
      // ),

      // $infoLabeledValue(
      //   $text(style({ width: '100px' }))('Collateral Token'),
      //   switchMap(params => {

      //     return $Dropdown({
      //       $container: $row(style({ borderRadius: '30px', backgroundColor: pallete.background, padding: '4px 8px', position: 'relative', border: `1px solid ${colorAlpha(pallete.foreground, .2)}`, cursor: 'pointer' })),
      //       $selection: switchMap(isIndexToken => {
      //         const token = isIndexToken ? params.market.shortToken : params.market.longToken
      //         const tokenDesc = getTokenDescription(token)

      //         return $row(layoutSheet.spacingTiny, style({ alignItems: 'center', cursor: 'pointer' }))(
      //           $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
      //             $icon({ $content: $tokenIconMap[tokenDesc.symbol], width: '24px', viewBox: '0 0 32 32' }),
      //             $text(tokenDesc.symbol)
      //           ),
      //           $icon({ $content: $caretDown, width: '14px', viewBox: '0 0 32 32' })
      //         )
      //       }, isMarketIndexToken),
      //       selector: {
      //         value: isMarketIndexToken,
      //         $container: $defaultSelectContainer(style({ minWidth: '290px', right: 0 })),
      //         $$option: map(option => {
      //           const token = option ? params.market.longToken : params.market.shortToken
      //           const desc = getTokenDescription(token)

      //           return $tokenLabelFromSummary(desc)
      //         }),
      //         list: [
      //           false,
      //           true
      //         ],
      //       }
      //     })({
      //       select: switchisMarketIndexTokenTether()
      //     })
      //   }, combineObject({ market })),
      // ),

      // $labeledDivider('Deposit rules'),

      $TextField({
        label: 'Allow %',
        value: take(1, map(x => formatFixed(x, 4) * 100, allowance)),
        labelWidth: 100,
        hint: `% allocated per position adjustment. Lower values decrease risk. Helps with easier management if peformance is below expectation`,
      })({
        change: inputAllowanceTether(
          map(x => parseBps(x / 100))
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


      $node(),

      $row(style({ placeContent: 'flex-end', alignItems: 'center' }))(
        $ButtonPrimary({
          $content: $text('Subscribe'),
        })({
          click: clickSubmitTether()
        }),
        
        routeSubscription?.subscribed ? 
          $ButtonPrimary({
            $content: $text('Unsubscribe'),
          })({
            click: clickUnsubscribeTether(constant(false))
          })
          : empty(),
      )
    

    ),

    {
      changeRouteSubscription: snapshot(subsc => {
        return { ...routeSubscription, ...subsc }
      }, form, clickSubmit),
    }
  ]
})


