import { Behavior, O, combineArray, combineObject } from "@aelea/core"
import { $Branch, $Node, $text, INode, attrBehavior, component, nodeEvent, style, styleBehavior } from "@aelea/dom"
import { $row, Control, layoutSheet } from "@aelea/ui-components"
import { constant, empty, map, mergeArray, multicast, now, startWith, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { PromiseStateError, PromiseStatus, promiseState } from "common-utils"
import { EIP6963ProviderDetail } from "mipd"
import { $alertPositiveTooltip, $alertTooltip, $intermediateTooltip, $txHashRef } from "ui-components"
import * as viem from "viem"
import * as walletLink from "wallet"
import { $IntermediateConnectButton } from "../$ConnectWallet"
import { $iconCircular } from "../../common/elements/$common.js"
import { IWriteContractReturnQuery } from "../../logic/commonLogic"
import { $defaultButtonPrimary } from "./$Button"
import { $ButtonCore } from "./$ButtonCore"


export interface IForm {
  walletClientQuery: Stream<Promise<walletLink.IWalletClient | null>>
  txQuery: Stream<IWriteContractReturnQuery>
  alert?: Stream<string | null>
  $content: $Node
  $barContent?: $Node
  disabled?: Stream<boolean>
}

export const $SubmitBar = (config: IForm) => component((
  [click, clickTether]: Behavior<PointerEvent, walletLink.IWalletClient>,
  [changeWallet, changeWalletTether]: Behavior<EIP6963ProviderDetail>,
) => {
  const { $barContent, disabled = now(false), alert = now(null), txQuery, $content, walletClientQuery } = config

  const multicastTxQuery = multicast(promiseState(txQuery))
  const requestStatus = mergeArray([
    multicastTxQuery,
    map(a => a ? { state: PromiseStatus.ERROR, error: new Error(a) } as PromiseStateError: null, alert)
  ])
  const isRequestPending = startWith(false, map(s => s.state === PromiseStatus.PENDING, multicastTxQuery))

  return [
    $row(layoutSheet.spacingSmall, style({ minWidth: 0, alignItems: 'center', placeContent: 'flex-end' }))(
      switchLatest(map(status => {
        if (status === null) {
          return empty()
        }

        if (status.state === PromiseStatus.PENDING) {
          return $intermediateTooltip($text('Awaiting confirmation'))
        } else if (status.state === PromiseStatus.ERROR) {
          const err = status.error
          let message: string | undefined

          if (err instanceof viem.TransactionExecutionError) {
            message = err.shortMessage || err.message
          }

          if (err instanceof viem.ContractFunctionExecutionError && err.cause instanceof viem.ContractFunctionRevertedError) {
            message = err.cause.reason || err.shortMessage || err.message
          }

          return $alertTooltip(
            $text(style({ whiteSpace: 'pre-wrap' }))(message || err.message || 'Transaction failed')
          )
        }

        return $alertPositiveTooltip(
          $row(layoutSheet.spacingSmall)(
            $text('Transaction confirmed'),
            $txHashRef(status.value.transactionReceipt.transactionHash)
          )
        )
      }, requestStatus)),
      $barContent ?? empty(),
      $IntermediateConnectButton({
        walletClientQuery,
        $$display: map(wallet => {
          return $ButtonCore({
            $container: $defaultButtonPrimary(style({
              position: 'relative',
              overflow: 'hidden',
            })),
            disabled: combineArray(params => {
              return params.alert !== null || params.disabled || params.isRequestPending
            }, combineObject({ disabled, isRequestPending, alert })),
            $content: $row(style({ position: 'relative' })(config.$content))
          })({
            click: clickTether(
              constant(wallet)
            )
          })
        })
      })({
        changeWallet: changeWalletTether()
      })
    ),

    { click, changeWallet }
  ]
})


interface IButtonCircular extends Control {
  $iconPath: $Branch<SVGPathElement>
}

export const $ButtonCircular = ({ $iconPath, disabled = empty() }: IButtonCircular) => component((
  [click, clickTether]: Behavior<INode, PointerEvent>
) => {


  const ops = O(
    clickTether(
      nodeEvent('pointerup')
    ),
    styleBehavior(
      map(isDisabled => isDisabled ? { opacity: .4, pointerEvents: 'none' } : null, disabled)
    ),
    attrBehavior(
      map(d => {
        return { disabled: d ? 'true' : null }
      }, disabled)
    ),
  )


  return [
    ops(
      $row(style({ cursor: 'pointer', padding: '6px', margin: '-6px' }))(
        $iconCircular($iconPath)
      )
    ),

    {
      click
    }
  ]
})
