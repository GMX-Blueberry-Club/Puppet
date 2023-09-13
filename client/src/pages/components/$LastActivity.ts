import { $text, component, nodeEvent, style, styleBehavior } from "@aelea/dom"
import { $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { constant, map } from "@most/core"
import { $anchor } from "gmx-middleware-ui-components"
import * as store from "../../data/store/store.js"
import { Behavior } from "@aelea/core"
import * as GMX from "gmx-middleware-const"
import { Stream } from "@most/types"


export const LAST_ACTIVITY_LABEL_MAP = {
  [GMX.TIME_INTERVAL_MAP.HR24]: '24h',
  [GMX.TIME_INTERVAL_MAP.DAY7]: '7d',
  [GMX.TIME_INTERVAL_MAP.MONTH]: '30d',
  // [GMX.TIME_INTERVAL_MAP.YEAR]: '1y',
}

export const $LastAtivity = (activityTimeframe: Stream<GMX.IntervalTime>) => component((
  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, GMX.IntervalTime>,
) => {
  
  const options = Object.entries(LAST_ACTIVITY_LABEL_MAP)

  return [

    $row(layoutSheet.spacing, style({ alignItems: 'center' }))(
      $text(style({ color: pallete.foreground, lineHeight: '38px' }))('Last Activity:'),
      $row(layoutSheet.spacing)(
        ...options.map(([interval, label]) => {
          return $anchor(
            styleBehavior(map(tf => tf === Number(interval) ? ({ color: pallete.primary }) : null, activityTimeframe)),
            changeActivityTimeframeTether(nodeEvent('click'), constant(Number(interval)))
          )(
            $text(label)
          )
        }),
      ),
    ),


    { changeActivityTimeframe }
  ]
})