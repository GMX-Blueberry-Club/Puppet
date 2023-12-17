
import { Behavior, combineObject } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { constant, map, mergeArray, multicast, now, snapshot } from "@most/core"
import * as GMX from "gmx-middleware-const"
import { getMappedValue, parseFixed, readableTokenAmount, readableTokenAmountLabel, readableUnitAmount } from "gmx-middleware-utils"
import * as PUPPET from "puppet-middleware-const"
import * as viem from "viem"
import { $TextField } from "../../common/$TextField.js"
import { wagmiWriteContract } from "../../logic/common.js"
import { IWalletClient } from "../../wallet/walletLink.js"
import { $ButtonPrimaryCtx, $ButtonSecondary, $defaultMiniButtonSecondary } from "../form/$Button.js"



interface IAssetWithdrawEditor {
  token: viem.Address
  balance: bigint
}

export const $AssetWithdrawEditor = (config: IAssetWithdrawEditor) => component((
  [requestDepositAsset, requestDepositAssetTether]: Behavior<IWalletClient, Promise<viem.TransactionReceipt>>,
  [inputDepositAmount, inputDepositAmountTether]: Behavior<string, bigint>,
  [clickMaxDeposit, clickMaxDepositTether]: Behavior<any>,
) => {

  const indexToken = getMappedValue(GMX.TOKEN_ADDRESS_DESCRIPTION_MAP, config.token)
  const amount = mergeArray([clickMaxDeposit, inputDepositAmount])

  return [

    $column(layoutSheet.spacing)(

      $text(style({ maxWidth: '310px' }))('Remove available funds from your portfolio'),

      $row(layoutSheet.spacingSmall, style({ position: 'relative' }))(
        $TextField({
          label: 'Amount',
          value: map(n => readableTokenAmount(config.token, n), amount),
          placeholder: 'Enter amount',
          hint: `Balance: ${readableTokenAmountLabel(config.token, config.balance)}`,
        })({
          change: inputDepositAmountTether(map(str => parseFixed(str, indexToken.decimals)))
        }),

        $ButtonSecondary({
          $container: $defaultMiniButtonSecondary(style({ position: 'absolute', right: 0, bottom: '28px' })),
          $content: $text('Max'),
        })({
          click: clickMaxDepositTether(constant(config.balance))
        })
      ),
      
      $row(style({ placeContent: 'space-between' }))(
        $node(),
        $ButtonPrimaryCtx({
          $content: $text('Withdraw'),
          request: requestDepositAsset,
          disabled: now(config.balance === 0n)
        })({
          click: requestDepositAssetTether(
            snapshot((params, w3p) => {

              return wagmiWriteContract({
                ...PUPPET.CONTRACT[42161].Orchestrator,
                functionName: 'withdraw',
                args: [params.amount, config.token, w3p.account.address, false] as const
              })
            }, combineObject({ amount })),
            multicast
          )
        })
      ),
    ),                  
    
    {
      requestDepositAsset
    }

  ]
})

