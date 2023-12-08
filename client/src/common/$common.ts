import { Behavior, combineObject, isStream, O, Tether } from "@aelea/core"
import { $text, component, INode, nodeEvent, style, styleInline } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $icon, $row, $seperator, layoutSheet, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { empty, map, now, skipRepeats } from "@most/core"
import { Stream } from "@most/types"
import * as GMX from 'gmx-middleware-const'
import { TOKEN_SYMBOL } from "gmx-middleware-const"
import { $bear, $bull, $infoLabel, $infoTooltipLabel, $Link, $skull, $tokenIconMap } from "gmx-middleware-ui-components"
import {
  getBasisPoints,
  getRoughLiquidationPrice,
  getTokenDescription, getTokenUsd, IAbstractPositionParams, IMarketInfo, IOraclePrice,
  IPositionSettled,
  isPositionSettled, liquidationWeight,
  lst,
  readableFixedUSD30,
  readableLeverage,
  readablePercentage,
  readableTokenUsd,
  streamOf, switchMap, IMarket, IMarketCreatedEvent, ITradeRoute
} from "gmx-middleware-utils"
import { getMpSlotPnL, getParticiapntMpPortion, getPuppetSubscriptionKey, getRouteTypeKey, IPositionMirrorSlot, IPuppetSubscritpion, IPuppetSubscritpionParams } from "puppet-middleware-utils"
import * as viem from "viem"
import { $profileAvatar, $profileDisplay } from "../components/$AccountProfile.js"
import { $Popover } from "../components/$Popover.js"
import { $ButtonSecondary, $defaultMiniButtonSecondary } from "../components/form/$Button.js"
import { IGmxProcessState, latestTokenPrice } from "../data/process/process"
import { contractReader } from "../logic/common"
import { IProfileActiveTab } from "../pages/$Profile.js"
import { $seperator2 } from "../pages/common.js"
import { wallet } from "../wallet/walletLink.js"
import { $puppetLogo } from "./$icons.js"
import { $labeledDivider } from "./elements/$common"
import { $caretDown } from "./elements/$icons"
import { $RouteSubscriptionEditor } from "../components/route/$RouteSubscriptionEditor"


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

