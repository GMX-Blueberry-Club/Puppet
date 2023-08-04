import { isStream, O, Tether } from "@aelea/core"
import { $Node, $text, style, styleBehavior, styleInline } from "@aelea/dom"
import { $column, $icon, $row, $seperator, layoutSheet } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { map, now, skipRepeats } from "@most/core"
import { Stream } from "@most/types"
import { $bear, $bull, $Link, $skull, $tokenIconMap } from "gmx-middleware-ui-components"
import {
  bnDiv,
  div, formatBps,
  getFundingFee,
  getNextLiquidationPrice, getPnL,
  getTokenDescription,
  IAbstractPositionStake,
  IAbstractRouteIdentity,
  IPosition, IPositionSettled, IPositionSlot,
  isPositionSettled,
  IVaultPosition,
  leverageLabel,
  liquidationWeight,
  readableFixedUSD30
} from "gmx-middleware-utils"
import { getPortion, IPositionMirrorSettled, IPositionMirrorSlot } from "puppet-middleware-utils"
import * as viem from "viem"
import { $discoverAvatar, $discoverIdentityDisplay } from "../components/$AccountProfile"
import { $defaultBerry } from "../components/$DisplayBerry"
import { IProfileActiveTab } from "../pages/$Profile"
import { $seperator2 } from "../pages/common"
import { Route } from "@aelea/router"


export const $size = (size: bigint, collateral: bigint) => {
  return $column(layoutSheet.spacingTiny, style({ textAlign: 'right' }))(
    $text(readableFixedUSD30(size)),   
    $seperator2,
    $text(style({ fontWeight: 'bold', fontSize: '.85rem' }))(`${Math.round(formatBps(div(size, collateral)))}x`),
  )
}

export const $entry = (pos: IPosition) => {
  return $column(layoutSheet.spacingTiny, style({ alignItems: 'center', placeContent: 'center', fontSize: '.85rem' }))(
    $row(
      $icon({
        svgOps: style({ borderRadius: '50%', padding: '4px', marginRight: '-10px', zIndex: 0, alignItems: 'center', fill: pallete.message, backgroundColor: pallete.horizon }),
        $content: pos.isLong ? $bull : $bear,
        viewBox: '0 0 32 32',
        width: '26px'
      }),
      $tokenIcon(pos.indexToken, { width: '28px' }),
    ),
    $text(readableFixedUSD30(pos.averagePrice))
  )
}

export const $route = (pos: IAbstractRouteIdentity, size = '28px') => {
  return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
    $tokenIcon(pos.indexToken, { width: size }),
    $text(getTokenDescription(pos.indexToken).symbol),
    $text(pos.indexToken === pos.collateralToken ? 'Long': 'Short'),
  )
}

export const $settledSizeDisplay = (pos: IPositionSettled | IPositionSlot) => {
  return $column(layoutSheet.spacingTiny, style({ textAlign: 'right' }))(
    $text(readableFixedUSD30(pos.maxSize)),
    $seperator2,
    $row(layoutSheet.spacingSmall, style({ fontSize: '.85rem', placeContent: 'center' }))(
      $leverage(pos.maxSize, pos.maxCollateral),
      $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
        $icon({
          fill: isPositionSettled(pos) ? pallete.negative : undefined,
          $content: $skull,
          viewBox: '0 0 32 32',
          width: '12px'
        }),
        $text(readableFixedUSD30(pos.averagePrice)),
      ),
    )
  )
}


export const $traderDisplay = (route: Route ,pos: IPositionMirrorSlot | IPositionMirrorSettled, changeRoute: Tether<string, string>) => {
  return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
    // $alertTooltip($text(`This account requires GBC to receive the prize once competition ends`)),
    $Link({
      $content: $discoverIdentityDisplay({
        address: pos.trader,
        $profileContainer: $defaultBerry(style({ width: '50px' }))
      }),
      route: route.create({ fragment: 'fefwef' }),
      url: `/app/profile/${pos.trader}/${IProfileActiveTab.TRADER.toLowerCase()}`
    })({ click: changeRoute() }),
    // $anchor(clickAccountBehaviour)(
    //   $accountPreview({ address: pos.account })
    // )
    // style({ zoom: '0.7' })(
    //   $alert($text('Unclaimed'))
    // )
  )
}


