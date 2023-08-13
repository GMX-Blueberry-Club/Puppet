import { $element, component, nodeEvent, IBranch, style, styleBehavior, StyleCSS, NodeComposeFn, $Node } from '@aelea/dom'
import { O, Op, combineObject, Behavior } from '@aelea/core'
import { pallete } from '@aelea/ui-components-theme'
import { multicast, never, now, startWith, tap } from '@most/core'
import { filter } from '@most/core'
import { merge } from '@most/core'
import { empty, map, switchLatest } from "@most/core"
import { Input, InputType, designSheet } from '@aelea/ui-components'
import { dismissOp, interactionOp } from './form.js'

export interface Field extends Input<string | number> {
  $input?: NodeComposeFn<any, HTMLInputElement>
}

export const $Field = ({ value = empty(), validation = never, $input = $element('input') }: Field) => component((
  [focusStyle, interactionTether]: Behavior<IBranch, true>,
  [dismissstyle, dismissTether]: Behavior<IBranch, false>,
  [blur, blurTether]: Behavior<IBranch, FocusEvent>,
  [change, changeTether]: Behavior<IBranch<HTMLInputElement>, string>
) => {

  const multicastValidation = O(validation, startWith(''), multicast)

  const alert = multicastValidation(change)

  const focus = merge(focusStyle, dismissstyle)
  const state = combineObject({ focus, alert })

  return [
    $input(
      designSheet.input,

      changeTether(
        nodeEvent('input'),
        map(inputEv => {
          if (inputEv.target instanceof HTMLInputElement) {
            const text = inputEv.target.value
            return text || ''
          }
          return ''
        })
      ),

      styleBehavior(
        map(({ focus, alert }) => {
          if (alert) {
            return { borderBottom: `2px solid ${pallete.negative}` }
          }

          return focus ? { borderBottom: `2px solid ${pallete.primary}` } : null
        }, state)
      ),

      interactionTether(interactionOp),
      dismissTether(dismissOp),

      blurTether(nodeEvent('blur')),

      O(
        map(node =>
          merge(
            now(node),
            filter(() => false, tap(val => {
              // applying by setting `HTMLInputElement.value` imperatively(only way known to me)
              node.element.value = String(val)
            }, value))
          )
        ),
        switchLatest
      )

    )(),

    {
      change,
      blur
    }
  ]
})