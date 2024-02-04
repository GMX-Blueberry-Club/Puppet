import { Behavior, O, combineArray, combineObject } from "@aelea/core"
import { $Branch, $element, $node, INode, attrBehavior, component, nodeEvent, style, styleBehavior, styleInline, stylePseudo } from "@aelea/dom"
import { $row, Control, layoutSheet } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { constant, empty, map, multicast, now, recoverWith, startWith } from "@most/core"
import { Stream } from "@most/types"
import { PromiseStatus, promiseState } from "common-utils"
import { EIP6963ProviderDetail } from "mipd"
import * as viem from "viem"
import * as walletLink from "wallet"
import { $IntermediateConnectButton, } from "../$ConnectWallet.js"
import { $iconCircular } from "../../common/elements/$common.js"
import { $ButtonCore, $defaultButtonCore, IButtonCore } from "./$ButtonCore.js"



export const $defaultButtonPrimary = $defaultButtonCore(
  style({
    color: pallete.message, whiteSpace: 'nowrap', fill: 'white', borderRadius: '30px', alignSelf: 'flex-end',
    padding: '15px 24px', fontWeight: 'bold', border: 'none', backgroundColor: pallete.primary,
  }),
  // stylePseudo(':hover', { backgroundColor: colorAlpha(pallete.primary, .5) })
)

const secondaryButtonStyle = style({
  color: pallete.message, whiteSpace: 'nowrap', fill: 'white', borderRadius: '30px', borderStyle: 'solid', backgroundColor: pallete.background,
  alignSelf: 'flex-start',
  padding: '15px 24px', fontWeight: 'bold', border: '1px solid', borderColor: pallete.message
})


export const $defaultButtonSecondary = $defaultButtonCore(
  secondaryButtonStyle,
  stylePseudo(':hover', { borderColor: pallete.foreground, borderWidth: '1px' })
)

export const defaultMiniButtonStyle = style({ alignSelf: 'center', borderWidth: '1px', padding: '6px 10px', fontSize: '.85rem' })
export const $defaultMiniButtonSecondary = $defaultButtonSecondary(defaultMiniButtonStyle)


export const $buttonAnchor = $element('a')(
  layoutSheet.spacingSmall,
  secondaryButtonStyle,
  stylePseudo(':hover', { color: 'inherit', boxShadow: 'none', borderColor: pallete.primary }),
  style({
    userSelect: 'none',
    alignItems: 'center',
    textDecoration: 'none',
    // padding: '6px 12px',
    display: 'flex',
    cursor: 'pointer',
    color: pallete.message
  }),
)


export const $ButtonPrimary = (config: IButtonCore) => {
  return $ButtonCore({
    $container: $defaultButtonPrimary,
    ...config
  })
}

export const $ButtonSecondary = (config: IButtonCore) => {
  return $ButtonCore({
    $container: $defaultButtonSecondary,
    ...config,
  })
}


export interface IButtonPrimaryCtx extends Omit<IButtonCore, '$container'> {
  walletClientQuery: Stream<Promise<walletLink.IWalletClient | null>>
  txQuery: Stream<Promise<any>>
  alert?: Stream<string | null>
}



export const $Submit = (config: IButtonPrimaryCtx) => component((
  [click, clickTether]: Behavior<PointerEvent, walletLink.IWalletClient>,
  [changeWallet, changeWalletTether]: Behavior<EIP6963ProviderDetail>,
) => {

  const { alert = now(null), $content, txQuery, disabled = now(false), walletClientQuery } = config

  const isTxPending = recoverWith(() => now(false), map(s => s.state === PromiseStatus.PENDING, promiseState(txQuery)))
  const isRequestPending = startWith(false, isTxPending)
  

  return [
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
          $content: $row(
            $node(
              style({
                inset: 0,
                width: '200%',
                visibility: 'hidden',
                animation: `borderRotate .75s linear infinite`,
                position: 'absolute',
                background: `linear-gradient(115deg, ${pallete.negative}, ${pallete.primary}, ${pallete.positive}, ${pallete.primary}) 0% 0% / 50% 100%`,
              }),
              styleInline(map(isDisabled => ({ visibility: isDisabled ? 'visible' : 'hidden' }), isRequestPending))
            )(),
            $node(
              style({
                inset: '2px',
                position: 'absolute',
                visibility: 'hidden',
                background: colorAlpha(pallete.background, .9),
                borderRadius: '30px',
              }),
              styleInline(map(isDisabled => ({ visibility: isDisabled ? 'visible' : 'hidden' }), isRequestPending))
            )(),
            style({ position: 'relative' })(
              config.$content
            )
          )
        })({
          click: clickTether(
            constant(wallet)
          )
        })
      })
    })({
      changeWallet: changeWalletTether()
    }),


    {
      click: multicast(click), changeWallet
    }
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
