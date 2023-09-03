import { Behavior, combineObject, isStream, O, Tether } from "@aelea/core"
import { $text, component, INode, nodeEvent, style, styleInline } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $icon, $row, $seperator, layoutSheet, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { map, now, skipRepeats } from "@most/core"
import { Stream } from "@most/types"
import * as GMX from 'gmx-middleware-const'
import { TOKEN_SYMBOL } from "gmx-middleware-const"
import { $bear, $bull, $Link, $skull, $tokenIconMap } from "gmx-middleware-ui-components"
import {
  readableLeverage, factor, getFundingFee, getLiquidationPrice, getMarginFees, getTokenDescription, IAbstractPositionParams, IOraclePrice, IPosition, IPositionSettled,
  isPositionSettled, liquidationWeight, readablePercentage, readableFixedUSD30, streamOf, switchMap } from "gmx-middleware-utils"
import { getMpSlotPnL, getPuppetSubscriptionKey, getRouteTypeKey, IPositionMirrorSlot, IPuppetRouteSubscritpion } from "puppet-middleware-utils"
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
    maxWidth: '840px', padding: '0px 12px 26px',
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

export const $routeIntent = (pos: IAbstractPositionParams) => {
  return $row(style({ alignItems: 'center' }))(
    $icon({
      svgOps: style({ borderRadius: '50%', padding: '4px', marginRight: '-6px', zIndex: 0, alignItems: 'center', fill: pallete.message, backgroundColor: pallete.horizon }),
      $content: pos.isLong ? $bull : $bear,
      viewBox: '0 0 32 32',
      width: '26px'
    }),
    $tokenIcon(pos.indexToken, { width: '28px' }),
  )
}

export const $entry = (pos: IPosition) => {
  return $column(layoutSheet.spacingTiny, style({ alignItems: 'center', placeContent: 'center', fontSize: '.85rem' }))(
    $routeIntent(pos),
    $text(readableFixedUSD30(pos.averagePrice))
  )
}

export const $route = (pos: IAbstractPositionParams, size = '34px') => {
  return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
    $icon({
      svgOps: style({ borderRadius: '50%', padding: '4px', marginRight: '-20px', zIndex: 0, alignItems: 'center', fill: pallete.message, backgroundColor: pallete.horizon }),
      $content: pos.isLong ? $bull : $bear,
      viewBox: '0 0 32 32',
      width: '26px'
    }),
    $tokenIcon(pos.indexToken, { width: '28px' }),
    $text(style({ fontSize: '.85rem' }))(`${getTokenDescription(pos.indexToken).symbol}/${getTokenDescription(pos.collateralToken).symbol}`),
  )
}

