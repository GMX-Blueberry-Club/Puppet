import { Behavior, O } from '@aelea/core'
import { $element, $node, $text, IBranch, attr, attrBehavior, component, nodeEvent, style, styleBehavior } from '@aelea/dom'
import { Input, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { empty, map, mergeArray, startWith } from "@most/core"
import { dismissOp, interactionOp } from "./common.js"
import { Stream } from '@most/types'
import { $label } from '../$common.js'


export interface Checkbox extends Input<boolean> {
  label?: string | Stream<string>
}

export const $Checkbox = ({ value, disabled, label }: Checkbox) => component((
  [focusStyle, interactionTether]: Behavior<IBranch, true>,
  [dismissstyle, dismissTether]: Behavior<IBranch, false>,
  [check, checkTether]: Behavior<IBranch<HTMLInputElement>, boolean>
) => {

  const $overlay = $node(
    layoutSheet.stretch,
    style({ flex: 1, margin: '3px', }),
    styleBehavior(
      map(ch => ch ? { backgroundColor: pallete.message } : null, value)
    ),
  ) 

  const $checkInput = $element('input')(
    style({ opacity: 0, width: 'inherit', height: 'inherit', margin: '0', cursor: 'pointer', }),
    layoutSheet.stretch,
    checkTether(
      nodeEvent('change'),
      map(evt => (<HTMLInputElement>evt.target).checked),
    ),
    attr({ type: 'checkbox' }),
    attrBehavior(
      map(checked => ({ checked: checked ? true : null }), value)
    ),
    interactionTether(interactionOp),
    dismissTether(dismissOp),
  )


  return [
    $label(
      disabled
        ? styleBehavior(
          map(isDisabled => {
            return isDisabled ? { opacity: .4, pointerEvents: 'none' } : null
          }, startWith(true, disabled))
        ) : O(),
    )(
      $node(
        styleBehavior(
          map(
            active => active ? { borderColor: pallete.primary } : null,
            mergeArray([focusStyle, dismissstyle])
          )
        ),
        style({ position: 'relative', width: '18px', height: '18px', border: `2px solid ${pallete.message}` }),
      )(
        $overlay(),
        $checkInput(),
      ),

      label ? $text(label) : empty(),
    ),
    { check }
  ]
})
