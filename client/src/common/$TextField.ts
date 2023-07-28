import { Behavior, O } from "@aelea/core"
import { $element, $text, attr, component, style, stylePseudo } from "@aelea/dom"
import { $Field, $row, Field, layoutSheet } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { empty } from "@most/core"
import { Stream } from "@most/types"


export interface TextField extends Field {
  label: string
  hint?: string | Stream<string>
  placeholder?: string
}


export const $label = $element('label')(
  style({ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', color: pallete.foreground })
)


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
  const { hint } = config

  const $field = overideInputStyle(
    $Field(config)({
      change: sampleValue()
    })
  )

  return [
    $label(layoutSheet.spacingTiny)(
      $row(layoutSheet.spacingTiny)(
        $text(style({ padding: '0 4px', alignSelf: 'flex-end', cursor: 'pointer', lineHeight: '36px', borderBottom: `2px solid ${colorAlpha(pallete.message, .1)}` }))(config.label),
        config.placeholder ? attr({ placeholder: config.placeholder }, $field): $field,
      ),
      $row(style({ position: 'relative' }))(
        hint ? $text(style({ fontSize: '.75rem', width: '100%' }))(hint) : empty()
      )
    ),

    { change }
  ]
})