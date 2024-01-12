import { Behavior, isStream, O, Tether } from "@aelea/core"
import { $text, component, INode, nodeEvent, style, styleInline } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $icon, $row, $seperator, layoutSheet, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { constant, empty, map, now, skipRepeats } from "@most/core"
import { Stream } from "@most/types"
import { TOKEN_SYMBOL } from "gmx-middleware-const"
import { $bear, $bull, $infoLabel, $infoTooltipLabel, $Link, $tokenIconMap } from "gmx-middleware-ui-components"
import {
  getBasisPoints,
  getEntryPrice,
  getRoughLiquidationPrice,
  getTokenDescription, getTokenUsd, IAbstractPositionParams,
  IOraclePrice,
  liquidationWeight,
  lst,
  readableFixedUSD30,
  readableLeverage,
  readablePercentage,
  streamOf, switchMap, unixTimestampNow
} from "gmx-middleware-utils"
import * as PUPPET from "puppet-middleware-const"
import { getMpSlotPnL, getParticiapntMpPortion, IMirrorPosition, IMirrorPositionListSummary, IMirrorPositionOpen, IPuppetSubscritpionParams } from "puppet-middleware-utils"
import * as viem from "viem"
import { arbitrum } from "viem/chains"
import { $profileAvatar, $profileDisplay } from "../components/$AccountProfile.js"
import { $Popover } from "../components/$Popover.js"
import { $ButtonSecondary, $defaultMiniButtonSecondary } from "../components/form/$Button.js"
import { $RouteSubscriptionEditor, IChangeSubscription } from "../components/portfolio/$RouteSubscriptionEditor.js"
import { contractReader } from "../logic/common"
import { getPuppetSubscriptionExpiry } from "../logic/puppetLogic.js"
import { IProfileActiveTab } from "../pages/$PublicProfile.js"
import { $seperator2 } from "../pages/common.js"
import { $caretDown } from "./elements/$icons"
import { wallet } from "../wallet/walletLink"
import { $puppetLogo } from "./$icons"


export const $midContainer = $column(
  style({
    margin: '0 auto',
    maxWidth: '980px', padding: '0px 12px 26px',
    gap: screenUtils.isDesktopScreen ? '50px' : '50px',
    width: '100%',
  })
)


export const $size = (size: bigint, collateral: bigint, $divider = $seperator2) => {
  return $column(layoutSheet.spacingTiny, style({ textAlign: 'right' }))(
    $text(readableFixedUSD30(size)),   
    $divider,
    $leverage(size, collateral),
  )
}

export const $routeIntent = (isLong: boolean, indexToken: viem.Address) => {
  return $row(style({ alignItems: 'center' }))(
    $icon({
      svgOps: style({ borderRadius: '50%', padding: '4px', marginRight: '-6px', zIndex: 0, alignItems: 'center', fill: pallete.message, backgroundColor: pallete.horizon }),
      $content: isLong ? $bull : $bear,
      viewBox: '0 0 32 32',
      width: '26px'
    }),
    $tokenIcon(indexToken, { width: '28px' }),
  )
}

export const $entry = (mp: IMirrorPosition) => {
  return $column(layoutSheet.spacingTiny, style({ alignItems: 'center', placeContent: 'center', fontSize: '.85rem' }))(
    $routeIntent(mp.position.isLong, mp.position.indexToken),
    $text(readableFixedUSD30(getEntryPrice(mp.position.sizeInUsd, mp.position.sizeInTokens, mp.position.indexToken))),
  )
}

export const $route = (pos: IAbstractPositionParams, displayLabel = true) => {
  const indexDescription = getTokenDescription(pos.indexToken)
  const collateralDescription = getTokenDescription(pos.collateralToken)
  
  return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
    $icon({
      svgOps: style({ borderRadius: '50%', padding: '4px', marginRight: '-20px', zIndex: 0, alignItems: 'center', fill: pallete.message, backgroundColor: pallete.horizon }),
      $content: pos.isLong ? $bull : $bear,
      viewBox: '0 0 32 32',
      width: '24px'
    }),
    $tokenIcon(pos.indexToken, { width: '36px' }),
    displayLabel
      ? $column(layoutSheet.spacingTiny)(
        $text(style({ fontSize: '1rem' }))(`${indexDescription.symbol}`),
        $infoLabel($text(style({ fontSize: '.85rem' }))((pos.isLong ? 'Long' : 'Short'))),
      )
      : empty(),
  )
}

