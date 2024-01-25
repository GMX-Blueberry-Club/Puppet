import { O, Tether } from "@aelea/core"
import { $text, INode, style } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { map } from "@most/core"
import { getTimeSince, readableDate } from "common-utils"
import { IMirrorPosition, IMirrorPositionOpen, IMirrorPositionSettled, getParticiapntMpPortion, latestPriceMap } from "puppet-middleware-utils"
import { TableColumn } from "ui-components"
import * as viem from 'viem'
import { arbitrum } from "viem/chains"
import { $entry, $positionPnl, $puppets, $size, $sizeAndLiquidation } from "../../common/$common.js"
import { $txnIconLink } from "../../common/elements/$common"


export const $tableHeader = (primaryLabel: string, secondaryLabel: string) => $column(style({ textAlign: 'right' }))(
  $text(primaryLabel),
  $text(style({ fontSize: '.85rem' }))(secondaryLabel)
)


export const slotSizeColumn = <T extends IMirrorPositionOpen>(puppet?: viem.Address): TableColumn<T> => ({
  $head: $tableHeader('Size', 'Leverage'),
  columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.2, placeContent: 'flex-end' })),
  $bodyCallback: map(mp => {
    const latestPrice = map(pm => pm[mp.position.indexToken].min, latestPriceMap)

    return $sizeAndLiquidation(mp, latestPrice, puppet)
  })
})

export const settledSizeColumn = (puppet?: viem.Address): TableColumn<IMirrorPosition> => ({
  $head: $tableHeader('Size', 'Leverage'),
  columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.2, placeContent: 'flex-end' })),
  $bodyCallback: map(mp => {
    const size = getParticiapntMpPortion(mp, mp.position.maxSizeUsd, puppet)
    const collateral = getParticiapntMpPortion(mp, mp.position.maxCollateralUsd, puppet)

    return $size(size, collateral)
  })
})




export const entryColumn: TableColumn<IMirrorPositionSettled | IMirrorPositionOpen> = {
  $head: $text('Entry'),
  $bodyCallback: map(pos => {
    return $entry(pos)
  })
}

export const puppetsColumn = <T extends {puppets: readonly `0x${string}`[]}>(click: Tether<INode, string>): TableColumn<T> => ({
  $head: $text('Puppets'),
  gridTemplate: '90px',
  $bodyCallback: map((pos) => {
    return $puppets(pos.puppets, click)
  })
})

export const pnlColumn = <T extends IMirrorPositionOpen>(puppet?: viem.Address): TableColumn<T> => ({
  $head: $tableHeader('PnL $', 'ROI'),
  gridTemplate: '90px',
  columnOp: style({ placeContent: 'flex-end' }),
  $bodyCallback: map(pos => {
    return $positionPnl(pos, puppet)
  })
})


export const positionTimeColumn: TableColumn<IMirrorPositionSettled | IMirrorPositionOpen>  = {
  $head: $text('Timestamp'),
  gridTemplate: 'minmax(110px, 120px)',
  $bodyCallback: map((pos) => {
    const timestamp = Number(pos.blockTimestamp)

    return $column(layoutSheet.spacingTiny)(
      $text(readableDate(timestamp)),
      $row(layoutSheet.spacingSmall)(
        $text(style({ fontSize: '.85rem' }))(getTimeSince(timestamp)),
        $txnIconLink(pos.transactionHash, arbitrum)
      )
    )
  })
}
