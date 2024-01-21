import { Behavior, O, combineArray } from "@aelea/core"
import { $Branch, $element, $node, INode, attrBehavior, component, nodeEvent, style, styleBehavior, styleInline, stylePseudo } from "@aelea/dom"
import { $row, Control, layoutSheet } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { awaitPromises, constant, empty, map, mergeArray, multicast, now } from "@most/core"
import { Stream } from "@most/types"
import * as viem from "viem"
import { $IntermediateConnectButton, } from "../$ConnectAccount.js"
import { $iconCircular } from "../../common/elements/$common.js"
import { IWalletClient } from "../../wallet/walletLink"
import { $ButtonCore, $defaultButtonCore, IButtonCore } from "./$ButtonCore.js"



export const $defaultButtonPrimary = $defaultButtonCore(
  style({
    color: pallete.message, whiteSpace: 'nowrap', fill: 'white', borderRadius: '30px',
    // boxShadow: `0px 0px 0 2px ${pallete.primary} inset`,
    alignSelf: 'flex-end',
    padding: '15px 24px', fontWeight: 'bold', border: 'none', backgroundColor: pallete.primary,
  }),
  // stylePseudo(':hover', { backgroundColor: colorAlpha(pallete.primary, .5) })
)

const secondaryButtonStyle = style({
  color: pallete.message, whiteSpace: 'nowrap', fill: 'white', borderRadius: '30px', borderStyle: 'solid', backgroundColor: pallete.background,
  alignSelf: 'flex-start',
  padding: '15px 24px', fontWeight: 'bold', border: 'none', borderColor: pallete.message
})


export const $defaultButtonSecondary = $defaultButtonCore(
  secondaryButtonStyle,
  stylePseudo(':hover', { borderColor: pallete.foreground }),
  style({ fontSize: '.85em' })
)

export const defaultMiniButtonStyle = style({ alignSelf: 'center', padding: '6px 10px', fontSize: '.85rem' })
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
  request: Stream<Promise<viem.TransactionReceipt>>
}



export const $ButtonPrimaryCtx = (config: IButtonPrimaryCtx) => component((
  [click, clickTether]: Behavior<PointerEvent, IWalletClient>
) => {

  const duringRequest = multicast(mergeArray([
    now(false),
    constant(true, click),
    awaitPromises(map(async req => {
      try {
        await req
        return false
      } catch (err) {
        console.warn(err)
        return false
      }
    }, config.request))
  ]))

  const disabled = combineArray((isDisabled, isCtxPending) => {
    return isDisabled || isCtxPending
  }, config.disabled || now(false), duringRequest)

  return [
    $IntermediateConnectButton({
      $$display: map(wallet => {
        return $ButtonCore({
          $container: $defaultButtonPrimary(style({
            position: 'relative',
            overflow: 'hidden',
          })),
          disabled: disabled,
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
              styleInline(map(isDisabled => ({ visibility: isDisabled ? 'visible' : 'hidden' }), duringRequest))
            )(),
            $node(
              style({
                inset: '2px',
                position: 'absolute',
                visibility: 'hidden',
                background: colorAlpha(pallete.background, .9),
                borderRadius: '30px',
              }),
              styleInline(map(isDisabled => ({ visibility: isDisabled ? 'visible' : 'hidden' }), duringRequest))
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
    })({}),


    {
      click: multicast(click)
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
