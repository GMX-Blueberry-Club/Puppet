
import { Behavior, combineObject } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { constant, map, mergeArray, multicast, snapshot } from "@most/core"
import { Stream } from "@most/types"
import { getMappedValue, parseFixed, readableTokenAmount, readableTokenAmountLabel, switchMap } from "common-utils"
import * as GMX from "gmx-middleware-const"
import { getTokenDescription } from "gmx-middleware-utils"
import * as viem from "viem"
import * as walletLink from "wallet"
import { $TextField } from "../../common/$TextField.js"
import { IWithdrawFundsReturnType, withdrawFunds } from "../../logic/puppetLogic"
import { IComponentPageParams } from "../../pages/type.js"
import { $ButtonSecondary, $defaultMiniButtonSecondary } from "../form/$Button.js"
import { $SubmitBar } from "../form/$Form"



interface IAssetWithdrawEditor extends IComponentPageParams {
  token: viem.Address
  balanceQuery: Stream<Promise<bigint>>
}

export const $AssetWithdrawEditor = (config: IAssetWithdrawEditor) => component((
  [requestDepositAsset, requestDepositAssetTether]: Behavior<walletLink.IWalletClient, IWithdrawFundsReturnType>,
  [inputDepositAmount, inputDepositAmountTether]: Behavior<string, bigint>,
  [clickMaxDeposit, clickMaxDepositTether]: Behavior<any>,
) => {

  const { balanceQuery, token, walletClientQuery } = config

  const indexToken = getMappedValue(GMX.TOKEN_ADDRESS_DESCRIPTION_MAP, config.token)
  const amount = mergeArray([clickMaxDeposit, inputDepositAmount])
  const tokenDescription = getTokenDescription(config.token)

  return [

    $column(layoutSheet.spacing)(

      $text(style({ maxWidth: '310px' }))('Remove available funds from your portfolio'),

      $row(layoutSheet.spacingSmall, style({ position: 'relative' }))(
        $TextField({
          label: 'Amount',
          value: map(n => readableTokenAmount(tokenDescription, n), amount),
          placeholder: 'Enter amount',
          hint: switchMap(async balance => `Balance: ${readableTokenAmountLabel(tokenDescription, await balance)}`, balanceQuery),
        })({
          change: inputDepositAmountTether(map(str => parseFixed(str, indexToken.decimals)))
        }),

        $ButtonSecondary({
          $container: $defaultMiniButtonSecondary(style({ position: 'absolute', right: 0, bottom: '28px' })),
          $content: $text('Max'),
        })({
          click: clickMaxDepositTether(constant(config.balanceQuery))
        })
      ),
      
      $SubmitBar({
        walletClientQuery,
        $content: $text('Withdraw'),
        disabled: map(val => val === 0n, amount),
        txQuery: requestDepositAsset
      })({
        click: requestDepositAssetTether(
          snapshot((params, w3p) => {
            return withdrawFunds(w3p, token, params.amount)
          }, combineObject({ amount })),
          multicast
        )
      }),
    ),                  
    
    {
      requestWithdrawAsset: map(async tx => {
        return (await tx).events[0].args.amountOut
      }, requestDepositAsset)
    }

  ]
})