// export const $settledSizeDisplay = (pos: IPositionSettled) => {
//   const indexToken = getMappedValue(GMX.MARKET_INDEX_TOKEN_MAP, mp.position.market)

//   return $column(layoutSheet.spacingTiny, style({ textAlign: 'right' }))(
//     $text(readableFixedUSD30(pos.maxSizeUsd)),
//     $seperator2,
//     $row(layoutSheet.spacingSmall, style({ fontSize: '.85rem', placeContent: 'center' }))(
//       $leverage(pos.maxSizeUsd, pos.maxCollateralUsd),
//       $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
//         $icon({
//           fill: isPositionSettled(pos) ? pallete.negative : undefined,
//           $content: $skull,
//           viewBox: '0 0 32 32',
//           width: '12px'
//         }),
//         $text(readableFixedUSD30(pos.averagePrice)),
//       ),
//     )
//   )
// }



export const $tokenIcon = (indexToken: viem.Address, IIcon: { width: string } = { width: '24px' }) => {
  const tokenDesc = getTokenDescription(indexToken)
  const $token = $tokenIconMap[tokenDesc.symbol] || $tokenIconMap[TOKEN_SYMBOL.GMX]

  if (!$token) {
    throw new Error('Unable to find matched token')
  }

  return $icon({
    $content: $token,
    svgOps: style({ fill: pallete.message }),
    viewBox: '0 0 32 32',
    width: IIcon.width
  })
}

export const $sizeAndLiquidation = (mp: IMirrorPositionOpen, markPrice: Stream<bigint>, puppet?: viem.Address) => {
  const sizeInUsd = getParticiapntMpPortion(mp, mp.position.sizeInUsd, puppet)
  const collateralInToken = getParticiapntMpPortion(mp, mp.position.collateralAmount, puppet)
  const collateralUsd = getTokenUsd(mp.position.link.increaseList[0].collateralTokenPriceMin, collateralInToken)

  return $column(layoutSheet.spacingTiny, style({ alignItems: 'flex-end' }))(
    $text(readableFixedUSD30(sizeInUsd)),
    $liquidationSeparator(mp.position.isLong, mp.position.sizeInUsd, mp.position.sizeInTokens, mp.position.collateralAmount, markPrice),
    $leverage(sizeInUsd, collateralUsd),
  )
}


export const $puppets = (
  puppets: readonly viem.Address[],
  click?: Tether<INode, string>
) => {

  // const positionMarkPrice = tradeReader.getLatestPrice(now(pos.indexToken))
  // const cumulativeFee = tradeReader.vault.read('cumulativeFundingRates', pos.collateralToken)

  if (puppets.length === 0) {
    return $text(style({ fontSize: '0.85rem', color: pallete.foreground }))('-')
  }
                
  return $row(style({ cursor: 'pointer' }))(
    ...puppets.map(address => {
      if (!click) {
        return style({ marginRight: '-12px', border: '2px solid black' })(
          $profileAvatar({ address, profileSize: 25 })
        )
      }

      
      return click(nodeEvent('click'), map(() => {
        const url = `/app/profile/puppet/${address}`

        history.pushState({}, '', url)
        return url
      }))(
        style({ marginRight: '-12px', border: '2px solid black' })(
          $profileAvatar({ address, profileSize: 25 })
        )
      )
    }),
    // $content
  )
}

export const $openPnl = (latestPrice: Stream<bigint>, mp: IMirrorPositionOpen, account?: viem.Address) => {
  return $column(layoutSheet.spacingTiny, style({ textAlign: 'right' }))(
    style({ flexDirection: 'row-reverse' })(
      $infoTooltipLabel(
        $positionSlotPnl(mp, latestPrice, account),
        $positionSlotPnl(mp, latestPrice, account),
      )
    ),
    $seperator2,
    style({ fontSize: '.85rem' })($positionSlotRoi(mp, latestPrice, account)),
  )
}

// export const $stake = (processData: Stream<IGmxProcessState>, pos: IPositionMirrorOpen, account: viem.Address) => {
//   // const cumulativeTokenFundingRates = contractReader(GMX.CONTRACT['42161'].Vault)('cumulativeFundingRates', pos.collateralToken)


