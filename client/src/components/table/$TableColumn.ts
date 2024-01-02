import { O, Tether } from "@aelea/core"
import { $text, INode, style } from "@aelea/dom"
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { map } from "@most/core"
import { Stream } from "@most/types"
import { TableColumn } from "gmx-middleware-ui-components"
import { IPriceOracleMap, getBasisPoints, readableDate, readablePercentage, timeSince } from "gmx-middleware-utils"
import { IMirrorPosition, IMirrorPositionOpen, IMirrorPositionSettled, getParticiapntMpPortion, latestPriceMap } from "puppet-middleware-utils"
import * as viem from 'viem'
import { $entry, $openPnl, $pnlValue, $puppets, $size, $sizeAndLiquidation } from "../../common/$common.js"
import { $txnIconLink } from "../../common/elements/$common.js"
import { $seperator2 } from "../../pages/common.js"


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
    const collateral = getParticiapntMpPortion(mp, mp.position.maxCollateralToken, puppet)

    // const collateralUsd = collateral * mp.position.

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

export const pnlSlotColumn = <T extends IMirrorPositionOpen>(puppet?: viem.Address): TableColumn<T> => ({
  $head: $tableHeader('PnL', 'ROI'),
  gridTemplate: '90px',
  columnOp: style({ placeContent: 'flex-end' }),
  $bodyCallback: map(pos => {
    const latestPrice = map(pm => pm[pos.position.indexToken].max, latestPriceMap)
    return $openPnl(latestPrice, pos, puppet)
  })
})

export const settledPnlColumn = (puppet?: viem.Address): TableColumn<IMirrorPositionSettled> => ({
  $head: $tableHeader('PnL $', 'ROI %'),
  gridTemplate: '90px',
  columnOp: style({ placeContent: 'flex-end' }),
  $bodyCallback: map(mp => {
    const pnl = getParticiapntMpPortion(mp, mp.position.realisedPnlUsd, puppet)
    const collateral = getParticiapntMpPortion(mp, mp.position.maxCollateralUsd, puppet)
      
    return $column(layoutSheet.spacingTiny, style({ textAlign: 'right' }))(
      $pnlValue(pnl),
      $seperator2,
      $text(style({ fontSize: '.85rem' }))(readablePercentage(getBasisPoints(pnl, collateral))),
    )
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
        $text(style({ fontSize: '.85rem' }))(timeSince(timestamp) + ' ago'),
        $txnIconLink(pos.transactionHash)
      )
    )
  })
}
