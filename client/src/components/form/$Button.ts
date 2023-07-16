import { Behavior, combineArray } from "@aelea/core"
import { $element, $text, component, style, stylePseudo } from "@aelea/dom"
import { $column, $icon, $row, layoutSheet } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { $alertIcon, $Tooltip } from "gmx-middleware-ui-components"
import { awaitPromises, constant, map, mergeArray, never, now, recoverWith, skipRepeats, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { $ButtonCore, $defaultButtonCore, IButtonCore } from "./$ButtonCore"
import * as viem from "viem"



export const $defaultButtonPrimary = $defaultButtonCore(
  style({
    color: pallete.message, whiteSpace: 'nowrap', fill: 'white', borderRadius: '30px',
    boxShadow: `0px 0px 0px 0 ${pallete.primary} inset`,
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
  stylePseudo(':hover', { borderColor: pallete.middleground }),
  style({ fontSize: '.85em' })
)

export const $defaultMiniButtonSecondary = $defaultButtonSecondary(
  style({ alignSelf: 'center', padding: '6px 10px', fontSize: '.75rem' })
)


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


  const duringRequest = mergeArray([
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
  ])

  return [
    $ButtonCore({
      $container: config.$container || $defaultButtonPrimary(
        style({ alignItems: 'center' }),
        stylePseudo(':hover', { backgroundColor: pallete.middleground })
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