//   return $column(layoutSheet.spacingTiny, style({ textAlign: 'right' }))(
//     style({ flexDirection: 'row-reverse' })(
//       $infoTooltipLabel(
//         $openPositionPnlBreakdown(pos, ff),
//         $positionSlotPnl(pos, positionMarkPrice, account)
//       )
//     ),
//     $seperator2,
//     style({ fontSize: '.85rem' })($positionSlotRoi(pos, positionMarkPrice, account)),
//   )
// }

export const $leverage = (size: bigint, collateral: bigint) => {
  return $text(style({ fontWeight: 'bold', letterSpacing: '0.05em', fontSize: '0.85rem' }))(readableLeverage(size, collateral))
}

export const $pnlValue = (pnl: Stream<bigint> | bigint, colorful = true) => {
  const pnls = isStream(pnl) ? pnl : now(pnl)
  const display = map(value => {
    return readableFixedUSD30(value)
  }, pnls)
  const displayColor = skipRepeats(map(value => {
    return value > 0n
      ? pallete.positive : value === 0n
        ? '' : pallete.negative
  }, pnls))

  const colorStyle = colorful
    ? styleInline(map(color => {
      return { color }
    }, displayColor))
    : O()

  // @ts-ignore
  return $text(colorStyle, style({ fontWeight: 'bold' }))(display)
}

export const $PnlPercentageValue = (pnl: Stream<bigint> | bigint, collateral: bigint, colorful = true) => {
  return $column(
    $pnlValue(pnl, colorful),
    $seperator2,
    $pnlValue(pnl, colorful),
  )
}

export const $positionSlotPnl = (mp: IMirrorPositionOpen, positionMarkPrice: Stream<bigint> | IOraclePrice, account?: viem.Address) => {
  const value = isStream(positionMarkPrice)
    ? map((price) => {
      const pnl = getMpSlotPnL(mp, price, account)
      return mp.position.realisedPnlUsd + pnl // - mp.position.cumulativeFee
    }, positionMarkPrice)
    : positionMarkPrice.min

  return $pnlValue(value)
}

export const $positionSlotRoi = (pos: IMirrorPositionOpen, positionMarkPrice: bigint | Stream<bigint>, account?: viem.Address) => {
  const lstIncrease = lst(pos.position.link.increaseList)
  const collateralUsd = getTokenUsd(lstIncrease.collateralTokenPriceMin, pos.position.maxCollateralToken)
    
  const roi = map(markPrice => {
    const delta = getMpSlotPnL(pos, markPrice, account)
    return readablePercentage(getBasisPoints(pos.position.realisedPnlUsd + delta, collateralUsd))
  }, streamOf(positionMarkPrice))
  return $text(roi)
}

export function $liquidationSeparator(isLong: boolean, sizeUsd: bigint, sizeInTokens: bigint, collateralAmount: bigint, markPrice: Stream<bigint>) {
  const liqWeight = map(price => {
    const collateralUsd = getTokenUsd(price, collateralAmount)
    const liquidationPrice = getRoughLiquidationPrice(isLong, sizeUsd, sizeInTokens, collateralUsd, collateralAmount)

    return liquidationWeight(isLong, liquidationPrice, price)
  }, markPrice)

  return styleInline(map((weight) => {
    return { width: '100%', background: `linear-gradient(90deg, ${pallete.negative} ${`${weight * 100}%`}, ${pallete.foreground} 0)` }
  }, liqWeight))(
    $seperator
  )
}

// export const $openPositionPnlBreakdown = (mp: IPositionMirrorOpen, marketInfo: IMarketInfo) => {
//   // const pendingFundingFee = getFundingFee(pos.entryFundingRate, cumulativeTokenFundingRates, pos.size)
//   // const totalMarginFee = getMarginFees(pos.cumulativeSize)

//   const update = lst(mp.updates)
  
//   return $column(layoutSheet.spacing, style({ minWidth: '250px' }))(
//     $row(style({ placeContent: 'space-between' }))(
//       $text('Net breakdown'),

//       $row(layoutSheet.spacingTiny)(
//         $text(style({ color: pallete.foreground, flex: 1 }))('Collateral'),
//         $text(readableTokenUsd(update["collateralTokenPrice.max"], update.collateralAmount))
//       ),
//     ),
//     $column(layoutSheet.spacingSmall)(
      
