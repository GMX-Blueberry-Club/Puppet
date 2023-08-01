import { isStream, O, Op } from "@aelea/core"
import { $element, $Node, $svg, $text, attr, IBranch, style, styleBehavior, stylePseudo } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { empty, map } from "@most/core"
import { Stream } from "@most/types"
import { CHAIN } from "gmx-middleware-const"
import { getTxExplorerUrl, ITokenDescription, shortenTxAddress } from "gmx-middleware-utils"
import { $alertIcon, $arrowRight, $caretDblDown, $info, $tokenIconMap } from "./$icons.js"
import { $defaultDropContainer, $Tooltip } from "./$Tooltip.js"


export const $anchor = $element('a')(
  layoutSheet.spacingTiny,
  attr({ target: '_blank' }),
  stylePseudo(':hover', { color: pallete.middleground + '!important', fill: pallete.middleground }),
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
  border: `1px dashed ${pallete.negative}`, padding: '8px',
}))

export const $alert = ($content: $Node) => $alertContainer(style({ alignSelf: 'flex-start' }))(
  $icon({ $content: $alertIcon, viewBox: '0 0 24 24', width: '18px', svgOps: style({ minWidth: '18px' }) }),
  $content,
)

export const $alertTooltip = ($content: $Node, $anchorContent?: $Node) => {
  return $Tooltip({
    $content: $content,
    // $dropContainer: $defaultDropContainer,
    $anchor: $alertContainer(
      $icon({ $content: $alertIcon, viewBox: '0 0 24 24', width: '18px', svgOps: style({ minWidth: '18px' }) }),
      $anchorContent ? style({ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' })($anchorContent) : empty(),
    ),
  })({})
}



export const $infoLabel = (label: string | $Node) => {
  return isStream(label)
    ? style({ color: pallete.foreground })(label)
    : $text(style({ color: pallete.foreground }))(label)
}

export const $infoLabeledValue = (label: string | $Node, value: string | $Node) => {
  return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
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


export const $txHashRef = (txHash: string, chain: CHAIN, label?: $Node) => {
  const href = getTxExplorerUrl(chain, txHash)

  return $anchor(attr({ href }))(label ?? $text(shortenTxAddress(txHash)))
}



// $text(style({ fontSize: '.85rem' }))(readableUSD(pos.averagePrice)),
// $column(style({ marginLeft: '-5px', borderRadius: '50%', padding: '6px', alignItems: 'center', backgroundColor: pallete.horizon }))(
//   $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(

//     $leverage(pos)
//   ),
// )





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

export const $hintNumChange = (config: {
  label?: string,
  isIncrease: Stream<boolean>,
  tooltip?: string | $Node,
  val: Stream<string>,
  change: Stream<string>
}) => $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
  config.tooltip
    ? $infoTooltipLabel(config.tooltip, config.label)
    : config.label
      ? $text(style({ color: pallete.foreground }))(config.label) : empty(),
  $row(layoutSheet.spacingSmall, style({ lineHeight: 1, alignItems: 'center' }))(
    $text(style({ color: pallete.foreground }))(config.val),
    $icon({
      $content: $arrowRight,
      width: '10px',
      svgOps: styleBehavior(map(isIncrease => {
        return isIncrease ? { fill: pallete.positive } : { fill: pallete.indeterminate }
      }, config.isIncrease)),
      viewBox: '0 0 32 32'
    }),
    $text(style({}))(config.change),
  ),
)

interface Icon {
  /**  in pixels */
  width?: string
  height?: string
  viewBox?: string
  fill?: string

  $content: $Node
  svgOps?: Op<IBranch<SVGSVGElement>, IBranch<SVGSVGElement>>
}

export const $icon = ({ $content, width = '24px', viewBox = `0 0 ${parseInt(width)} ${parseInt(width)}`, fill = 'inherit', svgOps = O() }: Icon) => (
  $svg('svg')(attr({ viewBox, fill }), style({ width, aspectRatio: '1 /1' }), svgOps)(
    $content
  )
)

