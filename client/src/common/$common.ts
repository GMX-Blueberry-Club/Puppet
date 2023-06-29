import { isStream, O } from "@aelea/core"
import { $text, style, styleBehavior, styleInline } from "@aelea/dom"
import { $column, $icon, $row, $seperator, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { map, now, skipRepeats } from "@most/core"
import { Stream } from "@most/types"
import * as GMX from "gmx-middleware-const"
import { $bear, $bull, $skull, $tokenIconMap } from "gmx-middleware-ui-components"
import { bnDiv, formatReadableUSD, getAveragePrice, getFundingFee, getLiquidationPrice, getMappedValue, getMarginFees, getNextLiquidationPrice, getPnL, getTradeTotalFee, IAbstractPositionStake, ITokenSymbol, ITrade, ITradeSettled, liquidationWeight } from "gmx-middleware-utils"


export const $sizeDisplay = (size: bigint, collateral: bigint) => {

  return $column(layoutSheet.spacingTiny, style({ textAlign: 'right' }))(
    $text(style({ fontSize: '.75em' }))(formatReadableUSD(collateral)),
    $seperator,
    $text(formatReadableUSD(size)),
  )
}

export const $entry = (pos: ITrade | ITradeSettled) => {
  return $column(layoutSheet.spacingTiny, style({ alignItems: 'center', placeContent: 'center', fontSize: '.65em' }))(
    $row(
      $icon({
        svgOps: style({ borderRadius: '50%', padding: '4px', marginRight: '-10px', zIndex: 0, alignItems: 'center', fill: pallete.message, backgroundColor: pallete.horizon }),
        $content: pos.isLong ? $bull : $bear,
        viewBox: '0 0 32 32',
        width: '26px'
      }),
      $TokenIcon(getMappedValue(GMX.TOKEN_ADDRESS_TO_SYMBOL, pos.indexToken), { width: '28px' }),
    ),
    $text(formatReadableUSD(getAveragePrice(pos)))
  )
}

export const $settledSizeDisplay = (pos: ITradeSettled) => $column(layoutSheet.spacingTiny, style({ textAlign: 'right' }))(
  $text(formatReadableUSD(pos.settlement.size)),
  $seperator,
  $row(layoutSheet.spacingSmall, style({ fontSize: '.65em', placeContent: 'center' }))(
    $leverage(pos.maxSize, pos.maxCollateral),
    $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
      $icon({
        $content: $skull,
        viewBox: '0 0 32 32',
        width: '12px'
      }),
      $text(formatReadableUSD(getLiquidationPrice(pos.isLong, pos.settlement.collateral, pos.settlement.size, pos.settlement.averagePrice))),
    ),
  )
)


export const $TokenIcon = (indexToken: ITokenSymbol, IIcon?: { width?: string }) => {
  const $token = $tokenIconMap[indexToken]

  if (!$token) {
    throw new Error('Unable to find matched token')
  }

  return $icon({
    $content: $token,
    svgOps: style({ fill: pallete.message }),
    viewBox: '0 0 32 32',
    width: '24px',
    ...IIcon
  })
}


export const $riskLiquidator = (trade: ITrade, markPrice: Stream<bigint>) => {
  const lastUpdate = trade.updateList[trade.updateList.length - 1]

  return $column(layoutSheet.spacingTiny, style({ alignItems: 'flex-end' }))(
    $text(style({ fontSize: '.75em' }))(formatReadableUSD(trade.updateList[trade.updateList.length - 1].collateral)),
    $liquidationSeparator(trade, markPrice),
    $text(formatReadableUSD(lastUpdate.size)),
  )
}

export const $leverage = (size: bigint, collateral: bigint) =>
  $text(style({ fontWeight: 'bold' }))(`${Math.round(bnDiv(size, collateral))}x`)

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