//       // $row(style({ placeContent: 'space-between' }))(
//       //   $text(style({ color: pallete.foreground }))('Margin Fee'),
//       //   $pnlValue(-totalMarginFee)
//       // ),
//       // $row(style({ placeContent: 'space-between' }))(
//       //   $text(style({ color: pallete.foreground }))('Borrow Fee'),
//       //   $pnlValue(
//       //     -(pendingFundingFee + pos.cumulativeFee - totalMarginFee)
//       //   )
//       // ),
//       $labeledDivider('Realised'),
//       // $row(layoutSheet.spacingTiny)(
//       //   $text(style({ color: pallete.foreground, flex: 1 }))('Total Fees'),
//       //   $pnlValue(
//       //     map(cumFee => {
//       //       const fstUpdate = pos.link.updateList[0]
//       //       const entryFundingRate = fstUpdate.entryFundingRate

//       //       const fee = getFundingFee(entryFundingRate, cumFee, pos.size) + pos.cumulativeFee

//       //       return -fee
//       //     }, cumulativeTokenFundingRates)
//       //   )
//       // ),
//       $row(style({ placeContent: 'space-between' }))(
//         $text(style({ color: pallete.foreground }))('PnL'),
//         $pnlValue(now(mp.realisedPnl))
//       ),

//     )
//   )
// }

interface ITraderDisplay {
  trader: viem.Address
  route: router.Route
}

interface ITraderRouteDisplay {
  trader: viem.Address
  routeTypeKey: viem.Hex
  tradeRoute: viem.Hex
  summary: IMirrorPositionListSummary
  // routeKey: viem.Address
  // subscriptionList: Stream<IPuppetSubscritpion[]>
  positionParams: IAbstractPositionParams
}



export const $TraderDisplay =  (config: ITraderDisplay) => component((
  [clickTrader, clickTraderTether]: Behavior<any, viem.Address>,
  [modifySubscribeList, modifySubscribeListTether]: Behavior<IChangeSubscription>,
) => {

  return [
    $Link({
      $content: $profileDisplay({
        address: config.trader,
      // $profileContainer: $defaultBerry(style({ width: '50px' }))
      }),
      route: config.route.create({ fragment: 'baseRoute' }),
      url: `/app/profile/${IProfileActiveTab.TRADER.toLowerCase()}/${config.trader}`
    })({ click: clickTraderTether() }),


    { modifySubscribeList, clickTrader }
  ]
})

export const $TraderRouteDisplay =  (config: ITraderRouteDisplay) => component((
  [popRouteSubscriptionEditor, popRouteSubscriptionEditorTether]: Behavior<any, bigint>,
  [modifySubscribeList, modifySubscribeListTether]: Behavior<IChangeSubscription>,
) => {

  const puppetSubscriptionExpiry = switchMap(w3p => {
    return w3p
      ? getPuppetSubscriptionExpiry(w3p.account.address, config.positionParams.collateralToken, config.positionParams.indexToken, config.positionParams.isLong)
      : now(0n)
  }, wallet)

  return [
    $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
      $Popover({
        open: map((expiry) => {
          return  $RouteSubscriptionEditor({ expiry, trader: config.trader, tradeRoute: config.tradeRoute, routeTypeKey: config.routeTypeKey })({
            modifySubscribeList: modifySubscribeListTether()
          }) 
        }, popRouteSubscriptionEditor),
        dismiss: modifySubscribeList,
        $target: switchMap(expiry => {
          return $ButtonSecondary({
            $content: $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
              $route(config.positionParams, false),
              $puppets(config.summary.puppets),
              $icon({ $content: $puppetLogo, width: '26px', svgOps: style({ backgroundColor: pallete.background, borderRadius: '50%', padding: '4px', border: `1px solid ${pallete.message}`, marginRight: '-18px' }), viewBox: '0 0 32 32' }),
            ),
            $container: $defaultMiniButtonSecondary(style({ borderRadius: '16px', padding: '6px 2px', borderColor: Number(expiry) > unixTimestampNow() ? pallete.primary : '' })) 
          })({
            click: popRouteSubscriptionEditorTether(constant(expiry))
          })
        }, puppetSubscriptionExpiry)
      })({})
    ),


    { modifySubscribeList }
  ]
})
