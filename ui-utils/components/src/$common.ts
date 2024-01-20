import { combineObject, isStream, O, Op } from "@aelea/core"
import { $element, $Node, $svg, $text, attr, IBranch, style, styleBehavior, stylePseudo } from "@aelea/dom"
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { empty, fromPromise, map, skipRepeats, startWith } from "@most/core"
import { Stream } from "@most/types"
import { getExplorerUrl, ITokenDescription, shortenTxAddress, switchMap } from "gmx-middleware-utils"
import { $alertIcon, $arrowRight, $caretDblDown, $info, $tokenIconMap } from "./$icons.js"
import { $defaultDropContainer, $Tooltip } from "./$Tooltip.js"
import { Chain } from "viem/chains"


export const intermediateMessage = <T>(query: Promise<T>, cb: (x: T) => string) => {
  const txt = fromPromise(query)
  return startWith('-', map(cb, txt))
}

export const $intermediateMessage = <T>(querySrc: Stream<Promise<T>>, cb: (x: T) => string) => {
  return $text(switchMap(query => intermediateMessage(query, cb), querySrc))
}

export const $anchor = $element('a')(
  layoutSheet.spacingTiny,
  attr({ target: '_blank' }),
  stylePseudo(':hover', { color: pallete.foreground + '!important', fill: pallete.foreground }),
  style({
    cursor: 'pointer',
    color: pallete.message,
    alignItems: 'center',
    display: 'inline-flex',
  }),
)

export const $alertContainer = $row(layoutSheet.spacingSmall, style({
  minWidth: 0, maxWidth: '100%',
  borderRadius: '100px', alignItems: 'center', fontSize: '.85rem',
  border: `1px dashed ${pallete.negative}`, padding: '8px 12px',
}))

export const $alert = ($content: $Node) => $alertContainer(style({ alignSelf: 'flex-start' }))(
  $icon({ $content: $alertIcon, viewBox: '0 0 24 24', width: '18px', svgOps: style({ minWidth: '18px' }) }),
  $content,
)

export const $alertTooltip = ($content: $Node) => {
  return $Tooltip({
    $content: $content,
    // $dropContainer: $defaultDropContainer,
    $anchor: $alertContainer(
      $icon({ $content: $alertIcon, viewBox: '0 0 24 24', width: '18px', svgOps: style({ minWidth: '18px' }) }),
      style({ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' })($content),
    ),
  })({})
}



export const $infoLabel = (label: string | $Node) => {
  return isStream(label)
    ? style({ color: pallete.foreground })(label)
    : $text(style({ color: pallete.foreground }))(label)
}

export const $infoLabeledValue = (label: string | $Node, value: string | $Node, collapseMobile = false) => {
  const $container = collapseMobile && screenUtils.isMobileScreen ? $column : $row(style({ alignItems: 'center' }))

  return $container(layoutSheet.spacingSmall)(
    $infoLabel(label),
    isStream(value) ? value : $text(value)
  )
}

export const $infoTooltipLabel = (text: string | $Node, label?: string | $Node) => {
  return $row(style({ alignItems: 'center' }))(
    label
      ? $infoLabel(label)
      : empty(),
    $infoTooltip(text),
  )
}

export const $infoTooltip = (text: string | $Node) => {
  return $Tooltip({
    $dropContainer: $defaultDropContainer,
    $content: isStream(text) ? text : $text(text),
    $anchor: $icon({ $content: $info, viewBox: '0 0 32 32', fill: pallete.foreground, svgOps: style({ width: '24px', height: '20px', padding: '2px 4px' }) }),
  })({})
}



export const $labeledDivider = (label: string) => {
  return $row(layoutSheet.spacing, style({ placeContent: 'center', alignItems: 'center' }))(
    $column(style({ flex: 1, borderBottom: `1px solid ${pallete.horizon}` }))(),
    $row(layoutSheet.spacingSmall, style({ color: pallete.foreground, alignItems: 'center' }))(
      $text(style({ fontSize: '.85rem' }))(label),
      $icon({ $content: $caretDblDown, width: '10px', viewBox: '0 0 32 32', fill: pallete.foreground }),
    ),
    $column(style({ flex: 1, borderBottom: `1px solid ${pallete.horizon}` }))(),
  )
}

export const $tokenLabel = (token: ITokenDescription, $iconPath: $Node, $label?: $Node) => {
  return $row(layoutSheet.spacing, style({ cursor: 'pointer', alignItems: 'center' }))(
    $icon({ $content: $iconPath, width: '34px', viewBox: '0 0 32 32' }),
    $column(layoutSheet.flex)(
      $text(style({ fontWeight: 'bold' }))(token.symbol),
      $text(style({ fontSize: '.85rem', color: pallete.foreground }))(token.symbol)
    ),
    style({ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }, $label || empty())
  )
}


export const $tokenLabelFromSummary = (token: ITokenDescription, $label?: $Node) => {
  const $iconG = $tokenIconMap[token.symbol]

  return $row(layoutSheet.spacing, style({ cursor: 'pointer', alignItems: 'center', }))(
    $icon({ $content: $iconG, width: '34px', viewBox: '0 0 32 32' }),
    $column(layoutSheet.flex)(
      $text(style({ fontWeight: 'bold' }))(token.symbol),
      $text(style({ color: pallete.foreground }))(token.name)
    ),
    style({ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }, $label || empty())
  )
}


export const $txHashRef = (txHash: string, chain: Chain) => {
  const href = getExplorerUrl(chain) + "/tx/" + txHash

  return $anchor(attr({ href }))($text(shortenTxAddress(txHash)))
}


interface IHintNumberDisplay {
  label?: string
  isIncrease: Stream<boolean>
  tooltip?: string | $Node
  val: Stream<string>
  change: Stream<string>
}

export const $hintNumChange = ({ change, isIncrease, val, label, tooltip }: IHintNumberDisplay) => {
  const arrowColor = map(ic => ic ? pallete.positive : pallete.indeterminate, isIncrease)
  const displayChange = skipRepeats(map(str => !!str, change))

  return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
    tooltip
      ? $infoTooltipLabel(tooltip, label)
      : label
        ? $text(style({ color: pallete.foreground }))(label) : empty(),

    switchMap(display => {
      if (!display) {
        return $text(val)
      }

      return $row(layoutSheet.spacingTiny, style({ lineHeight: 1, alignItems: 'center' }))(
        $text(style({ color: pallete.foreground }))(val),

        $icon({
          $content: $arrowRight,
          width: '10px',
          svgOps: styleBehavior(map(params => {
            return params.change ? { fill: params.arrowColor } : { display: 'none' }
          }, combineObject({ change, arrowColor }))),
          viewBox: '0 0 32 32'  
        }),
      
        $text(map(str => str ?? '', change)),
      )
    }, displayChange),
    
  )
}

interface Icon {
  /**  in pixels */
  width?: string
  height?: string
  viewBox?: string
  fill?: string

  $content: $Node
  svgOps?: Op<IBranch<SVGSVGElement>, IBranch<SVGSVGElement>>
}

export const $icon = ({ $content, width = '24px', viewBox = `0 0 32 32`, fill = 'inherit', svgOps = O() }: Icon) => (
  $svg('svg')(attr({ viewBox, fill }), style({ width, aspectRatio: '1 /1' }), svgOps)(
    $content
  )
)


