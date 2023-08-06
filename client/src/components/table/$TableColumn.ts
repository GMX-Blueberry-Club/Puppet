import { O, Op } from "@aelea/core"
import { $text, style } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { empty, map, now } from "@most/core"
import { Stream } from "@most/types"
import { $Link, $infoTooltipLabel, $txHashRef, TableColumn } from "gmx-middleware-ui-components"
import { readableDate, timeSince } from "gmx-middleware-utils"
import { IMirrorTraderSummary, IPositionMirrorSettled, IPositionMirrorSlot, getParticiapntMpPortion } from "puppet-middleware-utils"
import * as viem from 'viem'
import { $entry, $openPositionPnlBreakdown, $pnlValue, $puppets, $size, $sizeAndLiquidation, $tradePnl } from "../../common/$common"
import { IGmxProcessSeed, latestTokenPrice } from "../../data/process/process"
import { $txnIconLink } from "../../elements/$common"
import { $discoverIdentityDisplay } from "../$AccountProfile"
import { $defaultBerry } from "../$DisplayBerry"
import { IProfileActiveTab } from "../../pages/$Profile"
import * as router from '@aelea/router'


export const slotSizeColumn = (processData: Stream<IGmxProcessSeed>, shareTarget?: viem.Address): TableColumn<IPositionMirrorSettled | IPositionMirrorSlot> => ({
  $head: $column(style({ textAlign: 'right' }))(
    $text('Size'),
    $text(style({ fontSize: '.85rem' }))('Leverage'),
  ),
  columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.2, placeContent: 'flex-end' })),
  $$body: map(mp => {
    const positionMarkPrice = latestTokenPrice(processData, now(mp.position.indexToken))
    const size = getParticiapntMpPortion(mp, mp.position.maxSize, shareTarget)
    const collateral = getParticiapntMpPortion(mp, mp.position.maxCollateral, shareTarget)

    return $sizeAndLiquidation(mp.position.isLong, size, collateral, mp.position.averagePrice, positionMarkPrice)
  })
})

export const settledSizeColumn = (processData: Stream<IGmxProcessSeed>, puppet?: viem.Address): TableColumn<IPositionMirrorSettled> => ({
  $head: $column(style({ textAlign: 'right' }))(
    $text('Size'),
    $text(style({ fontSize: '.85rem' }))('Leverage'),
  ),
  columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.2, placeContent: 'flex-end' })),
  $$body: map(mp => {
    const size = getParticiapntMpPortion(mp, mp.position.maxSize, puppet)
    const collateral = getParticiapntMpPortion(mp, mp.position.maxCollateral, puppet)

    return $size(size, collateral)
  })
})


export const timeSlotColumn: TableColumn<IPositionMirrorSlot> = {
  $head: $text('Settle Time'),
  gridTemplate: 'minmax(110px, 150px)',
  $$body: map((pos) => {

    const timestamp = pos.blockTimestamp

    return $column(layoutSheet.spacingTiny)(
      $text(readableDate(timestamp)),
      $text(style({ fontSize: '.85rem' }))(timeSince(timestamp) + ' ago'),
    )
  })
}

export const entryColumn: TableColumn<IPositionMirrorSettled | IPositionMirrorSlot> = {
  $head: $text('Entry'),
  $$body: map((pos) => {
    return $entry(pos.position)
  })
}

export const puppetsColumn: TableColumn<IPositionMirrorSettled | IPositionMirrorSlot> = {
  $head: $text('Puppets'),
  $$body: map((pos) => {
    // const positionMarkPrice = tradeReader.getLatestPrice(now(pos.indexToken))
    // const cumulativeFee = tradeReader.vault.read('cumulativeFundingRates', pos.collateralToken)

    return $puppets(pos.puppets, empty())
  })
}

export const pnlSlotColumn = (processData: Stream<IGmxProcessSeed>, puppet?: viem.Address): TableColumn<IPositionMirrorSlot> => ({
  $head: $text('PnL'),
  columnOp: style({ placeContent: 'flex-end' }),
  $$body: map((pos) => {
    const positionMarkPrice = latestTokenPrice(processData, now(pos.position.indexToken))
    const cumulativeFee = now(0n)

    return style({ flexDirection: 'row-reverse' })(
      $infoTooltipLabel(
        $openPositionPnlBreakdown(pos.position, cumulativeFee),
        $tradePnl(pos.position, positionMarkPrice)
      )
    )
  })
})

export const traderColumn = (click: Op<string, string>, route: router.Route): TableColumn<IMirrorTraderSummary> => ({
  $head: $text('Trader'),
  gridTemplate: 'minmax(110px, 120px)',
  columnOp: style({ minWidth: '120px', flex: 2, alignItems: 'center' }),
  $$body: map(pos => {

    return $row(layoutSheet.spacingSmall, style({ alignItems: 'center' }))(
      // $alertTooltip($text(`This account requires GBC to receive the prize once competition ends`)),
      $Link({
        $content: $discoverIdentityDisplay({
          address: pos.account,
          $profileContainer: $defaultBerry(style({ width: '50px' }))
        }),
        route: route.create({ fragment: 'baseRoute' }),
        url: `/app/profile/${pos.account}/${IProfileActiveTab.TRADER.toLowerCase()}`
      })({ click: click }),
    )
  })
})

export const settledPnlColumn = (puppet?: viem.Address): TableColumn<IPositionMirrorSettled> => ({
  $head: $text('PnL'),
  columnOp: style({ placeContent: 'flex-end' }),
  $$body: map(mp => {
    const pnl = getParticiapntMpPortion(mp, mp.position.realisedPnl, puppet)
      
    return $pnlValue(pnl)
  })
})



export const settledTimeColumn: TableColumn<IPositionMirrorSettled>  = {
  $head: $text('Open Time'),
  gridTemplate: 'minmax(110px, 150px)',
  $$body: map((pos) => {

    const timestamp = pos.blockTimestamp

    return $column(layoutSheet.spacingTiny)(
      $text(readableDate(timestamp)),
      $row(layoutSheet.spacingSmall)(
        $text(style({ fontSize: '.85rem' }))(timeSince(timestamp) + ' ago'),
        $txnIconLink(pos.transactionHash)
      )
    )
  })
}
