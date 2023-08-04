import { O } from "@aelea/core"
import { $text, style } from "@aelea/dom"
import { $column, layoutSheet } from "@aelea/ui-components"
import { empty, map, now } from "@most/core"
import { Stream } from "@most/types"
import { $infoTooltipLabel, TableColumn } from "gmx-middleware-ui-components"
import { readableDate, timeSince } from "gmx-middleware-utils"
import { IPositionMirrorSettled, IPositionMirrorSlot, getParticiapntMpPortion } from "puppet-middleware-utils"
import * as viem from 'viem'
import { $entry, $openPositionPnlBreakdown, $pnlValue, $puppets, $size, $sizeAndLiquidation, $tradePnl } from "../../common/$common"
import { IGmxProcessSeed, latestTokenPrice } from "../../data/process/process"


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
  columnOp: style({ maxWidth: '130px' }),
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
  columnOp: O(style({ maxWidth: '100px' }), layoutSheet.spacingTiny),
  $$body: map((pos) => {
    return $entry(pos.position)
  })
}

export const puppetsColumn: TableColumn<IPositionMirrorSettled | IPositionMirrorSlot> = {
  $head: $text('Puppets'),
  columnOp: O(layoutSheet.spacingTiny, style({ flex: 1 })),
  $$body: map((pos) => {
    // const positionMarkPrice = tradeReader.getLatestPrice(now(pos.indexToken))
    // const cumulativeFee = tradeReader.vault.read('cumulativeFundingRates', pos.collateralToken)

    return $puppets(pos.puppets, empty())
  })
}

export const pnlSlotColumn = (processData: Stream<IGmxProcessSeed>): TableColumn<IPositionMirrorSlot> => ({
  $head: $text('PnL'),
  columnOp: O(layoutSheet.spacingTiny, style({ flex: 1, placeContent: 'flex-end' })),
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

export const settledPnlColumn = (participant: viem.Address): TableColumn<IPositionMirrorSettled> => ({
  $head: $text('PnL'),
  columnOp: O(layoutSheet.spacingTiny, style({ flex: 1, placeContent: 'flex-end' })),
  $$body: map(mp => {
    const pnl = getParticiapntMpPortion(mp, mp.position.realisedPnl, participant)
      
    return $pnlValue(pnl)
  })
})



export const settledTimeColumn: TableColumn<IPositionMirrorSettled>  = {
  $head: $text('Open Time'),
  columnOp: style({ maxWidth: '130px' }),
  $$body: map((pos) => {

    const timestamp = pos.blockTimestamp

    return $column(layoutSheet.spacingTiny)(
      $text(readableDate(timestamp)),
      $text(style({ fontSize: '.85rem' }))(timeSince(timestamp) + ' ago'),
    )
  })
}