export const $entry = (isLong: boolean, indexToken: viem.Address, averagePrice: bigint) => {
  return $column(layoutSheet.spacingTiny, style({ alignItems: 'center', placeContent: 'center', fontSize: '.85rem' }))(
    $routeIntent(isLong, indexToken),
    $text(readableFixedUSD30(averagePrice))
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

export const $sizeAndLiquidation = (mp: IPositionMirrorSlot, markPrice: Stream<IOraclePrice>, account: viem.Address) => {
  const size = getParticiapntMpPortion(mp, mp.maxSizeUsd, account)
  const collateral = getParticiapntMpPortion(mp, mp.maxCollateralUsd, account)
  const update = lst(mp.updates)

  return $column(layoutSheet.spacingTiny, style({ alignItems: 'flex-end' }))(
    $text(readableFixedUSD30(size)),
    $liquidationSeparator(mp.isLong, update.sizeInUsd, update.sizeInTokens, update.collateralAmount, markPrice),
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

export const $openPnl = (processData: Stream<IGmxProcessState>, pos: IPositionMirrorSlot, account: viem.Address) => {
  const positionMarkPrice = latestTokenPrice(processData, pos.indexToken)

  return $column(layoutSheet.spacingTiny, style({ textAlign: 'right' }))(
    style({ flexDirection: 'row-reverse' })(
      $infoTooltipLabel(
        $positionSlotPnl(pos, positionMarkPrice, account),
        $positionSlotPnl(pos, positionMarkPrice, account),
      )
    ),
    $seperator2,
    style({ fontSize: '.85rem' })($positionSlotRoi(pos, positionMarkPrice, account)),
  )
}

export const $stake = (processData: Stream<IGmxProcessState>, pos: IPositionMirrorSlot, account: viem.Address) => {
  const positionMarkPrice = latestTokenPrice(processData, pos.indexToken)
  const cumulativeTokenFundingRates = contractReader(GMX.CONTRACT['42161'].Vault)('cumulativeFundingRates', pos.collateralToken)


  return $column(layoutSheet.spacingTiny, style({ textAlign: 'right' }))(
    style({ flexDirection: 'row-reverse' })(
      $infoTooltipLabel(
        $openPositionPnlBreakdown(pos, ff),
        $positionSlotPnl(pos, positionMarkPrice, account)
      )
    ),
    $seperator2,
    style({ fontSize: '.85rem' })($positionSlotRoi(pos, positionMarkPrice, account)),
  )
}

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

export const $positionSlotPnl = (mp: IPositionMirrorSlot, positionMarkPrice: Stream<IOraclePrice> | bigint, account: viem.Address) => {
  const value = isStream(positionMarkPrice)
    ? map((price) => {
      const pnl = getMpSlotPnL(mp, price, account)
      return mp.realisedPnl + pnl - mp.cumulativeFee
    }, positionMarkPrice)
    : positionMarkPrice

  return $pnlValue(value)
}

export const $positionSlotRoi = (pos: IPositionMirrorSlot, positionMarkPrice: Stream<IOraclePrice> | IOraclePrice, account: viem.Address) => {
  const roi = map(markPrice => {
    const delta = getMpSlotPnL(pos, markPrice, account)
    return readablePercentage(getBasisPoints(pos.realisedPnl + delta - pos.cumulativeFee, pos.maxCollateralUsd))
  }, streamOf(positionMarkPrice))

  return $text(roi)
}

export function $liquidationSeparator(isLong: boolean, sizeUsd: bigint, sizeInTokens: bigint, collateralAmount: bigint, markPrice: Stream<IOraclePrice>) {
  const liqWeight = map(price => {
    const collateralUsd = getTokenUsd(price.max, collateralAmount)
    const liquidationPrice = getRoughLiquidationPrice(isLong, sizeUsd, sizeInTokens, collateralUsd, collateralAmount)

    return liquidationWeight(isLong, liquidationPrice, price)
  }, markPrice)

  return styleInline(map((weight) => {
    return { width: '100%', background: `linear-gradient(90deg, ${pallete.negative} ${`${weight * 100}%`}, ${pallete.foreground} 0)` }
  }, liqWeight))(
    $seperator
  )
}

export const $openPositionPnlBreakdown = (pos: IPositionMirrorSlot, marketInfo: IMarketInfo) => {
  // const pendingFundingFee = getFundingFee(pos.entryFundingRate, cumulativeTokenFundingRates, pos.size)
  // const totalMarginFee = getMarginFees(pos.cumulativeSize)

  const update = lst(pos.updates)
  
  return $column(layoutSheet.spacing, style({ minWidth: '250px' }))(
    $row(style({ placeContent: 'space-between' }))(
      $text('Net breakdown'),

      $row(layoutSheet.spacingTiny)(
        $text(style({ color: pallete.foreground, flex: 1 }))('Collateral'),
        $text(readableTokenUsd(update["collateralTokenPrice.max"], update.collateralAmount))
      ),
    ),
    $column(layoutSheet.spacingSmall)(
      
      // $row(style({ placeContent: 'space-between' }))(
      //   $text(style({ color: pallete.foreground }))('Margin Fee'),
      //   $pnlValue(-totalMarginFee)
      // ),
      // $row(style({ placeContent: 'space-between' }))(
      //   $text(style({ color: pallete.foreground }))('Borrow Fee'),
      //   $pnlValue(
      //     -(pendingFundingFee + pos.cumulativeFee - totalMarginFee)
      //   )
      // ),
      $labeledDivider('Realised'),
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
        $text(style({ color: pallete.foreground }))('PnL'),
        $pnlValue(now(pos.realisedPnl))
      ),

    )
  )
}

interface ITraderDisplay {
  trader: viem.Address
  route: router.Route
}

interface ITraderRouteDisplay {
  trader: viem.Address
  routeTypeKey: viem.Hex
  subscriptionList: Stream<IPuppetSubscritpion[]>
  positionParams: IAbstractPositionParams
}



export const $TraderDisplay =  (config: ITraderDisplay) => component((
  [clickTrader, clickTraderTether]: Behavior<any, viem.Address>,
  [popRouteSubscriptionEditor, popRouteSubscriptionEditorTether]: Behavior<any, IPuppetSubscritpionParams>,
  [modifySubscribeList, modifySubscribeListTether]: Behavior<IPuppetSubscritpionParams>,
) => {



  return [
    $Link({
      $content: $profileDisplay({
        address: config.trader,
      // $profileContainer: $defaultBerry(style({ width: '50px' }))
      }),
      route: config.route.create({ fragment: 'baseRoute' }),
      url: `/app/profile/${config.trader}/${IProfileActiveTab.TRADER.toLowerCase()}`
    })({ click: clickTraderTether() }),


    { modifySubscribeList, clickTrader }
  ]
})

export const $TraderRouteDisplay =  (config: ITraderRouteDisplay) => component((
  [clickTrader, clickTraderTether]: Behavior<any, viem.Address>,
  [popRouteSubscriptionEditor, popRouteSubscriptionEditorTether]: Behavior<any, IPuppetSubscritpionParams>,
  [modifySubscribeList, modifySubscribeListTether]: Behavior<IPuppetSubscritpionParams>,
) => {

  // const { marketList } = config




  return [
    $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
      switchMap(params => {
        const w3p = params.wallet
        const account = w3p?.account.address || GMX.ADDRESS_ZERO

        const routeTypeKey = getRouteTypeKey(GMX.ARBITRUM_ADDRESS.NATIVE_TOKEN, GMX.ARBITRUM_ADDRESS.NATIVE_TOKEN, true, '0x')
        const puppetSubscriptionKey = getPuppetSubscriptionKey(account, config.trader, routeTypeKey)
        const existingSubscription = params.subscriptionList.find(x => x.puppetSubscriptionKey === puppetSubscriptionKey)
        const routeSubscription: IPuppetSubscritpion = {
          routeTypeKey: config.routeTypeKey,
          trader: config.trader,
          puppet: account,
          allowance: existingSubscription?.allowance || 0n,
          subscriptionExpiry: existingSubscription?.subscriptionExpiry || 0n,
          puppetSubscriptionKey,
          subscribe: existingSubscription?.subscribe || false
        }


        return $Popover({
          open: popRouteSubscriptionEditor,
          dismiss: modifySubscribeList,
          $target: $row(layoutSheet.spacing)(
            $ButtonSecondary({
              $content: $row(layoutSheet.spacingTiny, style({ alignItems: 'center' }))(
                $route(config.positionParams, screenUtils.isDesktopScreen),
                // $icon({ $content: $puppetLogo, fill: pallete.message, width: '24px', viewBox: `0 0 32 32` }),
                $icon({ $content: $caretDown, width: '14px', svgOps: style({ marginRight: '-4px' }), viewBox: '0 0 32 32' }),
              ),
              $container: $defaultMiniButtonSecondary(style({ borderRadius: '16px' })) 
            })({
              click: popRouteSubscriptionEditorTether()
            }),
          ),
          $content: $RouteSubscriptionEditor({ routeSubscription })({
            modifySubscribeList: modifySubscribeListTether()
          })
        })({})
      }, combineObject({ subscriptionList: config.subscriptionList, wallet }))
    ),


    { modifySubscribeList, clickTrader }
  ]
})
