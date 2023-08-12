import { $text, component, nodeEvent, style, styleBehavior } from "@aelea/dom"
import { $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { constant, map } from "@most/core"
import { $anchor } from "gmx-middleware-ui-components"
import * as store from "../../data/store/store"
import { Behavior } from "@aelea/core"
import * as GMX from "gmx-middleware-const"
import { Stream } from "@most/types"



export const $LastAtivity = (activityTimeframe: Stream<GMX.IntervalTime>) => component((
  [changeActivityTimeframe, changeActivityTimeframeTether]: Behavior<any, GMX.IntervalTime>,
) => {
  

  return [

    $row(layoutSheet.spacing)(
      $text(style({ color: pallete.foreground }))('Last Activity:'),
      $row(layoutSheet.spacing)(
        $anchor(
          styleBehavior(map(tf => tf === GMX.TIME_INTERVAL_MAP.HR24 ? ({ color: pallete.primary }) : null, activityTimeframe)),
          changeActivityTimeframeTether(nodeEvent('click'), constant(GMX.TIME_INTERVAL_MAP.HR24))
        )(
          $text('24h')
        ),
        $anchor(
          styleBehavior(map(tf => tf === GMX.TIME_INTERVAL_MAP.DAY7 ? ({ color: pallete.primary }) : null, activityTimeframe)),
          changeActivityTimeframeTether(nodeEvent('click'), constant(GMX.TIME_INTERVAL_MAP.DAY7))
        )(
          $text('7d')
        ),
        $anchor(
          styleBehavior(map(tf => tf === GMX.TIME_INTERVAL_MAP.MONTH ? ({ color: pallete.primary }) : null, activityTimeframe)),
          changeActivityTimeframeTether(nodeEvent('click'), constant(GMX.TIME_INTERVAL_MAP.MONTH))
        )(
          $text('30d')
        ),
        $anchor(
          styleBehavior(map(tf => tf === GMX.TIME_INTERVAL_MAP.YEAR ? ({ color: pallete.primary }) : null, activityTimeframe)),
          changeActivityTimeframeTether(nodeEvent('click'), constant(GMX.TIME_INTERVAL_MAP.YEAR))
        )(
          $text('1y')
        )
      ),
      // $anchor(
      //   styleBehavior(map(tf => tf === 0 ? ({ color: pallete.primary }) : null, activityTimeframe)),
      //   changeTimeframeTether(nodeEvent('click'), constant(TIME_INTERVAL_MAP.MONTH))
      // )(
      //   $text('all')
      // )
    ),


    { changeActivityTimeframe }
  ]
})