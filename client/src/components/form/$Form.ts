import { Behavior, O } from "@aelea/core"
import { $Branch, $node, $text, INode, attrBehavior, component, nodeEvent, style, styleBehavior } from "@aelea/dom"
import { $row, Control, layoutSheet } from "@aelea/ui-components"
import { awaitPromises, empty, map, mergeArray, multicast, never, switchLatest, tap } from "@most/core"
import { Stream } from "@most/types"
import { $alertTooltip } from "ui-components"
import * as viem from "viem"
import { $iconCircular } from "../../common/elements/$common.js"
import { IWalletClient } from "../../wallet/walletLink"
import { $Submit, IButtonPrimaryCtx } from "./$Button"
import { EIP6963ProviderDetail } from "mipd"




export interface IForm extends IButtonPrimaryCtx  {
  alert?: Stream<string | null>
}



export const $SubmitBar = (config: IForm) => component((
  [click, clickTether]: Behavior<IWalletClient>,
  [changeWallet, changeWalletTether]: Behavior<EIP6963ProviderDetail>,
) => {
  const { alert = empty(), txQuery } = config
  const multicastRequest = multicast(txQuery)

  const transactionError = awaitPromises(map(async query => {
    try {
      await query
      return null
    } catch (err) {

      if (err instanceof viem.ContractFunctionExecutionError && err.cause instanceof viem.ContractFunctionRevertedError) {
        return String(err.cause.reason || err.shortMessage || err.message)
      }

      return null
    }
  }, multicastRequest))

  const alertMessage: Stream<string | null> = mergeArray([alert, transactionError])

  return [
    $row(layoutSheet.spacingSmall, style({ placeContent: 'space-between', minWidth: 0 }))(
      switchLatest(map(error => {
        if (error === null) {
          return empty()
        }

        return $alertTooltip(
          $text(style({ whiteSpace: 'pre-wrap' }))(error)
        )
      }, alertMessage)),
      $node(),
      $Submit({
        ...config,
        txQuery: multicastRequest
      })({
        changeWallet: changeWalletTether(),
        click: clickTether()
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
