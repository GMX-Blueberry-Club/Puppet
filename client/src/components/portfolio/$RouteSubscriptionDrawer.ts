import { Behavior, O, combineObject } from "@aelea/core"
import { $node, $text, component, nodeEvent, style } from "@aelea/dom"
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { awaitPromises, constant, empty, join, map, mergeArray, now, skipRepeats, snapshot } from "@most/core"
import { Stream } from "@most/types"
import * as GMX from "gmx-middleware-const"
import { $alertTooltip, $check, $infoLabeledValue, $infoTooltip, $infoTooltipLabel, $target, $xCross } from "gmx-middleware-ui-components"
import { groupArrayMany, readableDate, readablePercentage, readableTokenAmountLabel, switchMap, unixTimestampNow } from "gmx-middleware-utils"
import * as PUPPET from "puppet-middleware-const"
import { ISetRouteType, ISubscribeTradeRouteDto, getPuppetDepositAccountKey } from "puppet-middleware-utils"
import * as viem from "viem"
import { $profileDisplay } from "../$AccountProfile.js"
import { $Popover } from "../$Popover.js"
import { $route } from "../../common/$common.js"
import { $heading3 } from "../../common/$text.js"
import { $card2, $iconCircular, $responsiveFlex } from "../../common/elements/$common.js"
import { connectContract, wagmiWriteContract } from "../../logic/common.js"
import { $seperator2 } from "../../pages/common.js"
import { fadeIn } from "../../transitions/enter.js"
import { IWalletClient, wallet } from "../../wallet/walletLink.js"
import { $ButtonCircular, $ButtonPrimaryCtx, $ButtonSecondary, $defaultMiniButtonSecondary } from "../form/$Button.js"
import { $AssetDepositEditor } from "./$AssetDepositEditor.js"
import { IChangeSubscription } from "./$RouteSubscriptionEditor"


interface IRouteSubscribeDrawer {
  modifySubscriber: Stream<IChangeSubscription>
  modifySubscriptionList: Stream<IChangeSubscription[]>
  routeTypeList: Stream<ISetRouteType[]>
}

