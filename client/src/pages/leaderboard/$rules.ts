import { $text, style, attr, $element, $Branch } from "@aelea/dom"
import { $row, $column, $icon } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { empty, map, periodic } from "@most/core"
import { readableUsd, unixTimestampNow } from "gmx-middleware-utils"
import { $alertIcon, $defaultDropContainer, $Tooltip } from "gmx-middleware-ui-components"
import { $pnlDisplay } from "../../common/$common.js"


export const $alertTooltip = ($content: $Branch) => {
  return $Tooltip({
    $content,
    $dropContainer: $defaultDropContainer(style({})),
    $anchor: $icon({ $content: $alertIcon, viewBox: '0 0 24 24', width: '18px', fill: pallete.indeterminate, svgOps: style({ minWidth: '18px' }) }),
  })({})
}

function countdownFn(targetDate: number, now: number) {
  const distance = targetDate - now

  const days = Math.floor(distance / (60 * 60 * 24))
  const hours = Math.floor((distance % (60 * 60 * 24)) / (60 * 60))
  const minutes = Math.floor((distance % (60 * 60)) / 60)
  const seconds = Math.floor(distance % 60)

  return `${days ? days + "d " : ''} ${hours ? hours + "h " : ''} ${minutes ? minutes + "m " : ''} ${seconds ? seconds + "s " : '0s'}`
}

const everySec = map(unixTimestampNow, periodic(1000))

export const countdown = (targetDate: number) => {
  return map(now => countdownFn(targetDate, now), everySec)
}


export const $competitionPrize = (prize: bigint | undefined, realisedPnl: bigint) => {
  const val = readableUsd(realisedPnl)
  const isNeg = realisedPnl < 0n

  return $row(
    $column(style({ alignItems: 'center' }))(
      prize ? style({ fontSize: '1.3em' })($pnlDisplay(prize)) : empty(),
      style({ color: pallete.message })(
        $text(style({ color: isNeg ? pallete.negative : pallete.positive }))(
          `${isNeg ? '' : '+'}${val}`
        )
      )
    )
  )
}

export const $avaxIcon = $element('img')(attr({ src: `/assets/avalanche.svg` }), style({ width: '24px', cursor: 'pointer', padding: '3px 6px' }))()
