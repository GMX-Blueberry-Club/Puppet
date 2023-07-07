import { isStream, O } from "@aelea/core"
import { $text, style, styleBehavior, styleInline } from "@aelea/dom"
import { $column, $icon, $row, $seperator, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { map, now, skipRepeats } from "@most/core"
import { Stream } from "@most/types"
import * as GMX from "gmx-middleware-const"
import { $bear, $bull, $skull, $tokenIconMap } from "gmx-middleware-ui-components"
import { 
  bnDiv, readableFixedUSD30, getFundingFee, getMappedValue, getMarginFees, getNextLiquidationPrice, getPnL,
  IPosition, IPositionSettled, IPositionSlot, ITokenSymbol, liquidationWeight, readableFixed10kBsp, div, formatBps, safeDiv, readableNumber, readableUnitAmount, readableLargeNumber
} from "gmx-middleware-utils"
import { $seperator2 } from "../pages/common"


export const $sizeDisplay = (size: bigint, collateral: bigint) => {
  return $column(layoutSheet.spacingTiny, style({ textAlign: 'right' }))(
    $text(readableFixedUSD30(size)),   
    $seperator,
    $text(style({ fontWeight: 'bold', fontSize: '.75em' }))(`${Math.round(formatBps(div(size, collateral)))}x`),
  )
}

export const $entry = (pos: IPosition) => {
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
    $text(readableFixedUSD30(pos.averagePrice))
  )
}

export const $settledSizeDisplay = (pos: IPositionSettled) => {

  return $column(layoutSheet.spacingTiny, style({ textAlign: 'right' }))(
    $text(readableFixedUSD30(pos.maxSize)),
    $seperator2,
    $row(layoutSheet.spacingSmall, style({ fontSize: '.65em', placeContent: 'center' }))(
      $leverage(pos.maxSize, pos.maxCollateral),
      $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
        $icon({
          fill: pos.isLiquidated ? pallete.negative : undefined,
          $content: $skull,
          viewBox: '0 0 32 32',
          width: '12px'
        }),
        $text(readableFixedUSD30(pos.averagePrice)),
      ),
    )
  )
}


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


export const $riskLiquidator = (pos: IPositionSlot, markPrice: Stream<bigint>) => {

  return $column(layoutSheet.spacingTiny, style({ alignItems: 'flex-end' }))(
    $text(style({ fontSize: '.75em' }))(readableFixedUSD30(pos.size)),
    $liquidationSeparator(pos, markPrice),
    $text(readableFixedUSD30(pos.size)),
  )
}

export const $leverage = (size: bigint, collateral: bigint) =>
  $text(style({ fontWeight: 'bold' }))(`${Math.round(bnDiv(size, collateral))}x`)

export const $pnlValue = (pnl: Stream<bigint> | bigint, colorful = true) => {
  const pnls = isStream(pnl) ? pnl : now(pnl)

  const display = map((n: bigint) => {
    return readableFixedUSD30(n)
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

export const $PnlPercentageValue = (pnl: Stream<bigint> | bigint, collateral: bigint, colorful = true) => {
  return $column(
    $pnlValue(pnl, colorful),
    $seperator2,
    $pnlValue(pnl, colorful),
  )
}

export const $TradePnl = (pos: IPositionSlot, positionMarkPrice: Stream<bigint> | bigint, colorful = true) => {

  const pnl = isStream(positionMarkPrice)
    ? map((markPrice: bigint) => {
      const delta = getPnL(pos.isLong, pos.averagePrice, markPrice, pos.size)
      return pos.realisedPnl + delta - pos.cumulativeFee
    }, positionMarkPrice)
    : positionMarkPrice

  return $pnlValue(pnl, colorful)
}

export function $liquidationSeparator(pos: IPositionSlot, markPrice: Stream<bigint>) {

  const liquidationPrice = getNextLiquidationPrice(pos.isLong, pos.size, pos.collateral, pos.averagePrice)
  const liqWeight = map(price => liquidationWeight(pos.isLong, liquidationPrice, price), markPrice)

  return styleInline(map((weight) => {
    return { width: '100%', background: `linear-gradient(90deg, ${pallete.negative} ${`${weight * 100}%`}, ${pallete.foreground} 0)` }
  }, liqWeight))(
    $seperator
  )
}

export const $openPositionPnlBreakdown = (pos: IPositionSlot, cumulativeFee: Stream<bigint>, price: Stream<bigint>) => {
  const totalMarginFee = [...pos.link.increaseList, ...pos.link.decreaseList].reduce((seed, next) => seed + getMarginFees(next.sizeDelta), 0n)


  return $column(layoutSheet.spacing)(
    $row(style({ placeContent: 'space-between' }))(
      $text('Net PnL breakdown'),
      $row(layoutSheet.spacingTiny)(
        $text(style({ color: pallete.foreground, flex: 1 }))('Deposit'),
        $text(map(cumFee => {
          const entryFundingRate = pos.entryFundingRate
          const fee = getFundingFee(entryFundingRate, cumFee, pos.size)
          const realisedLoss = pos.realisedPnl < 0n ? -pos.realisedPnl : 0n

          return readableFixedUSD30(pos.collateral + fee + realisedLoss + totalMarginFee)
        }, cumulativeFee))
      )
    ),
    $column(layoutSheet.spacingSmall)(

      $row(layoutSheet.spacingTiny)(
        $text(style({ color: pallete.foreground, flex: 1 }))('Margin Fee'),
        $pnlValue(-totalMarginFee)
      ),
      $row(layoutSheet.spacingTiny)(
        $text(style({ color: pallete.foreground, flex: 1 }))('Borrow Fee'),
        $pnlValue(
          map(cumFee => {
            const entryFundingRate = pos.entryFundingRate
            // const historicBorrowingFee = totalFee - trade.fee

            const fee = getFundingFee(entryFundingRate, cumFee, pos.size) // + historicBorrowingFee

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
        $pnlValue(now(pos.realisedPnl))
      ),

    )
  )
}


