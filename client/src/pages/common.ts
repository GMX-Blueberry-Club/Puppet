import { $text, style } from "@aelea/dom"
import { $column, $row, $seperator, screenUtils } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"


export const $metricEntry = (label: string, value: string) => $row(style({ fontSize: '.85rem', alignItems: 'center' }))(
  $text(style({ color: pallete.foreground, flex: 1 }))(label),
  $text(style({ fontWeight: 'bold' }))(value),
)

export const $seperator2 = style({ backgroundColor: colorAlpha(pallete.foreground, .20), alignSelf: 'stretch', display: 'block' }, $seperator)


export const $rootContainer = $column(
  style({
    color: pallete.message,
    fill: pallete.message,
    // position: 'relative',
    // backgroundImage: `radial-gradient(570% 71% at 50% 15vh, ${pallete.background} 0px, ${pallete.horizon} 100%)`,
    backgroundColor: pallete.horizon,
    fontSize: '1rem',
    // fontSize: screenUtils.isDesktopScreen ? '1.15rem' : '1rem',
    minHeight: '100vh',
    fontWeight: 400,
    // flexDirection: 'row',
  }),

  screenUtils.isMobileScreen
    ? style({ userSelect: 'none' })
    : style({}),
)