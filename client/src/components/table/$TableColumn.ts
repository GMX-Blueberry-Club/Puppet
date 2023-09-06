import { O, Op, Tether } from "@aelea/core"
import { $Node, $text, INode, style } from "@aelea/dom"
import * as router from '@aelea/router'
import { $column, $row, layoutSheet } from "@aelea/ui-components"
import { map, now } from "@most/core"
import { Stream } from "@most/types"
import { $Link, $infoTooltipLabel, TableColumn } from "gmx-middleware-ui-components"
import { factor, getBasisPoints, getPnL, getSlotNetPnL, readableDate, readablePercentage, switchMap, timeSince } from "gmx-middleware-utils"
import { IMirrorPositionListSummary, IPositionMirrorSettled, IPositionMirrorSlot, getParticiapntMpPortion } from "puppet-middleware-utils"
import * as viem from 'viem'
import { $profileDisplay } from "../$AccountProfile"
import { $entry, $openPositionPnlBreakdown, $pnlValue, $puppets, $size, $sizeAndLiquidation, $positionSlotPnl, $positionSlotRoi } from "../../common/$common"
import { IGmxProcessState, latestTokenPrice } from "../../data/process/process"
import { $txnIconLink } from "../../elements/$common"
import { IProfileActiveTab } from "../../pages/$Profile"
import { $seperator2 } from "../../pages/common"
import { contractReader } from "../../logic/common"
import * as GMX from 'gmx-middleware-const'


const $tableHeader = (primaryLabel: string, secondaryLabel: string) => $column(style({ textAlign: 'right' }))(
  $text(primaryLabel),
  $text(style({ fontSize: '.85rem' }))(secondaryLabel)
)


export const slotSizeColumn = <T extends IPositionMirrorSettled | IPositionMirrorSlot>(processData: Stream<IGmxProcessState>, shareTarget?: viem.Address): TableColumn<T> => ({
  $head: $tableHeader('Size', 'Leverage'),
  columnOp: O(layoutSheet.spacingTiny, style({ flex: 1.2, placeContent: 'flex-end' })),
  $$body: map(mp => {
    const positionMarkPrice = latestTokenPrice(processData, now(mp.indexToken))
    const size = getParticiapntMpPortion(mp, mp.maxSizeUsd, shareTarget)
    const collateral = getParticiapntMpPortion(mp, mp.maxCollateralUsd, shareTarget)

    return $sizeAndLiquidation(mp.isLong, size, collateral, mp.averagePrice, positionMarkPrice)
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
    return $entry(pos)
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
  $$body: map((pos) => {
    const positionMarkPrice = latestTokenPrice(processData, now(pos.indexToken))
    const cumulativeTokenFundingRates = contractReader(GMX.CONTRACT['42161'].Vault)('cumulativeFundingRates', pos.collateralToken)

    return $column(layoutSheet.spacingTiny, style({ textAlign: 'right' }))(
      style({ flexDirection: 'row-reverse' })(
        $infoTooltipLabel(
          switchMap(ff => $openPositionPnlBreakdown(pos, ff), cumulativeTokenFundingRates),
          $positionSlotPnl(pos, positionMarkPrice, shareTarget)
        )
      ),
      $seperator2,
      style({ fontSize: '.85rem' })($positionSlotRoi(pos, positionMarkPrice)),
    )
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