export const $RouteSubscriptionDrawer = ({ modifySubscriptionList, modifySubscriber, routeTypeList }: IRouteSubscribeDrawer) => component((
  [requestChangeSubscription, requestChangeSubscriptionTether]: Behavior<IWalletClient, Promise<viem.TransactionReceipt>>,
  [clickClose, clickCloseTether]: Behavior<any>,
  [clickRemoveSubsc, clickRemoveSubscTether]: Behavior<any, IChangeSubscription >,
  [openDepositPopover, openDepositPopoverTether]: Behavior<any>,
  [requestDepositAsset, requestDepositAssetTether]: Behavior<Promise<viem.TransactionReceipt>>,
) => {

  const openIfEmpty = skipRepeats(map(l => l.length > 0, modifySubscriptionList))
  const account = map(w3p => w3p?.account.address || null, wallet)
  const datastore = connectContract(PUPPET.CONTRACT[42161].Datastore)
  const readPuppetDeposit = switchMap(address => {
    if (!address) {
      return now(0n)
    }
      
    const readDepositBalance = datastore.read('getUint', getPuppetDepositAccountKey(address, GMX.ARBITRUM_ADDRESS.USDC))
    return mergeArray([
      readDepositBalance,
      join(constant(readDepositBalance, awaitPromises(requestDepositAsset)))
    ])
  }, account)


  const validationError = map(amount => {
    if (amount == 0n) {
      return 'Allow USDC spend amount'
    }

    return null
  }, readPuppetDeposit)
  

  return [
    switchMap(isOpen => {
      if (!isOpen) {
        return empty()
      }

      return fadeIn($card2(style({ border: `1px solid ${colorAlpha(pallete.foreground, .20)}`, borderBottom: 'none', padding: '18px', borderRadius: '20px 20px 0 0' }))(
        $column(layoutSheet.spacing)(
          $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
            $heading3('Portfolio Rules'),
            $infoTooltip('The following rules will apply to these traders in your portfolio. visit Profile to view your portfolio'),

            $node(style({ flex: 1 }))(),

            $ButtonCircular({
              $iconPath: $xCross,
            })({
              click: clickCloseTether()
            })
          ),

          switchMap(params => {
            const routeMap = Object.entries(groupArrayMany(params.modifySubscriptionList, x => x.routeTypeKey)) as [viem.Hex, IChangeSubscription[]][]

            return $column(layoutSheet.spacing)(
              ...routeMap.map(([routeTypeKey, subscList]) => {
                const tradeRoute = params.routeTypeList.find(m => m.routeTypeKey === routeTypeKey)

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
                        const iconColorParams = modSubsc.previousSubscriptionExpiry > 0n
                          ? modSubsc.expiry === 0n
                            ? { fill: pallete.negative, icon: $xCross, label: 'Remove' } : { fill: pallete.message, icon: $target, label: 'Edit' }
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
                          $row(style({ width: '32px' }))(
                            $text(style({ backgroundColor: colorAlpha(iconColorParams.fill, .1), marginLeft: `-30px`, borderRadius: '6px', padding: '6px 12px 6px 22px', color: iconColorParams.fill,  }))(iconColorParams.label),  
                          ),

                          // switchMap(amount => {
                          //   return $text(tokenAmountLabel(routeType.indexToken, amount))
                          // }, orchestrator.read('puppetAccountBalance', w3p.account.address, routeType.indexToken)),

                          $profileDisplay({
                            address: modSubsc.trader,
                            // $profileContainer: $defaultBerry(style({ width: '50px' }))
                          }),

                          $infoLabeledValue('Expiry', readableDate(Number(modSubsc.expiry)), true),
                          $infoLabeledValue('Allowance', $text(`${readablePercentage(modSubsc.allowance)}`), true),
                                
                        )
                      })
                    )
                  ),
                  $seperator2,
                )
                    
              })
            )
          }, combineObject({ modifySubscriptionList, routeTypeList })),

          $row(layoutSheet.spacingSmall, style({ placeContent: 'space-between' }))(
            switchMap(amount => {
              return $row(layoutSheet.spacing, style({ alignItems: 'center', minWidth: '0' }))(
                $Popover({
                  open: constant(
                    $AssetDepositEditor({
                      token: GMX.ARBITRUM_ADDRESS.USDC
                    })({
                      requestDepositAsset: requestDepositAssetTether(),
                    }),
                    openDepositPopover
                  ),
                  $target: $row(layoutSheet.spacing)(
                    $responsiveFlex(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                      $infoTooltipLabel($text('The amount utialised by traders you subscribe'), 'Balance'),
                      $text(readableTokenAmountLabel(GMX.ARBITRUM_ADDRESS.USDC, amount))
                    ),
                    $ButtonSecondary({
                      $container: $defaultMiniButtonSecondary,
                      $content: $text('Deposit')
                    })({
                      click: openDepositPopoverTether()
                    }),
                  ),
                })({}),

                amount === 0n ? $alertTooltip($text('You need to deposit funds to to enable mirroring')) : empty(),
              )
            }, readPuppetDeposit),
            $node(),
            $ButtonPrimaryCtx({
              disabled: map(alert => alert !== null, validationError),
              $content: $text(screenUtils.isDesktopScreen ? 'Save Changes' : 'Save'),
              request: requestChangeSubscription
            })({
              click: requestChangeSubscriptionTether(
                snapshot((list, w3p) => {
                  const allowances = list.map(x => x.allowance)
                  const expiries = list.map(x => x.expiry)
                  const traders = list.map(a => a.trader)
                  const routeTypeKeys = list.map(x => x.routeTypeKey)
                  const subscribes = list.map(x => x.expiry > 0n)

                  return wagmiWriteContract({
                    ...PUPPET.CONTRACT[42161].Orchestrator,
                    functionName: 'batchSubscribe',
                    args: [w3p.account.address, allowances, expiries, traders, routeTypeKeys, subscribes]
                  })
                }, modifySubscriptionList)
              )
            }),
          )

        )
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
        }, modifySubscriptionList, modifySubscriber),
        snapshot((list, subsc) => {
          const idx = list.indexOf(subsc)

          if (idx === -1) {
            return list
          }

          list.splice(idx, 1)

          return list
        }, modifySubscriptionList, clickRemoveSubsc),
        constant([], clickClose)
      ])
      // changeSubscribeList: mergeArray([
      //   modifySubscribeList,
      //   constant([], clickClose)
      // ])
    }
  ]
})





