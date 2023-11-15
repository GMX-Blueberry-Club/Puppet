import { Behavior, O } from "@aelea/core"
import { $element, $text, NodeComposeFn, attr, component, style, stylePseudo } from "@aelea/dom"
import { $row, layoutSheet } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { empty } from "@most/core"
import { Stream } from "@most/types"
import { $Field, Field } from "gmx-middleware-ui-components"


export interface TextField extends Field {
  label: string
  hint?: string | Stream<string>
  placeholder?: string

  $label?: NodeComposeFn<any, HTMLLabelElement>
  labelWidth?: number
}


export const $label2 = $element('label')(
  layoutSheet.spacingSmall,
  style({ 
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    color: pallete.foreground
  })
)


export const $labelDisplay = $text(style({ paddingRight: '4px', alignSelf: 'flex-end', cursor: 'pointer', lineHeight: '36px', borderBottom: `2px solid ${colorAlpha(pallete.message, .1)}` }))


const overideInputStyle = O(
  style({
    backgroundColor: pallete.background,
    color: pallete.message,
    lineHeight: '36px',
    height: '36px',
    padding: '0 8px',
  }),
  stylePseudo('::placeholder', {
    color: colorAlpha(pallete.foreground, .8),
  })
)


export const $TextField = (config: TextField) => component((
  [change, sampleValue]: Behavior<string, string>
) => {

  const {
    label, placeholder, hint, labelWidth,
    $label = $label2
  } = config

  const $field = overideInputStyle(
    $Field(config)({
      change: sampleValue()
    })
  )

  return [
    $label(
      $row(layoutSheet.spacingTiny, style({ width: '100%' }))(
        $labelDisplay(style({ width: labelWidth ? labelWidth + 'px' : '' }))(label),
        placeholder ? attr({ placeholder: placeholder }, $field): $field,
      ),
      $row(style({ position: 'relative' }))(
        hint ? $text(style({ fontSize: '.85rem', width: '100%' }))(hint) : empty()
      )
    ),

    { change }
  ]
})