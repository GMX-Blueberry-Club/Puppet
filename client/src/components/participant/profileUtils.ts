import { style } from "@aelea/dom"
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"


export const $metricRow = $column(layoutSheet.spacingTiny, style({ placeContent: 'center', alignItems: 'center' }))
export const $metricLabel = $row(style({ color: pallete.foreground, letterSpacing: '1px', fontSize: screenUtils.isDesktopScreen ? '.85rem' : '.85rem' }))
export const $metricValue = $row(style({ fontWeight: 900, letterSpacing: '1px', fontSize: '1.85rem' }))
