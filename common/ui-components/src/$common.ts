import { combineObject, isStream, O, Op } from "@aelea/core"
import { $element, $node, $Node, $svg, $text, attr, IBranch, style, styleBehavior, stylePseudo } from "@aelea/dom"
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { empty, fromPromise, map, now, skipRepeats, startWith } from "@most/core"
import { Stream } from "@most/types"
import { getExplorerUrl, getMappedValue, ITokenDescription, promiseState, PromiseStatus, shortenTxAddress, switchMap } from "common-utils"
import { arbitrum, Chain } from "viem/chains"
import { $alertIcon, $arrowRight, $caretDblDown, $info, $tokenIconMap } from "./$icons.js"
import { $defaultDropContainer, $Tooltip } from "./$Tooltip.js"



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

export const $alertNegativeContainer = $row(layoutSheet.spacingSmall, style({
  minWidth: 0, maxWidth: '100%',
  borderRadius: '100px', alignItems: 'center', fontSize: '.85rem',
  border: `1px dashed ${pallete.negative}`, padding: '8px 12px',
}))

export const $alertPositiveContainer = $row(layoutSheet.spacingSmall, style({
  minWidth: 0, maxWidth: '100%',
  borderRadius: '100px', alignItems: 'center', fontSize: '.85rem',
  border: `1px dashed ${pallete.positive}`, padding: '8px 12px',
}))

export const $alertIntermediateContainer = (...$content: $Node[]) => $row(layoutSheet.spacingSmall, style({
  minWidth: 0, maxWidth: '100%',
  borderRadius: '100px', alignItems: 'center', fontSize: '.85rem',
  padding: '9px 12px', position: 'relative', overflow: 'hidden',
}))(
  $node(
    style({
      inset: 0,
      width: '200%',
      animation: `borderRotate .75s linear infinite`,
      position: 'absolute',
      background: `linear-gradient(115deg, ${pallete.negative}, ${pallete.primary}, ${pallete.positive}, ${pallete.primary}) 0% 0% / 50% 100%`,
    }),
  )(),
  $node(
    style({
      inset: '1px',
      position: 'absolute',
      background: colorAlpha(pallete.background, .9),
      borderRadius: '100px',
    }),
  )(),
  ...$content,
)

export const $alert = ($content: $Node) => $alertNegativeContainer(style({ alignSelf: 'flex-start' }))(
  $icon({ $content: $alertIcon, viewBox: '0 0 24 24', width: '18px', svgOps: style({ minWidth: '18px' }) }),
  $content,
)

export const $alertTooltip = ($content: $Node) => {
  return $Tooltip({
    $content: $content,
    // $dropContainer: $defaultDropContainer,
    $anchor: $alertNegativeContainer(
      $icon({ $content: $alertIcon, viewBox: '0 0 24 24', width: '18px', svgOps: style({ minWidth: '18px' }) }),
      style({ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' })($content),
    ),
  })({})
}

export const $alertPositiveTooltip = ($content: $Node) => {
  return $Tooltip({
    $content: $content,
    // $dropContainer: $defaultDropContainer,
    $anchor: $alertPositiveContainer(
      $icon({ $content: $alertIcon, viewBox: '0 0 24 24', width: '18px', svgOps: style({ minWidth: '18px' }) }),
      style({ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' })($content),
    ),
  })({})
}

export const $intermediateTooltip = ($content: $Node) => {
  return $Tooltip({
    $content: $content,
    // $dropContainer: $defaultDropContainer,
    $anchor: $alertIntermediateContainer(
      $icon({ $content: $alertIcon, viewBox: '0 0 24 24', width: '18px', svgOps: style({ minWidth: '18px', position: 'relative' }) }),
      style({ position: 'relative', whiteSpace: 'nowrap', textOverflow: 'ellipsis' })($content),
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

export const $infoTooltip = (text: string | $Node, color = pallete.foreground, size = '24px' ) => {
  return $Tooltip({
    $dropContainer: $defaultDropContainer,
    $content: isStream(text) ? text : $text(text),
    $anchor: $icon({ 
      $content: $info, viewBox: '0 0 32 32', fill: color,
      svgOps: style({ width: size, height: size, padding: '2px 4px' })
    }),
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
  const $iconG = getMappedValue($tokenIconMap, token.symbol)

  return $row(layoutSheet.spacing, style({ cursor: 'pointer', alignItems: 'center', }))(
    $icon({ $content: $iconG, width: '34px', viewBox: '0 0 32 32' }),
    $column(layoutSheet.flex)(
      $text(style({ fontWeight: 'bold' }))(token.symbol),
      $text(style({ color: pallete.foreground }))(token.name)
    ),
    style({ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }, $label || empty())
  )
}


export function $txHashRef(txHash: string, chain: Chain = arbitrum) {
  const href = getExplorerUrl(chain) + "/tx/" + txHash

  return $anchor(attr({ href }))($text(shortenTxAddress(txHash)))
}


interface IHintAdjustment {
  label?: string
  color?: Stream<string>
  tooltip?: string | $Node
  val: Stream<string>
  change: Stream<string>
}

export const $hintAdjustment = ({ change, color, val, label, tooltip }: IHintAdjustment) => {
  const displayChange = skipRepeats(map(str => !!str, startWith('', change)))
  const arrowColor = color ?? now(pallete.foreground)

  return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
    tooltip
      ? $infoTooltipLabel(tooltip, label)
      : label
        ? $text(style({ color: pallete.foreground }))(label) : empty(),

    $row(layoutSheet.spacingTiny, style({ lineHeight: 1, alignItems: 'center' }))(
      $text(style({ color: pallete.foreground }))(val),

      $icon({
        $content: $arrowRight,
        width: '10px',
        svgOps: styleBehavior(map(params => {
          return params.displayChange ? { fill: params.arrowColor } : { display: 'none' }
        }, combineObject({ displayChange, arrowColor }))),
        viewBox: '0 0 32 32'  
      }),
      
      $text(map(str => str ?? '', change)),
    ),
    
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

export const $intermediate$node = (querySrc: Stream<Promise<$Node>>, hint = '-'): $Node => {
  const state = promiseState(querySrc)
  return switchMap(res => {
    if (res.state === PromiseStatus.DONE) {
      return res.value
    }

    return $text(hint)
  }, state)
}

export const $intermediateMessage = (querySrc: Stream<Promise<string>>, hint = '-'): $Node => {
  const text = switchMap(res => {
    return startWith(hint, fromPromise(res))
  }, querySrc)
  return $text(text)
}
export const $label = $element('label')(
  layoutSheet.spacingSmall,
  style({ color: pallete.foreground, cursor: 'pointer', display: 'flex' })
)

