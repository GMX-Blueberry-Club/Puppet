
import { Behavior, combineObject } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { constant, map, mergeArray, multicast, snapshot } from "@most/core"
import { Stream } from "@most/types"
import { getMappedValue, parseFixed, readableTokenAmount, readableTokenAmountLabel, switchMap } from "common-utils"
import * as GMX from "gmx-middleware-const"
import { getTokenDescription } from "gmx-middleware-utils"
import * as PUPPET from "puppet-middleware-const"
import * as viem from "viem"
import { $TextField } from "../../common/$TextField.js"
import { writeContract } from "../../logic/common.js"
import { IWalletClient } from "../../wallet/walletLink.js"
import { $ButtonSecondary, $defaultMiniButtonSecondary } from "../form/$Button.js"
import { $SubmitBar } from "../form/$Form"
import { IComponentPageParams } from "../../pages/type.js"



interface IAssetWithdrawEditor extends IComponentPageParams {
  token: viem.Address
  balanceQuery: Stream<Promise<bigint>>
}

export const $AssetWithdrawEditor = (config: IAssetWithdrawEditor) => component((
  [requestDepositAsset, requestDepositAssetTether]: Behavior<IWalletClient, Promise<viem.TransactionReceipt>>,
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
            return writeContract(w3p, {
              ...PUPPET.CONTRACT[w3p.chain.id].Orchestrator,
              functionName: 'withdraw',
              args: [params.amount, config.token, w3p.account.address, false] as const
            })
          }, combineObject({ amount })),
          multicast
        )
      }),
    ),                  
    
    {
      requestDepositAsset: map(async tx => {
        const logs = viem.parseEventLogs({
          abi: PUPPET.CONTRACT[42161].Orchestrator.abi,
          logs: (await tx).logs
        })

        // @ts-ignore
        const newLocal = logs.find(x => x.eventName === 'Withdraw')!.args.amount
        return newLocal as bigint
      }, requestDepositAsset)
    }

  ]
})

