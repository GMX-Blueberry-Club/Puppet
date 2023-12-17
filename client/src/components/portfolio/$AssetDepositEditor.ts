
import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { constant, empty, fromPromise, join, map, mergeArray, multicast, now, snapshot, startWith } from "@most/core"
import { readContract } from "@wagmi/core"
import { erc20Abi } from "abitype/abis"
import * as GMX from "gmx-middleware-const"
import { getMappedValue, parseFixed, readableTokenAmount, readableTokenAmountLabel, switchMap } from "gmx-middleware-utils"
import * as PUPPET from "puppet-middleware-const"
import * as viem from "viem"
import { arbitrum } from "viem/chains"
import { $TextField } from "../../common/$TextField.js"
import { wagmiWriteContract } from "../../logic/common.js"
import { getWalletErc20Balance } from "../../logic/trade.js"
import { IWalletClient, wallet } from "../../wallet/walletLink.js"
import { $ButtonPrimaryCtx, $ButtonSecondary, $defaultMiniButtonSecondary } from "../form/$Button.js"



interface IAssetDepositEditor {
  token: viem.Address
}

export const $AssetDepositEditor = (config: IAssetDepositEditor) => component((
  [requestChangeSubscription, requestChangeSubscriptionTether]: Behavior<IWalletClient, Promise<viem.TransactionReceipt>>,
  [requestDepositAsset, requestDepositAssetTether]: Behavior<IWalletClient, Promise<viem.TransactionReceipt>>,
  [inputDepositAmount, inputDepositAmountTether]: Behavior<string>,
  [clickMaxDeposit, clickMaxDepositTether]: Behavior<any>,
) => {

  const account = map(w3p => w3p?.account.address || null, wallet)

  const balance = switchMap(address => address ? getWalletErc20Balance(arbitrum, config.token, address) : now(0n), account)
  const indexToken = getMappedValue(GMX.TOKEN_ADDRESS_DESCRIPTION_MAP, config.token)
  const maxBalance = multicast(join(constant(map(amount => readableTokenAmount(config.token, amount), balance), clickMaxDeposit)))
  const allowance = replayLatest(multicast(switchMap(address => {
    if (address == null) {
      return now(0n)
    }

    return fromPromise(readContract({
      address: config.token,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [address, PUPPET.CONTRACT[42161].Orchestrator.address]
    }))
  }, account)))



  return [

    $column(layoutSheet.spacing)(

      $text(style({ maxWidth: '310px' }))('The amount utialised by traders you subscribed'),

      $row(layoutSheet.spacingSmall, style({ position: 'relative' }))(
        $TextField({
          label: 'Amount',
          value: maxBalance,
          placeholder: 'Enter amount',
          hint: startWith('Balance: ', map(amount => `Balance: ${readableTokenAmountLabel(config.token, amount)}`, balance)),
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
      
      switchMap(allow => {
        const amount = startWith('0', mergeArray([maxBalance, inputDepositAmount]))

        return $row(style({ placeContent: 'space-between' }))(
          $node(),
          allow === 0n ? $ButtonPrimaryCtx({
            $content: $text('Approve USDC'),
            request: requestChangeSubscription
          })({
            click: requestChangeSubscriptionTether(
              map(w3p => {
                return wagmiWriteContract({
                  address: GMX.ARBITRUM_ADDRESS.USDC,
                  abi: erc20Abi,
                  functionName: 'approve',
                  args: [PUPPET.CONTRACT[42161].Orchestrator.address, 2n ** 256n - 1n]
                })
              }),
              multicast
            )
          }) : empty(),
          $ButtonPrimaryCtx({
            $content: $text('Deposit'),
            request: requestDepositAsset,
            disabled: map(params => {
              if (!Number(params.amount) || allow === 0n) return true

              return false
            }, combineObject({ amount }))
          })({
            click: requestDepositAssetTether(
              snapshot((params, w3p) => {
                const parsedFormatAmount = parseFixed(params.amount, indexToken.decimals)

                return wagmiWriteContract({
                  ...PUPPET.CONTRACT[42161].Orchestrator,
                  functionName: 'deposit',
                  // value: 0n,
                  args: [parsedFormatAmount, config.token, w3p.account.address] as const
                })
              }, combineObject({ amount })),
              multicast
            )
          })
        )
      }, allowance),
    ),                  
    
    {
      requestDepositAsset
    }

  ]
})