export const $settledSizeDisplay = (pos: IPositionSettled) => {
  return $column(layoutSheet.spacingTiny, style({ textAlign: 'right' }))(
    $text(readableFixedUSD30(pos.maxSizeUsd)),
    $seperator2,
    $row(layoutSheet.spacingSmall, style({ fontSize: '.85rem', placeContent: 'center' }))(
      $leverage(pos.maxSizeUsd, pos.maxCollateralUsd),
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
  const $token = $tokenIconMap[tokenDesc.symbol] || $tokenIconMap[TOKEN_SYMBOL.GMX]

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

export const $sizeAndLiquidation = (isLong: boolean, size: bigint, collateral: bigint, averagePrice: bigint, markPrice: Stream<IOraclePrice>) => {

  return $column(layoutSheet.spacingTiny, style({ alignItems: 'flex-end' }))(
    $text(readableFixedUSD30(size)),
    $liquidationSeparator(isLong, size, collateral, averagePrice, markPrice),
    $leverage(size, collateral),
  )
}


export const $puppets = (puppets: readonly viem.Address[], click: Tether<INode, string>) => {

  // const positionMarkPrice = tradeReader.getLatestPrice(now(pos.indexToken))
  // const cumulativeFee = tradeReader.vault.read('cumulativeFundingRates', pos.collateralToken)

  if (puppets.length === 0) {
    return $text(style({ fontSize: '0.85rem', color: pallete.foreground }))('-')
  }
                
  return $row(layoutSheet.spacingSmall, style({ cursor: 'pointer' }))(
    ...puppets.map(address => {
      return click(nodeEvent('click'), map(() => {
        const url = `/app/profile/${address}/puppet`

        history.pushState({}, '', url)
        return url
      }))(
        $profileAvatar({ address, profileSize: 30 })
      )
    }),
    // $content
  )
}

export const $leverage = (size: bigint, collateral: bigint) =>
  $text(style({ fontWeight: 'bold', letterSpacing: '0.05em', fontSize: '0.85rem' }))(`${Math.round(readableLeverage(size, collateral))}x`)

export const $pnlValue = (pnl: Stream<bigint> | bigint, colorful = true) => {
  const pnls = isStream(pnl) ? pnl : now(pnl)

  const display = map(value => readableFixedUSD30(value), pnls)

  const displayColor = skipRepeats(map(value => {
    return value > 0n ? pallete.positive : value === 0n ? pallete.foreground : pallete.negative
  }, pnls))

  const colorStyle = colorful
    ? styleInline(map(color => {
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

export const $positionSlotPnl = (mp: IPositionMirrorSlot, positionMarkPrice: Stream<IOraclePrice> | bigint, shareTarget?: viem.Address) => {
  const value = isStream(positionMarkPrice)
    ? map((price) => {
      const pnl = getMpSlotPnL(mp, price, shareTarget)
      return mp.realisedPnl + pnl - mp.cumulativeFee
    }, positionMarkPrice)
    : positionMarkPrice

  return $pnlValue(value)
}

export const $positionSlotRoi = (pos: IPositionMirrorSlot, positionMarkPrice: Stream<IOraclePrice> | IOraclePrice) => {
  const roi = map(markPrice => {
    const delta = getMpSlotPnL(pos, markPrice)
    return readablePercentage(factor(pos.realisedPnl + delta - pos.cumulativeFee, pos.maxCollateralUsd) * 100n)
  }, streamOf(positionMarkPrice))

  return $text(roi)
}

export function $liquidationSeparator(isLong: boolean, size: bigint, collateral: bigint, averagePrice: bigint, markPrice: Stream<IOraclePrice>) {

  const liquidationPrice = getLiquidationPrice(isLong, size, collateral, averagePrice)
  const liqWeight = map(price => liquidationWeight(isLong, liquidationPrice, price), markPrice)

  return styleInline(map((weight) => {
    return { width: '100%', background: `linear-gradient(90deg, ${pallete.negative} ${`${weight * 100}%`}, ${pallete.foreground} 0)` }
  }, liqWeight))(
    $seperator
  )
}

export const $openPositionPnlBreakdown = (pos: IPosition, cumulativeTokenFundingRates: bigint) => {
  const nextFundingFee = getFundingFee(pos.entryFundingRate, cumulativeTokenFundingRates, pos.size)
  const totalMarginFee = getMarginFees(pos.cumulativeSize)

  
  return $column(layoutSheet.spacing, style({ minWidth: '250px' }))(
    $row(style({ placeContent: 'space-between' }))(
      $text('Net breakdown'),

      $row(layoutSheet.spacingTiny)(
        $text(style({ color: pallete.foreground, flex: 1 }))('Collateral'),
        $text(readableFixedUSD30(nextFundingFee))
      ),
    ),
    $column(layoutSheet.spacingSmall)(
      
      $row(style({ placeContent: 'space-between' }))(
        $text(style({ color: pallete.foreground }))('Margin Fee'),
        $pnlValue(-totalMarginFee)
      ),
      $row(style({ placeContent: 'space-between' }))(
        $text(style({ color: pallete.foreground }))('Borrow Fee'),
        $pnlValue(
          -(nextFundingFee + pos.cumulativeFee - totalMarginFee)
        )
      ),
      $seperator2,
      // $row(layoutSheet.spacingTiny)(
      //   $text(style({ color: pallete.foreground, flex: 1 }))('Total Fees'),
      //   $pnlValue(
      //     map(cumFee => {
      //       const fstUpdate = pos.link.updateList[0]
      //       const entryFundingRate = fstUpdate.entryFundingRate

      //       const fee = getFundingFee(entryFundingRate, cumFee, pos.size) + pos.cumulativeFee

      //       return -fee
      //     }, cumulativeTokenFundingRates)
      //   )
      // ),
      $row(style({ placeContent: 'space-between' }))(
        $text(style({ color: pallete.foreground }))('Realised Pnl'),
        $pnlValue(now(pos.realisedPnl))
      ),

    )
  )
}

interface ITraderDisplay {
  trader: viem.Address
  // changeSubscriptionList: Stream<IPuppetRouteTrades[]>
  subscriptionList: Stream<IPuppetRouteSubscritpion[]>
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

      // $trader,
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
          $target: $row(layoutSheet.spacing)(
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