export const $tokenIcon = (indexToken: viem.Address, IIcon?: { width?: string }) => {
  const tokenDesc = getTokenDescription(indexToken)
  const $token = $tokenIconMap[tokenDesc.symbol]

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

export const $sizeLiq = (pos: IVaultPosition & IAbstractRouteIdentity, markPrice: Stream<bigint>) => {

  return $column(layoutSheet.spacingTiny, style({ alignItems: 'flex-end' }))(
    $text(readableFixedUSD30(pos.size)),
    $liquidationSeparator(pos, markPrice),
    $text(style({ fontSize: '.85rem', fontWeight: 'bold' }))(leverageLabel(div(pos.size, pos.collateral))),
  )
}

export const $riskLiquidator = (pos: IPositionSettled | IPositionSlot,  markPrice: Stream<bigint>) => {
  return isPositionSettled(pos) ? $size(pos.size, pos.collateral) : $sizeLiq(pos, markPrice)
}


export const $puppets = (puppets: readonly viem.Address[], $content: $Node) => {

  // const positionMarkPrice = tradeReader.getLatestPrice(now(pos.indexToken))
  // const cumulativeFee = tradeReader.vault.read('cumulativeFundingRates', pos.collateralToken)
                
  return $row(layoutSheet.spacingSmall, style({ }))(
    ...puppets.map(address => {
      return $discoverAvatar({ address, $profileContainer: $defaultBerry(style({ minWidth: '30px', maxWidth: '30px' })) })
    }),
    $content
  )
}

export const $leverage = (size: bigint, collateral: bigint) =>
  $text(style({ fontWeight: '900' }))(`${Math.round(bnDiv(size, collateral))}x`)

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

export const $tradePnl = (pos: IPositionSlot, positionMarkPrice: Stream<bigint> | bigint, colorful = true) => {

  const pnl = isStream(positionMarkPrice)
    ? map((markPrice: bigint) => {
      const delta = getPnL(pos.isLong, pos.averagePrice, markPrice, pos.size)
      return pos.realisedPnl + delta - pos.cumulativeFee
    }, positionMarkPrice)
    : positionMarkPrice

  return $pnlValue(pnl, colorful)
}

export function $liquidationSeparator(pos: IVaultPosition & IAbstractRouteIdentity, markPrice: Stream<bigint>) {

  const liquidationPrice = getNextLiquidationPrice(pos.isLong, pos.size, pos.collateral, pos.averagePrice)
  const liqWeight = map(price => liquidationWeight(pos.isLong, liquidationPrice, price), markPrice)

  return styleInline(map((weight) => {
    return { width: '100%', background: `linear-gradient(90deg, ${pallete.negative} ${`${weight * 100}%`}, ${pallete.foreground} 0)` }
  }, liqWeight))(
    $seperator
  )
}

export const $openPositionPnlBreakdown = (pos: IPositionSlot, cumulativeFee: Stream<bigint>) => {


  return $column(layoutSheet.spacing)(
    $row(style({ placeContent: 'space-between' }))(
      $text('Net PnL breakdown'),
      $row(layoutSheet.spacingTiny)(
        $text(style({ color: pallete.foreground, flex: 1 }))('Deposit'),
        $text(map(cumFee => {
          const entryFundingRate = pos.entryFundingRate
          const fee = getFundingFee(entryFundingRate, cumFee, pos.size)
          const realisedLoss = pos.realisedPnl < 0n ? -pos.realisedPnl : 0n

          return readableFixedUSD30(pos.collateral + fee + realisedLoss + pos.cumulativeFee)
        }, cumulativeFee))
      )
    ),
    $column(layoutSheet.spacingSmall)(

      $row(layoutSheet.spacingTiny)(
        $text(style({ color: pallete.foreground, flex: 1 }))('Margin Fee'),
        $pnlValue(-pos.cumulativeFee)
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
      $row(layoutSheet.spacingTiny)(
        $text(style({ color: pallete.foreground, flex: 1 }))('Total Fees'),
        $pnlValue(
          map(cumFee => {
            const fstUpdate = pos.link.updateList[0]
            const entryFundingRate = fstUpdate.entryFundingRate

            const fee = getFundingFee(entryFundingRate, cumFee, pos.size) + pos.cumulativeFee

            return -fee
          }, cumulativeFee)
        )
      ),
      $row(layoutSheet.spacingTiny)(
        $text(style({ color: pallete.foreground, flex: 1 }))('Realised Pnl'),
        $pnlValue(now(pos.realisedPnl))
      ),

    )
  )
}


