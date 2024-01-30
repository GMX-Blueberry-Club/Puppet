
import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $text, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { empty, map, mergeArray, multicast, now, sample, skipRepeats, snapshot, startWith } from "@most/core"
import { getMappedValue, parseFixed, readableTokenAmount, readableTokenAmountLabel, switchMap } from "common-utils"
import * as GMX from "gmx-middleware-const"
import { getTokenDescription } from "gmx-middleware-utils"
import * as PUPPET from "puppet-middleware-const"
import * as viem from "viem"
import * as walletLink from "wallet"
import { $TextField } from "../../common/$TextField.js"
import { IApproveSpendReturnType, approveSpend } from "../../logic/commonLogic.js"
import { IDepositFundsReturnType, depositFunds } from "../../logic/puppetLogic"
import { getAddressTokenBalance, getTokenSpendAmount } from "../../logic/traderLogic.js"
import { IComponentPageParams } from "../../pages/type.js"
import { $ButtonSecondary, $Submit, $defaultMiniButtonSecondary } from "../form/$Button.js"
import { $SubmitBar } from "../form/$Form"


interface IAssetDepositEditor extends IComponentPageParams {
  token: viem.Address
}



export const $AssetDepositEditor = (config: IAssetDepositEditor) => component((
  [approveTokenSpend, approveTokenSpendTether]: Behavior<walletLink.IWalletClient, IApproveSpendReturnType>,
  [requestDepositAsset, requestDepositAssetTether]: Behavior<walletLink.IWalletClient, IDepositFundsReturnType>,
  [inputDepositAmount, inputDepositAmountTether]: Behavior<string>,
  [clickMaxDeposit, clickMaxDepositTether]: Behavior<any>,
) => {

  const { walletClientQuery } = config

  //   const tx = await 

  // const value = tx.events[0].args.value

  // if (typeof value !== 'bigint') {
  //   throw new Error('Invalid spend amount')
  // }


  const tokenDescription = getTokenDescription(config.token)
  const walletBalance = switchMap(async walletQuery => {
    const wallet = await walletQuery

    if (wallet == null) {
      return 0n
    }

    return getAddressTokenBalance(wallet, config.token, wallet.account.address)
  }, walletClientQuery)
  const indexToken = getMappedValue(GMX.TOKEN_ADDRESS_DESCRIPTION_MAP, config.token)
  
  const allowance = mergeArray([
    replayLatest(multicast(switchMap(async walletQuery => {
      const wallet = await walletQuery

      if (wallet == null) {
        return 0n
      }

      const puppetContractMap = getMappedValue(PUPPET.CONTRACT, wallet.chain.id)

      return getTokenSpendAmount(wallet, config.token, puppetContractMap.Orchestrator.address, wallet.account.address)
    }, config.walletClientQuery)))
  ])

  const maxBalance = sample(walletBalance, clickMaxDeposit)
  const amount = startWith(0n, mergeArray([
    maxBalance,
    map(str => parseFixed(str, indexToken.decimals), inputDepositAmount)
  ]))


  const isAllowanceRequired = skipRepeats(map(params => {
    return params.allowance ? params.allowance > params.amount : false
  }, combineObject({ allowance, amount })))



  return [

    $column(layoutSheet.spacing, style({ maxWidth: '310px' }))(
      $text('The amount utialised by traders you subscribed'),

      $row(layoutSheet.spacingSmall, style({ position: 'relative' }))(
        $TextField({
          label: 'Amount',
          value: map(val => readableTokenAmount(tokenDescription, val), maxBalance),
          placeholder: 'Enter amount',
          hint: map(amount => `Balance: ${readableTokenAmountLabel(tokenDescription, amount)}`, walletBalance),
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

      switchMap(allowed => {
        return $column(layoutSheet.spacing)(
          // $labeledDivider('2. Deposit USDC'),

          allowed ? empty() : $Submit({
            walletClientQuery,
            $content: $text('Approve USDC'),
            txQuery: approveTokenSpend
          })({
            click: approveTokenSpendTether(
              map(async w3p => {
                return approveSpend(w3p, GMX.ARBITRUM_ADDRESS.USDC)
              }),
              multicast
            )
          }),
          $SubmitBar({
            walletClientQuery,
            txQuery: requestDepositAsset,
            $content: $text('Deposit'),
            disabled: now(!allowed)
          })({
            click: requestDepositAssetTether(
              snapshot(async (params, w3p) => {
                return depositFunds(w3p, config.token, params.amount)
              }, combineObject({ amount })),
              multicast
            )
          })
        )
      }, isAllowanceRequired),
    ),                  
    
    {
      requestDepositAsset: map(async tx => (await tx).events[0].args.amount, requestDepositAsset)
    }

  ]
})

