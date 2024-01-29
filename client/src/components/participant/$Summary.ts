import { $node, $text, component, style } from "@aelea/dom"
import { $column, $row, layoutSheet, screenUtils } from "@aelea/ui-components"
import { pallete } from "@aelea/ui-components-theme"
import { map, multicast } from "@most/core"
import { combineState, readableLeverage, readableUsd, zipState } from "common-utils"
import { accountSettledPositionListSummary } from "puppet-middleware-utils"
import { $intermediate$node } from "ui-components"
import * as viem from 'viem'
import { $profileDisplay } from "../$AccountProfile.js"
import { $heading2 } from "../../common/$text.js"
import { IPositionActivityParams, IUserPositionPageParams } from "../../pages/type"


export interface IAccountSummary extends IPositionActivityParams {
  address: viem.Address
  puppet?: viem.Address
}


export const $TraderSummary = (config: IAccountSummary) => component((
) => {

  const { address, openPositionListQuery, settledPositionListQuery, puppet } = config

  const metricsQuery = multicast(map(async params => {
    const allPositions = [...await params.settledPositionListQuery, ...await params.openPositionListQuery]

    return accountSettledPositionListSummary(allPositions, puppet)
  }, combineState({ openPositionListQuery, settledPositionListQuery })))

  return [

    $column(layoutSheet.spacing, style({ minHeight: '90px' }))(
      $node(style({ display: 'flex', flexDirection: screenUtils.isDesktopScreen ? 'row' : 'column', gap: screenUtils.isDesktopScreen ? '56px' : '26px', zIndex: 10, placeContent: 'center', alignItems: 'center', padding: '0 8px' }))(
        $row(
          $profileDisplay({
            address,
            labelSize: '22px',
            profileSize: screenUtils.isDesktopScreen ? 90 : 90
          })
        ),
        $row(layoutSheet.spacingBig, style({ alignItems: 'flex-end' }))(
          $metricRow(
            $intermediate$node(
              map(async summaryQuery => {
                const summary = await summaryQuery

                return $heading2(`${summary.winCount} / ${summary.lossCount}`)
              }, metricsQuery)
            ),
            $metricLabel($text('Win / Loss'))
          ),

          $metricRow(
            $intermediate$node(
              map(async summaryQuery => {
                const summary = await summaryQuery

                return $heading2(readableUsd(summary.avgCollateral))
              }, metricsQuery)
            ),
            $metricLabel($text('Avg Collateral'))
          ),
          $metricRow(
            $intermediate$node(
              map(async summaryQuery => {
                const summary = await summaryQuery

                return $heading2(readableLeverage(summary.avgSize, summary.avgCollateral))
              }, metricsQuery)
            ),
            $metricLabel($text('Avg Leverage'))
          )
      
        ),
      )
    ),
    {
    }
  ]
})

export const $PuppetSummary = (config: IAccountSummary) => component(() => {

  const { address, openPositionListQuery, settledPositionListQuery, puppet,  } = config

  const metricsQuery = multicast(map(async params => {
    const allPositions = [...await params.settledPositionListQuery, ...await params.openPositionListQuery]

    return accountSettledPositionListSummary(allPositions, puppet)
  }, combineState({ openPositionListQuery, settledPositionListQuery })))

  return [

    $column(layoutSheet.spacing, style({ minHeight: '90px' }))(
      $node(style({ display: 'flex', flexDirection: screenUtils.isDesktopScreen ? 'row' : 'column', gap: screenUtils.isDesktopScreen ? '56px' : '26px', zIndex: 10, placeContent: 'center', alignItems: 'center', padding: '0 8px' }))(
        $row(
          $profileDisplay({
            address,
            labelSize: '22px',
            profileSize: screenUtils.isDesktopScreen ? 90 : 90
          })
        ),
        $row(layoutSheet.spacingBig, style({ alignItems: 'flex-end' }))(
          $metricRow(
            $intermediate$node(
              map(async summaryQuery => {
                const summary = await summaryQuery

                return $heading2(`${summary.winCount} / ${summary.lossCount}`)
              }, metricsQuery)
            ),
            $metricLabel($text('Win / Loss'))
          ),

          $metricRow(
            $intermediate$node(
              map(async summaryQuery => {
                const summary = await summaryQuery

                return $heading2(readableUsd(summary.avgCollateral))
              }, metricsQuery)
            ),
            $metricLabel($text('Avg Collateral'))
          ),
          $metricRow(
            $intermediate$node(
              map(async summaryQuery => {
                const summary = await summaryQuery

                return $heading2(readableLeverage(summary.avgSize, summary.avgCollateral))
              }, metricsQuery)
            ),
            $metricLabel($text('Avg Leverage'))
          )
        ),
      )
    ),
    {
    }
  ]
})

export const $metricRow = $column(layoutSheet.spacingTiny, style({ placeContent: 'center', alignItems: 'center' }))
export const $metricLabel = $row(style({ color: pallete.foreground, letterSpacing: '1px', fontSize: screenUtils.isDesktopScreen ? '.85rem' : '.85rem' }))
export const $metricValue = $row(style({ fontWeight: 900, letterSpacing: '1px', fontSize: '1.85rem' }))


