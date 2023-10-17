import { Behavior, O, combineArray } from "@aelea/core"
import { $Branch, $element, $text, INode, attrBehavior, component, nodeEvent, style, styleBehavior, stylePseudo } from "@aelea/dom"
import { $column, $icon, $row, Control, layoutSheet } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { $alertIcon, $Tooltip } from "gmx-middleware-ui-components"
import { awaitPromises, constant, empty, map, mergeArray, multicast, never, now, recoverWith, skipRepeats, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { $ButtonCore, $defaultButtonCore, IButtonCore } from "./$ButtonCore.js"
import * as viem from "viem"
import { invertColor } from "gmx-middleware-utils"
import { $iconCircular } from "../../common/elements/$common.js"
import { $IntermediateConnectButton, $SwitchNetworkDropdown } from "../$ConnectAccount.js"
import { theme } from "../../assignThemeSync.js"



export const $defaultButtonPrimary = $defaultButtonCore(
  style({
    color: pallete.message, whiteSpace: 'nowrap', fill: 'white', borderRadius: '30px',
    boxShadow: `0px 0px 0px 0 #000 inset`,
    alignSelf: 'flex-end',
    padding: '15px 24px', fontWeight: 'bold', borderWidth: '0px', backgroundColor: pallete.primary,
  }),
  stylePseudo(':hover', { backgroundColor: colorAlpha(pallete.primary, .5) })
)

const secondaryButtonStyle = style({
  color: pallete.message, whiteSpace: 'nowrap', fill: 'white', borderRadius: '30px', borderStyle: 'solid', backgroundColor: pallete.background,
  alignSelf: 'flex-start',
  padding: '15px 24px', fontWeight: 'bold', borderWidth: '1px', borderColor: pallete.message
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


export interface IButtonPrimaryCtx extends IButtonCore {
  request: Stream<Promise<viem.TransactionReceipt>>
  alert?: Stream<string | null>
}

export const $ButtonPrimaryCtx = (config: IButtonPrimaryCtx) => component((
  [click, clickTether]: Behavior<PointerEvent, PointerEvent>
) => {


  const multicastRequest = multicast(config.request)
  const gradient = 'conic-gradient(from 180deg at 50% 70%, hsla(0,0%,98%,1) 0deg, #eec32d 72.0000010728836deg, #ec4b4b 144.0000021457672deg,#709ab9 216.00000858306885deg, #4dffbf 288.0000042915344deg, hsla(0,0%,98%,1) 1turn)'
  const bg = 'hsl(0 0% 0%)'



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
    }, multicastRequest))
  ]))

  const settledOrError = recoverWith(error => now(error.message), multicastRequest)

  return [
    $ButtonCore({
      $container: config.$container || $defaultButtonPrimary(
        style({ alignItems: 'center' }),
        style({
          // background: `linear-gradient(${bg}, ${bg}) padding-box, ${gradient} border-box;`,
          // border: `4px solid transparent`,
          padding: '14px 18px',
          animation: `borderRotate var(--d) linear infinite forwards`,
          borderImage: `conic-gradient(from var(--angle), ${colorAlpha(pallete.indeterminate, .25)}, ${pallete.indeterminate} 0.1turn, ${pallete.indeterminate} 0.15turn, ${colorAlpha(pallete.indeterminate, .25)} 0.25turn) 30`
        }),
        stylePseudo(':hover', { backgroundColor: pallete.foreground }),
      ),
      disabled: mergeArray([
        combineArray((isDisabled, isCtxPending) => {
          return isDisabled || isCtxPending
        }, config.disabled || now(false), duringRequest)
      ]),
      $content: config.$content
    })({
      click: clickTether()
    }),


    {
      click
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
