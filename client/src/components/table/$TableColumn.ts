import { O, Op, Tether } from "@aelea/core"
import { $text, INode, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { map, now } from "@most/core"
import { Stream } from "@most/types"
import * as GMX from 'gmx-middleware-const'
import { $Link, $infoTooltipLabel, TableColumn } from "gmx-middleware-ui-components"
import { getBasisPoints, readableDate, readablePercentage, switchMap, timeSince } from "gmx-middleware-utils"
import { IMirrorPositionListSummary, IPositionMirrorSettled, IPositionMirrorSlot, getParticiapntMpPortion } from "puppet-middleware-utils"
import * as viem from 'viem'
import { $profileDisplay } from "../$AccountProfile.js"
import { $entry, $openPnl, $openPositionPnlBreakdown, $pnlValue, $positionSlotPnl, $positionSlotRoi, $puppets, $size, $sizeAndLiquidation } from "../../common/$common.js"
import { IGmxProcessState, latestTokenPrice } from "../../data/process/process.js"
import { $txnIconLink } from "../../elements/$common.js"
import { contractReader } from "../../logic/common.js"
import { IProfileActiveTab } from "../../pages/$Profile.js"
import { $seperator2 } from "../../pages/common.js"


const $tableHeader = (primaryLabel: string, secondaryLabel: string) => $column(style({ textAlign: 'right' }))(
  $text(primaryLabel),
  $text(style({ fontSize: '.85rem' }))(secondaryLabel)
)


export const slotSizeColumn = <T extends IPositionMirrorSlot>(processData: Stream<IGmxProcessState>, shareTarget?: viem.Address): TableColumn<T> => ({
  $head: $tableHeader('Size', 'Leverage'),
  columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.2, placeContent: 'flex-end' })),
  $$body: map(mp => {
    const positionMarkPrice = latestTokenPrice(processData, mp.indexToken)
    return $sizeAndLiquidation(mp, positionMarkPrice, shareTarget)
  })
})

export const settledSizeColumn = (shareTarget?: viem.Address): TableColumn<IPositionMirrorSettled> => ({
  $head: $tableHeader('Size', 'Leverage'),
  columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.2, placeContent: 'flex-end' })),
  $$body: map(mp => {
    const size = getParticiapntMpPortion(mp, mp.maxSizeUsd, shareTarget)
    const collateral = getParticiapntMpPortion(mp, mp.maxCollateralUsd, shareTarget)

    return $size(size, collateral)
  })
})




export const entryColumn: TableColumn<IPositionMirrorSettled | IPositionMirrorSlot> = {
  $head: $text('Entry'),
  $$body: map((pos) => {
    return $entry(pos.isLong, pos.indexToken, pos.averagePrice)
  })
}

export const puppetsColumn = <T extends {puppets: readonly `0x${string}`[]}>(click: Tether<INode, string>): TableColumn<T> => ({
  $head: $text('Puppets'),
  $$body: map((pos) => {
    return $puppets(pos.puppets, click)
  })
})

export const pnlSlotColumn = <T extends IPositionMirrorSlot>(processData: Stream<IGmxProcessState>, shareTarget?: viem.Address): TableColumn<T> => ({
  $head: $tableHeader('PnL', 'ROI'),
  columnOp: style({ placeContent: 'flex-end' }),
  $$body: map(pos => {
    return $openPnl(processData, pos, shareTarget)
  })
})

export const traderColumn = <T extends IMirrorPositionListSummary & { trader: viem.Address }>(click: Op<string, string>, route: router.Route): TableColumn<T> => ({
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
  $head: $tableHeader('PnL', 'ROI'),
  columnOp: style({ placeContent: 'flex-end' }),
  $$body: map(mp => {
    const pnl = getParticiapntMpPortion(mp, mp.realisedPnl, puppet)
    const collateral = getParticiapntMpPortion(mp, mp.maxCollateralUsd, puppet)
      
    return $column(layoutSheet.spacingTiny, style({ textAlign: 'right' }))(
      $pnlValue(pnl),
      $seperator2,
      $text(style({ fontSize: '.85rem' }))(readablePercentage(getBasisPoints(pnl, collateral))),
    )
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
