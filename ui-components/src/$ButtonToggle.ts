import { Behavior, Op } from "@aelea/core"
import { $Node, $text, component, INode, NodeComposeFn, nodeEvent, style, styleBehavior } from "@aelea/dom"
import { $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { constant, map, now, switchLatest } from "@most/core"
import { Stream } from "@most/types"
import { invertColor } from "gmx-middleware-utils"

export interface IButtonToggle<T> {
  options: T[]
  selected: Stream<T>

  $container?: NodeComposeFn<$Node>
  $button?: NodeComposeFn<$Node>

  $$option?: Op<T, $Node>
}

export const $defaulButtonToggleBtn = $row(style({
  placeContent: 'center', fontWeight: 'bold',
  borderRadius: '442px', padding: '10px 16px', alignItems: 'center', border: '1px solid transparent',
  cursor: 'pointer', margin: '-2px'
}))

export const $defaulButtonToggleContainer = $row(style({
  borderRadius: '442px',
  border: `1px solid ${pallete.horizon}`, backgroundColor: pallete.background
}))


const defaultOption = map(<T>(o: T) => $text(String(o)))

export const $ButtonToggle = <T>({ options, selected, $$option = defaultOption, $button = $defaulButtonToggleBtn, $container = $defaulButtonToggleContainer }: IButtonToggle<T>) => component((
  [select, sampleSelect]: Behavior<INode, T>
) => {

  return [
    $container(
      ...options.map(opt =>
        $button(
          sampleSelect(
            nodeEvent('click'),
            constant(opt)
          ),
          styleBehavior(
            map(selectedOpt => {
              return selectedOpt === opt
                ? { boxShadow: `0px 0px 0 2px ${pallete.primary} inset`, cursor: 'default' }
                : null
            }, selected)
          )
        )(
          switchLatest(
            $$option(now(opt))
          )
        )
      )
    ),

    { select }
  ]
})

