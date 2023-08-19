import { O, Op } from "@aelea/core"
import { $text, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { map, now } from "@most/core"
import { Stream } from "@most/types"
import { $Link, $infoTooltipLabel, TableColumn } from "gmx-middleware-ui-components"
import { readableDate, timeSince } from "gmx-middleware-utils"
import { IMirrorPositionListSummary, IPositionMirrorSettled, IPositionMirrorSlot, getParticiapntMpPortion } from "puppet-middleware-utils"
import * as viem from 'viem'
import { $profileDisplay } from "../$AccountProfile"
import { $entry, $openPositionPnlBreakdown, $pnlValue, $puppets, $size, $sizeAndLiquidation, $tradePnl } from "../../common/$common"
import { IGmxProcessState, latestTokenPrice } from "../../data/process/process"
import { $txnIconLink } from "../../elements/$common"
import { IProfileActiveTab } from "../../pages/$Profile"


export const slotSizeColumn = (processData: Stream<IGmxProcessState>, shareTarget?: viem.Address): TableColumn<IPositionMirrorSettled | IPositionMirrorSlot> => ({
  $head: $column(style({ textAlign: 'right' }))(
    $text('Size'),
    $text(style({ fontSize: '.85rem' }))('Leverage'),
  ),
  columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.2, placeContent: 'flex-end' })),
  $$body: map(mp => {
    const positionMarkPrice = latestTokenPrice(processData, now(mp.indexToken))
    const size = getParticiapntMpPortion(mp, mp.maxSize, shareTarget)
    const collateral = getParticiapntMpPortion(mp, mp.maxCollateral, shareTarget)

    return $sizeAndLiquidation(mp.isLong, size, collateral, mp.averagePrice, positionMarkPrice)
  })
})

export const settledSizeColumn = (processData: Stream<IGmxProcessState>, puppet?: viem.Address): TableColumn<IPositionMirrorSettled> => ({
  $head: $column(style({ textAlign: 'right' }))(
    $text('Size'),
    $text(style({ fontSize: '.85rem' }))('Leverage'),
  ),
  columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.2, placeContent: 'flex-end' })),
  $$body: map(mp => {
    const size = getParticiapntMpPortion(mp, mp.maxSize, puppet)
    const collateral = getParticiapntMpPortion(mp, mp.maxCollateral, puppet)

    return $size(size, collateral)
  })
})




export const entryColumn: TableColumn<IPositionMirrorSettled | IPositionMirrorSlot> = {
  $head: $text('Entry'),
  $$body: map((pos) => {
    return $entry(pos)
  })
}

export const puppetsColumn: TableColumn<IPositionMirrorSettled | IPositionMirrorSlot | IMirrorPositionListSummary> = {
  $head: $text('Puppets'),
  $$body: map((pos) => {
    // const positionMarkPrice = tradeReader.getLatestPrice(now(pos.indexToken))w
    // const cumulativeFee = tradeReader.vault.read('cumulativeFundingRates', pos.collateralToken)

    return $puppets(pos.puppets)
  })
}

export const pnlSlotColumn = (processData: Stream<IGmxProcessState>, puppet?: viem.Address): TableColumn<IPositionMirrorSlot> => ({
  $head: $text('PnL'),
  columnOp: style({ placeContent: 'flex-end' }),
  $$body: map((pos) => {
    const positionMarkPrice = latestTokenPrice(processData, now(pos.indexToken))
    const cumulativeFee = now(0n)

    return style({ flexDirection: 'row-reverse' })(
      $infoTooltipLabel(
        $openPositionPnlBreakdown(pos, cumulativeFee),
        $tradePnl(pos, positionMarkPrice)
      )
    )
  })
})

export const traderColumn = (click: Op<string, string>, route: router.Route): TableColumn<IMirrorPositionListSummary & { trader: viem.Address }> => ({
  $head: $text('Trader'),
  // gridTemplate: 'minmax(110px, 120px)',
  columnOp: style({ alignItems: 'center' }),
  $$body: map(pos => {

    return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
      // $alertTooltip($text(`This account requires GBC to receive the prize once competition ends`)),
      $Link({
        $content: $profileDisplay({
          address: pos.trader,
          // $profileContainer: $defaultBerry(style({ width: '50px' }))
        }),
        route: route.create({ fragment: 'baseRoute' }),
        url: `/app/profile/${pos.trader}/${IProfileActiveTab.TRADER.toLowerCase()}`
      })({ click: click }),
    )
  })
})

export const settledPnlColumn = (puppet?: viem.Address): TableColumn<IPositionMirrorSettled> => ({
  $head: $text('PnL'),
  columnOp: style({ placeContent: 'flex-end' }),
  $$body: map(mp => {
    const pnl = getParticiapntMpPortion(mp, mp.realisedPnl, puppet)
      
    return $pnlValue(pnl)
  })
})



export const positionTimeColumn: TableColumn<IPositionMirrorSettled | IPositionMirrorSlot>  = {
  $head: $text('Timestamp'),
  gridTemplate: 'minmax(110px, 120px)',
  $$body: map((pos) => {

    const timestamp = 'settlement' in pos ? pos.blockTimestamp : pos.blockTimestamp

    return $column(layoutSheet.spacingTiny)(
      $text(readableDate(timestamp)),
      $row(layoutSheet.spacingSmall)(
        $text(style({ fontSize: '.85rem' }))(timeSince(timestamp) + ' ago'),
        $txnIconLink(pos.transactionHash)
      )
    )
  })
}
