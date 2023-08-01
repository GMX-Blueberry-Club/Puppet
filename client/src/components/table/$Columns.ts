import { O } from "@aelea/core"
import { style, $text } from "@aelea/dom"
import { $column, layoutSheet } from "@aelea/ui-components"
import { empty, map, now } from "@most/core"
import { $infoTooltipLabel, TableColumn } from "gmx-middleware-ui-components"
import { IPositionMirrorSettled, IPositionMirrorSlot } from "puppet-middleware-utils"
import { $entry, $openPositionPnlBreakdown, $pnlValue, $puppets, $riskLiquidatorShare, $tradePnl } from "../../common/$common"
import { IGmxProcessSeed, latestTokenPrice } from "../../data/process/process"
import { readableDate, timeSince } from "gmx-middleware-utils"
import { Stream } from "@most/types"


export const sizeColumn = (processData: Stream<IGmxProcessSeed>): TableColumn<IPositionMirrorSettled | IPositionMirrorSlot> => ({
  $head: $column(style({ textAlign: 'right' }))(
    $text('Size'),
    $text(style({ fontSize: '.85rem' }))('Leverage'),
  ),
  columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.2, placeContent: 'flex-end' })),
  $$body: map(pos => {
    const positionMarkPrice = latestTokenPrice(processData, now(pos.position.indexToken))

    return $riskLiquidatorShare(pos, pos.traderShare, positionMarkPrice)
  })
})


export const slotTimeColumn: TableColumn<IPositionMirrorSlot> = {
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

export const slotPnlColumn = (processData: Stream<IGmxProcessSeed>): TableColumn<IPositionMirrorSlot> => ({
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

export const pnlColumn: TableColumn<IPositionMirrorSettled> = {
  $head: $text('PnL'),
  columnOp: O(layoutSheet.spacingTiny, style({ flex: 1, placeContent: 'flex-end' })),
  $$body: map((pos) => {
    return $pnlValue(pos.position.realisedPnl - pos.position.cumulativeFee)
  })
}

export const settledTimeColumn: TableColumn<IPositionMirrorSettled> = {
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
