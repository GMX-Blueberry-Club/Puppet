
import { Behavior, combineObject, replayLatest } from "@aelea/core"
import { $node, $text, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { constant, empty, fromPromise, join, map, mergeArray, multicast, now, snapshot, startWith } from "@most/core"
import { readContract } from "@wagmi/core"
import { erc20Abi } from "abitype/abis"
import * as GMX from "gmx-middleware-const"
import { getMappedValue, parseFixed, readableTokenAmount, readableTokenAmountLabel, switchMap } from "common-utils"
import * as PUPPET from "puppet-middleware-const"
import * as viem from "viem"
import { arbitrum } from "viem/chains"
import { $TextField } from "../../common/$TextField.js"
import { wagmiWriteContract } from "../../logic/common.js"
import { getWalletErc20Balance } from "../../logic/traderLogic.js"
import { $ButtonPrimaryCtx, $ButtonSecondary, $defaultMiniButtonSecondary } from "../form/$Button.js"
import { getTokenDescription } from "gmx-middleware-utils"
import { walletLink } from "../../wallet"
import * as wagmi from "@wagmi/core"


interface IAssetDepositEditor {
  token: viem.Address
}

export const $AssetDepositEditor = (config: IAssetDepositEditor) => component((
  [requestChangeSubscription, requestChangeSubscriptionTether]: Behavior<walletLink.IWalletClient, Promise<viem.TransactionReceipt>>,
  [requestDepositAsset, requestDepositAssetTether]: Behavior<walletLink.IWalletClient, Promise<viem.TransactionReceipt>>,
  [inputDepositAmount, inputDepositAmountTether]: Behavior<string>,
  [clickMaxDeposit, clickMaxDepositTether]: Behavior<any>,
) => {

  const address = map(w3p => w3p?.account.address || null, walletLink.wallet)
  const tokenDescription = getTokenDescription(config.token)

  const balance = switchMap(address => address ? getWalletErc20Balance(arbitrum, config.token, address) : now(0n), address)
  const indexToken = getMappedValue(GMX.TOKEN_ADDRESS_DESCRIPTION_MAP, config.token)
  const maxBalance = multicast(join(constant(map(amount => readableTokenAmount(tokenDescription, amount), balance), clickMaxDeposit)))
  const allowance = replayLatest(multicast(switchMap(walletAddress => {
    if (walletAddress == null) {
      return now(0n)
    }

    return fromPromise(readContract(walletLink.wagmiConfig, {
      address: config.token,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [walletAddress, PUPPET.CONTRACT[42161].Orchestrator.address]
    }))
  }, address)))



  return [

    $column(layoutSheet.spacing)(
      $text(style({ maxWidth: '310px' }))('The amount utialised by traders you subscribed'),

      $row(layoutSheet.spacingSmall, style({ position: 'relative' }))(
        $TextField({
          label: 'Amount',
          value: maxBalance,
          placeholder: 'Enter amount',
          hint: startWith('Balance: ', map(amount => `Balance: ${readableTokenAmountLabel(tokenDescription, amount)}`, balance)),
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
                const newLocal = wagmiWriteContract(walletLink.wagmiConfig, {
                  address: GMX.ARBITRUM_ADDRESS.USDC,
                  abi: erc20Abi,
                  functionName: 'approve',
                  args: [PUPPET.CONTRACT[42161].Orchestrator.address, 2n ** 256n - 1n]
                })
                return newLocal
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

                return wagmiWriteContract(walletLink.wagmiConfig, {
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

