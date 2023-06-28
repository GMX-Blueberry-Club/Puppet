import { isStream, O } from "@aelea/core"
import { $element, $Node, $text, attr, style, styleBehavior, styleInline, stylePseudo } from "@aelea/dom"
import { $column, $icon, $row, $seperator, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { empty, map, now, skipRepeats } from "@most/core"
import { Stream } from "@most/types"
import { CHAIN } from "gmx-middleware-const"
import { bnDiv, formatReadableUSD, getFundingFee, getMarginFees, getNextLiquidationPrice, getPnL, getTradeTotalFee, getTxExplorerUrl, IAbstractPositionStake, ITokenDescription, ITrade, ITradeSettled, liquidationWeight, shortenTxAddress } from "gmx-middleware-utils"
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
  borderRadius: '100px', alignItems: 'center', fontSize: '75%',
  border: `1px dashed ${pallete.negative}`, padding: '8px 10px',
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
    ? style({ lineHeight: 1 })(label)
    : $text(style({ color: pallete.foreground, lineHeight: 1 }))(label)
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


export const $sizeDisplay = (size: bigint, collateral: bigint) => {

  return $column(layoutSheet.spacingTiny, style({ textAlign: 'right' }))(
    $text(style({ fontSize: '.75em' }))(formatReadableUSD(collateral)),
    $seperator,
    $text(formatReadableUSD(size)),
  )
}


export const $settledSizeDisplay = (pos: ITradeSettled) => $column(layoutSheet.spacingTiny, style({ textAlign: 'right' }))(
  $text(style({ fontSize: '.75em' }))(formatReadableUSD(pos.maxSize)),
  $seperator,
  $text(formatReadableUSD(pos.settlement.size)),
)

export const $riskLiquidator = (trade: ITrade, markPrice: Stream<bigint>) => {
  const lastUpdate = trade.updateList[trade.updateList.length - 1]

  return $column(layoutSheet.spacingTiny, style({ alignItems: 'flex-end' }))(
    $text(style({ fontSize: '.75em' }))(formatReadableUSD(trade.updateList[trade.updateList.length - 1].collateral)),
    $liquidationSeparator(trade, markPrice),
    $text(formatReadableUSD(lastUpdate.size)),
  )
}

export const $leverage = (pos: IAbstractPositionStake) =>
  $text(style({ fontWeight: 'bold' }))(`${Math.round(bnDiv(pos.size, pos.collateral))}x`)

export const $PnlValue = (pnl: Stream<bigint> | bigint, colorful = true) => {
  const pnls = isStream(pnl) ? pnl : now(pnl)

  const display = map((n: bigint) => {
    return formatReadableUSD(n)
  }, pnls)

  const displayColor = skipRepeats(map((n: bigint) => {
    return n > 0n ? pallete.positive : n === 0n ? pallete.foreground : pallete.negative
  }, pnls))

  const colorStyle = colorful
    ? styleBehavior(map(color => {
      return { color }
    }, displayColor))
    : O()

  // @ts-ignore
  return $text(colorStyle)(display)
}

export const $TradePnl = (trade: ITrade, cumulativeFee: Stream<bigint>, positionMarkPrice: Stream<bigint> | bigint, colorful = true) => {
  const lastUpdate = trade.updateList[trade.updateList.length - 1]

  const pnl = isStream(positionMarkPrice)
    ? map((markPrice: bigint) => {
      const delta = getPnL(trade.isLong, lastUpdate.averagePrice, markPrice, lastUpdate.size)
      return lastUpdate.realisedPnl + delta - getTradeTotalFee(trade)
    }, positionMarkPrice)
    : positionMarkPrice

  return $PnlValue(pnl, colorful)
}

export function $liquidationSeparator(trade: ITrade, markPrice: Stream<bigint>) {
  const lastUpdate = trade.updateList[trade.updateList.length - 1]

  const liquidationPrice = getNextLiquidationPrice(trade.isLong, lastUpdate.size, lastUpdate.collateral, lastUpdate.averagePrice)
  const liqWeight = map(price => liquidationWeight(trade.isLong, liquidationPrice, price), markPrice)

  return styleInline(map((weight) => {
    return { width: '100%', background: `linear-gradient(90deg, ${pallete.negative} ${`${weight * 100}%`}, ${pallete.foreground} 0)` }
  }, liqWeight))(
    $seperator
  )
}

export const $openPositionPnlBreakdown = (trade: ITrade, cumulativeFee: Stream<bigint>, price: Stream<bigint>) => {
  const totalMarginFee = [...trade.increaseList, ...trade.decreaseList].reduce((seed, next) => seed + getMarginFees(next.sizeDelta), 0n)
  const totalFee = [...trade.increaseList, ...trade.decreaseList].reduce((seed, next) => next.fee, 0n)
  const lastUpdate = trade.updateList[trade.updateList.length - 1]


  return $column(layoutSheet.spacing)(
    $row(style({ placeContent: 'space-between' }))(
      $text('Net PnL breakdown'),
      $row(layoutSheet.spacingTiny)(
        $text(style({ color: pallete.foreground, flex: 1 }))('Deposit'),
        $text(map(cumFee => {
          const entryFundingRate = lastUpdate.entryFundingRate
          const fee = getFundingFee(entryFundingRate, cumFee, lastUpdate.size)
          const realisedLoss = lastUpdate.realisedPnl < 0n ? -lastUpdate.realisedPnl : 0n

          return formatReadableUSD(lastUpdate.collateral + fee + realisedLoss + totalMarginFee)
        }, cumulativeFee))
      )
    ),
    $column(layoutSheet.spacingSmall)(

      $row(layoutSheet.spacingTiny)(
        $text(style({ color: pallete.foreground, flex: 1 }))('Margin Fee'),
        $PnlValue(-totalMarginFee)
      ),
      $row(layoutSheet.spacingTiny)(
        $text(style({ color: pallete.foreground, flex: 1 }))('Borrow Fee'),
        $PnlValue(
          map(cumFee => {
            const entryFundingRate = lastUpdate.entryFundingRate
            // const historicBorrowingFee = totalFee - trade.fee

            const fee = getFundingFee(entryFundingRate, cumFee, lastUpdate.size) // + historicBorrowingFee
            
            return -fee
          }, cumulativeFee)
        )
      ),
      $seperator,
      // $row(layoutSheet.spacingTiny)(
      //   $text(style({ color: pallete.foreground, flex: 1 }))('Total Fees'),
      //   $PnlValue(map(cumFee => {
      //     const fstUpdate = trade.updateList[0]
      //     const entryFundingRate = fstUpdate.entryFundingRate

      //     const fee = getFundingFee(entryFundingRate, cumFee, trade.size) + trade.fee

      //     return -fee
      //   }, cumulativeFee))
      // ),
      $row(layoutSheet.spacingTiny)(
        $text(style({ color: pallete.foreground, flex: 1 }))('Realised Pnl'),
        $PnlValue(now(lastUpdate.realisedPnl))
      ),
      
    )
  )
}


export const $labeledDivider = (label: string) => {
  return $row(layoutSheet.spacing, style({ placeContent: 'center', alignItems: 'center' }))(
    $column(style({ flex: 1, borderBottom: `1px solid ${pallete.horizon}` }))(),
    $row(layoutSheet.spacingSmall, style({ color: pallete.foreground, alignItems: 'center' }))(
      $text(style({ fontSize: '75%' }))(label),
      $icon({ $content: $caretDblDown, width: '10px', viewBox: '0 0 32 32', fill: pallete.foreground }),
    ),
    $column(style({ flex: 1, borderBottom: `1px solid ${pallete.horizon}` }))(),
  )
}

export const $tokenLabel = (token: ITokenDescription, $iconG: $Node, $label?: $Node) => {
  return $row(layoutSheet.spacing, style({ cursor: 'pointer', alignItems: 'center' }))(
    $icon({ $content: $iconG, width: '34px', viewBox: '0 0 32 32' }),
    $column(layoutSheet.flex)(
      $text(style({ fontWeight: 'bold' }))(token.symbol),
      $text(style({ fontSize: '75%', color: pallete.foreground }))(token.symbol)
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



