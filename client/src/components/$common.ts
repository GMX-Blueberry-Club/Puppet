import { Behavior, combineObject } from "@aelea/core"
import { $Node, $node, $text, NodeComposeFn, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { IAttributeBackground, IAttributeBadge, IAttributeMappings, IBerryDisplayTupleMap, IToken, getBerryFromItems, getLabItemTupleIndex, tokenIdAttributeTuple } from "@gambitdao/gbc-middleware"
import { constant, join, map, mergeArray, multicast, snapshot, startWith } from "@most/core"
import * as GMX from "gmx-middleware-const"
import { $Table, $alertTooltip, $defaultVScrollContainer, $infoLabeledValue, $infoTooltipLabel, $spinner, TableOption } from "gmx-middleware-ui-components"
import { getMappedValue, parseFixed, switchMap, tokenAmount, tokenAmountLabel } from "gmx-middleware-utils"
import * as PUPPET from "puppet-middleware-const"
import { IPuppetRouteSubscritpion, IRouteDescription } from "puppet-middleware-utils"
import * as viem from "viem"
import { $TextField } from "../common/$TextField"
import { $route } from "../common/$common"
import { $card } from "../elements/$common"
import { connectContract, wagmiWriteContract } from "../logic/common"
import { IWalletClient, nativeBalance } from "../wallet/walletLink"
import { $berry } from "./$DisplayBerry"
import { $Popover } from "./$Popover"
import { $ButtonPrimaryCtx, $ButtonSecondary, $defaultMiniButtonSecondary } from "./form/$Button"


export const $CardTable = <T, FilterState>(config: TableOption<T, FilterState>) => {
  return $Table({
    $container: $card(style({ padding: "12px", gap: 0, borderRadius: '0' })),
    scrollConfig: {
      $container: $defaultVScrollContainer(style({ gap: '4px' })),
      $loader: style({ placeContent: 'center', margin: '0 1px', background: pallete.background, flexDirection: 'row-reverse', padding: '16px 0' })(
        $infoLabeledValue(
          'Loading',
          style({ margin: '' })(
            $spinner
          )
        )
      )
    },
    // $bodyRowContainer: $defaultTableRowContainer(
    //   style({ margin: '0 1px' })
    // ),
    ...config
  })
}



export const $berryByToken = (token: IToken, $container?: NodeComposeFn<$Node>) => {
  const display = getBerryFromItems(token.labItems.map(li => Number(li.id)))
  const tuple: Partial<IBerryDisplayTupleMap> = [...tokenIdAttributeTuple[token.id - 1]]

  return $berryByLabItems(token.id, display.background, display.custom, display.badge, $container, tuple)
}

export const $berryByLabItems = (
  berryId: number,
  backgroundId: IAttributeBackground,
  labItemId: IAttributeMappings,
  badgeId: IAttributeBadge,
  $container?: NodeComposeFn<$Node>,
  tuple: Partial<IBerryDisplayTupleMap> = [...tokenIdAttributeTuple[berryId - 1]]
) => {

  if (labItemId) {
    const customIdx = getLabItemTupleIndex(labItemId)

    tuple.splice(customIdx, 1, labItemId as any)
  }

  if (badgeId) {
    tuple.splice(6, 1, badgeId)
  }

  if (backgroundId) {
    tuple.splice(0, 1, backgroundId)
  }

  return $berry(tuple, $container)
}


export interface IRouteDepositInfoConfig {
  routeDescription: IRouteDescription
  wallet: IWalletClient
}

export const $RouteDepositInfo = (config: IRouteDepositInfoConfig) => component((
  [requestChangeSubscription, requestChangeSubscriptionTether]: Behavior<PointerEvent, Promise<viem.TransactionReceipt>>,
  [requestDepositAsset, requestDepositAssetTether]: Behavior<PointerEvent, Promise<viem.TransactionReceipt>>,
  [changeSubscribeList, changeSubscribeListTether]: Behavior<IPuppetRouteSubscritpion[]>,
  [inputDepositAmount, inputDepositAmountTether]: Behavior<string>,

  [openDepositPopover, openDepositPopoverTether]: Behavior<any>,
  [clickMaxDeposit, clickMaxDepositTether]: Behavior<any>,

) => {

  const orchestrator = connectContract(PUPPET.CONTRACT[42161].Orchestrator)
  const indexToken = getMappedValue(GMX.TOKEN_ADDRESS_DESCRIPTION, config.routeDescription.indexToken)


  return [
    $row(layoutSheet.spacingSmall)(
      $route(config.routeDescription),

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

            const maxBalance = multicast(join(constant(map(amount => tokenAmount(config.routeDescription.indexToken, amount), nativeBalance), clickMaxDeposit)))
            return $column(layoutSheet.spacing)(

              $text(style({ maxWidth: '310px' }))('The amount utialised by traders you subscribed'),

              $row(layoutSheet.spacingSmall, style({ position: 'relative' }))(
                $TextField({
                  label: 'Amount',
                  value: maxBalance,
                  placeholder: 'Enter amount',
                  hint: startWith('Balance: ', map(amount => `Balance: ${tokenAmountLabel(config.routeDescription.indexToken, amount)}`, nativeBalance)),
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
                      args: [parsedFormatAmount, config.routeDescription.indexToken, config.wallet.account.address] as const
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
            return $text(tokenAmountLabel(config.routeDescription.indexToken, amount))
          }, orchestrator.read('puppetAccountBalance', config.wallet.account.address, config.routeDescription.indexToken))
        )
      )
                      
    )

  ]
})

