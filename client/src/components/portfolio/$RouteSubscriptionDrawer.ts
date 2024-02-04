import { Behavior, O, combineObject } from "@aelea/core"
import { $node, $text, component, nodeEvent, style } from "@aelea/dom"
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { awaitPromises, constant, empty, map, mergeArray, skipRepeats, snapshot } from "@most/core"
import { Stream } from "@most/types"
import { groupArrayMany, readableDate, readablePercentage, readableTokenAmountLabel, switchMap } from "common-utils"
import * as GMX from "gmx-middleware-const"
import { getTokenDescription } from "gmx-middleware-utils"
import { EIP6963ProviderDetail } from "mipd"
import { ISetRouteType } from "puppet-middleware-utils"
import { $check, $infoLabeledValue, $infoTooltip, $infoTooltipLabel, $intermediateMessage, $target, $xCross } from "ui-components"
import * as viem from "viem"
import * as walletLink from "wallet"
import { $profileDisplay } from "../$AccountProfile.js"
import { $Popover } from "../$Popover.js"
import { $route } from "../../common/$common.js"
import { $heading3 } from "../../common/$text.js"
import { $card2, $iconCircular, $responsiveFlex } from "../../common/elements/$common.js"
import { IBatchSubscribeReturnType, writeBatchSubscribe } from "../../logic/puppetWrite.js"
import { $seperator2 } from "../../pages/common.js"
import { IComponentPageParams } from "../../pages/type.js"
import { fadeIn } from "../../transitions/enter.js"
import { $ButtonCircular, $ButtonSecondary, $defaultMiniButtonSecondary } from "../form/$Button.js"
import { $SubmitBar } from "../form/$Form"
import { $AssetDepositEditor } from "./$AssetDepositEditor.js"
import { IChangeSubscription } from "./$RouteSubscriptionEditor"
import { readPuppetDepositAmount } from "../../logic/puppetRead.js"

interface IRouteSubscribeDrawer extends IComponentPageParams {
  modifySubscriber: Stream<IChangeSubscription>
  modifySubscriptionList: Stream<IChangeSubscription[]>
  routeTypeListQuery: Stream<Promise<ISetRouteType[]>>
}

export const $RouteSubscriptionDrawer = (config: IRouteSubscribeDrawer) => component((
  [requestChangeSubscription, requestChangeSubscriptionTether]: Behavior<walletLink.IWalletClient, IBatchSubscribeReturnType>,
  [clickClose, clickCloseTether]: Behavior<any>,
  [clickRemoveSubsc, clickRemoveSubscTether]: Behavior<any, IChangeSubscription >,
  [openDepositPopover, openDepositPopoverTether]: Behavior<any>,
  [requestDepositAsset, requestDepositAssetTether]: Behavior<Promise<bigint>>, // delta amount
  [changeWallet, changeWalletTether]: Behavior<EIP6963ProviderDetail>,
) => {

  const { modifySubscriber, modifySubscriptionList, providerClientQuery, routeTypeListQuery, walletClientQuery } = config

  const openIfEmpty = skipRepeats(map(l => l.length > 0, modifySubscriptionList))


  const initialDepositAmountQuery = map(async walletQuery => {
    const wallet = await walletQuery

    if (wallet === null) {
      return 0n
    }

    return readPuppetDepositAmount(wallet, wallet.account.address)
  }, walletClientQuery)

  const depositAmountQuery = mergeArray([
    initialDepositAmountQuery,  
    map(async params => {
      return await params.initialDepositAmountQuery + await params.requestDepositAsset
    }, combineObject({ initialDepositAmountQuery, requestDepositAsset }))
  ])



  const validationError = switchMap(async params => {
    if (await params.depositAmountQuery === 0n) {
      return 'You need to deposit funds to to enable mirroring'
    }

    return null
  }, combineObject({ depositAmountQuery }))

  const depositToken = GMX.ARBITRUM_ADDRESS.USDC
  const depositTokenDescription = getTokenDescription(depositToken)
  

  return [
    switchMap(isOpen => {
      if (!isOpen) {
        return empty()
      }

      return fadeIn($card2(style({ border: `1px solid ${colorAlpha(pallete.foreground, .20)}`, borderBottom: 'none', padding: '18px', borderRadius: '20px 20px 0 0' }))(
        $column(layoutSheet.spacing)(
          $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
            $heading3('Modify Portfolio'),
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
          }, combineObject({ modifySubscriptionList, routeTypeList: awaitPromises(routeTypeListQuery) })),


          $row(layoutSheet.spacingSmall, style({ placeContent: 'space-between' }))(
            $Popover({
              open: constant(
                $AssetDepositEditor({
                  providerClientQuery,
                  walletClientQuery,
                  token: depositToken
                })({
                  requestDepositAsset: requestDepositAssetTether(),
                }),
                openDepositPopover
              ),
              $target: $row(layoutSheet.spacing)(
                $responsiveFlex(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
                  $infoTooltipLabel($text('The amount utialised by traders you subscribe'), 'Balance'),
                  // $text(readableTokenAmountLabel(depositTokenDescription, amount))
                  $intermediateMessage(map(async amount => readableTokenAmountLabel(depositTokenDescription, await amount), depositAmountQuery)
                  ),
                  $ButtonSecondary({
                    $container: $defaultMiniButtonSecondary,
                    $content: $text('Deposit')
                  })({
                    click: openDepositPopoverTether()
                  }),
                )),
            })({}),
            
            $node(),
            $SubmitBar({
              walletClientQuery,
              $content: $text(screenUtils.isDesktopScreen ? 'Save Changes' : 'Save'),
              txQuery: requestChangeSubscription,
              alert: validationError
            })({
              changeWallet: changeWalletTether(),
              click: requestChangeSubscriptionTether(
                snapshot((list, w3p) => {
                  const tx = writeBatchSubscribe(w3p, list)
                  return tx
                }, modifySubscriptionList)
              )
            }),
          )
        )
      ))
      
    }, openIfEmpty),

    {
      changeWallet,
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
    }
  ]
})





