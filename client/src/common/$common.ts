import { Behavior, combineObject, isStream, O } from "@aelea/core"
import { $text, component, style, styleBehavior, styleInline } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $icon, $row, $seperator, layoutSheet, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { map, now, skipRepeats } from "@most/core"
import { Stream } from "@most/types"
import * as GMX from 'gmx-middleware-const'
import { $bear, $bull, $Link, $skull, $tokenIconMap } from "gmx-middleware-ui-components"
import {
  bnDiv,
  div, formatBps,
  getFundingFee,
  getNextLiquidationPrice, getPnL,
  getTokenDescription,
  IAbstractRouteIdentity,
  IPosition, IPositionSettled, IPositionSlot,
  isPositionSettled,
  leverageLabel,
  liquidationWeight,
  readableFixedUSD30,
  switchMap
} from "gmx-middleware-utils"
import { getPuppetSubscriptionKey, getRouteTypeKey } from "puppet-middleware-const"
import { IPuppetRouteSubscritpion, IPuppetRouteTrades } from "puppet-middleware-utils"
import * as viem from "viem"
import { $profileAvatar, $profileDisplay } from "../components/$AccountProfile"
import { $Popover } from "../components/$Popover"
import { $RouteSubscriptionEditor } from "../components/$RouteSubscription"
import { $ButtonSecondary, $defaultMiniButtonSecondary } from "../components/form/$Button"
import { IProfileActiveTab } from "../pages/$Profile"
import { $seperator2 } from "../pages/common"
import { wallet } from "../wallet/walletLink"
import { $puppetLogo } from "./$icons"


export const $midContainer = $column(
  style({
    margin: '0 auto',
    maxWidth: '940px', padding: '0 8px 26px',
    gap: screenUtils.isDesktopScreen ? '50px' : '50px',
    width: '100%',
  })
)

export const $size = (size: bigint, collateral: bigint) => {
  return $column(layoutSheet.spacingTiny, style({ textAlign: 'right' }))(
    $text(readableFixedUSD30(size)),   
    $seperator2,
    $leverage(size, collateral),
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

export const $route = (pos: IAbstractRouteIdentity, size = '34px') => {
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

export const $sizeAndLiquidation = (isLong: boolean, size: bigint, collateral: bigint, averagePrice: bigint, markPrice: Stream<bigint>) => {

  return $column(layoutSheet.spacingTiny, style({ alignItems: 'flex-end' }))(
    $text(readableFixedUSD30(size)),
    $liquidationSeparator(isLong, size, collateral, averagePrice, markPrice),
    $leverage(size, collateral),
  )
}


export const $puppets = (puppets: readonly viem.Address[]) => {

  // const positionMarkPrice = tradeReader.getLatestPrice(now(pos.indexToken))
  // const cumulativeFee = tradeReader.vault.read('cumulativeFundingRates', pos.collateralToken)
                
  return $row(layoutSheet.spacingSmall, style({ }))(
    ...puppets.map(address => {
      return $profileAvatar({ address, profileSize: 30 })
    }),
    // $content
  )
}

export const $leverage = (size: bigint, collateral: bigint) =>
  $text(style({ fontWeight: 'bold', letterSpacing: '0.05em', fontSize: '0.85rem' }))(`${Math.round(bnDiv(size, collateral))}x`)

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

export function $liquidationSeparator(isLong: boolean, size: bigint, collateral: bigint, averagePrice: bigint, markPrice: Stream<bigint>) {

  const liquidationPrice = getNextLiquidationPrice(isLong, size, collateral, averagePrice)
  const liqWeight = map(price => liquidationWeight(isLong, liquidationPrice, price), markPrice)

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

interface ITraderDisplay {
  trader: viem.Address
  // changeSubscriptionList: Stream<IPuppetRouteTrades[]>
  subscriptionList: Stream<IPuppetRouteTrades[]>
  route: router.Route
}

export const $TraderDisplay =  (config: ITraderDisplay) => component((
  [clickTrader, clickTraderTether]: Behavior<any, viem.Address>,
  [popRouteSubscriptionEditor, popRouteSubscriptionEditorTether]: Behavior<any, IPuppetRouteSubscritpion>,
  [modifySubscribeList, modifySubscribeListTether]: Behavior<IPuppetRouteSubscritpion>,
) => {


  const $trader = $Link({
    $content: $profileDisplay({
      address: config.trader,
      // $profileContainer: $defaultBerry(style({ width: '50px' }))
    }),
    route: config.route.create({ fragment: 'baseRoute' }),
    url: `/app/profile/${config.trader}/${IProfileActiveTab.TRADER.toLowerCase()}`
  })({ click: clickTraderTether() })


  return [
    $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
    // $alertTooltip($text(`This account requires GBC to receive the prize once competition ends`)),

      switchMap(params => {
        const w3p = params.wallet
        if (w3p === null) {
          return $trader
        }

        const routeTypeKey = getRouteTypeKey(GMX.ARBITRUM_ADDRESS.NATIVE_TOKEN, GMX.ARBITRUM_ADDRESS.NATIVE_TOKEN, true)
        const puppetSubscriptionKey = getPuppetSubscriptionKey(w3p.account.address, config.trader, routeTypeKey)
        const routeSubscription = params.subscriptionList.find(x => x.puppetSubscriptionKey === puppetSubscriptionKey)


        return $Popover({
          dismiss: modifySubscribeList,
          $target: $row(layoutSheet.spacingSmall)(
            $trader,
            $ButtonSecondary({
              $content: routeSubscription ? $text('Change') : $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))($icon({ $content: $puppetLogo, fill: pallete.message, width: '16px', viewBox: `0 0 32 32` }), $text('Copy')),
              $container: $defaultMiniButtonSecondary 
            })({
              click: popRouteSubscriptionEditorTether()
            }),
          ),
          $popContent: map(() => {
            return $RouteSubscriptionEditor({ routeSubscription })({
              changeRouteSubscription: modifySubscribeListTether(map(partialSubsc => {
                return { ...{ trader: config.trader, puppet: w3p.account.address, routeTypeKey: routeTypeKey }, ...partialSubsc }
              }))
            })
          }, popRouteSubscriptionEditor)
        })({})
      }, combineObject({ subscriptionList: config.subscriptionList, wallet }))
    ),


    { modifySubscribeList, clickTrader }
  ]
})
