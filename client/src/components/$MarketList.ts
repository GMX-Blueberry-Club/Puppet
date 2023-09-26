

import { $node, $Node, component, nodeEvent, INode, style, styleBehavior, NodeComposeFn, $text } from '@aelea/dom'
import { O, Behavior, combineObject, combineArray, replayLatest } from '@aelea/core'
import { pallete } from "@aelea/ui-components-theme"
import { constant, empty, filter, fromPromise, map, merge, multicast, now, switchLatest, take, tap, until, zip } from "@most/core"
import { Stream } from "@most/types"
import { colorAlpha } from "@aelea/ui-components-theme"
import { $column, observer } from '@aelea/ui-components'
import { IMarketFees, IMarketInfo, IMarketPool, IMarketUsageInfo, applyFactor, factor, getAvailableReservedUsd, getBorrowingFactorPerInterval, getFundingFactorPerInterval, getTokenDescription, getTokenUsd, readableFactorPercentage, readableFixedUSD30, switchMap } from 'gmx-middleware-utils'
import { fadeIn } from '../transitions/enter.js'
import * as GMX from "gmx-middleware-const"
import { contractReader } from '../logic/common'
import { IGmxProcessState } from '../data/process/process'
import { ISupportedChain } from '../wallet/walletLink'
import { $Table, $marketSmallLabel, $tokenLabelFromSummary } from 'gmx-middleware-ui-components'
import { getMarketPoolUsage, hashKey } from '../logic/tradeV2'


interface IMarketList {
  $container?: NodeComposeFn<$Node>
  processData: Stream<IGmxProcessState>
  chain: ISupportedChain
}

export const $MarketInfoList = ({ 
  $container = $column,
  processData,
  chain,
}: IMarketList) => component((
  [clickMarket, clickMarketTether]: Behavior<INode, any>,
) => {
  const gmxContractMap = GMX.CONTRACT[chain.id]
  const v2Reader = contractReader(gmxContractMap.ReaderV2)



  const marketParamList = map(params => {
    const data = Object
      .values(params.processData.markets)
      .filter(market => market.indexToken !== GMX.ADDRESS_ZERO)
      .map(market => {
        const longTokenPrice = params.processData.latestPrice[market.longToken]
        const shortTokenPrice = params.processData.latestPrice[market.shortToken]
        const indexTokenPrice = params.processData.latestPrice[market.indexToken]

        const price = { longTokenPrice, shortTokenPrice, indexTokenPrice }

        return { market, processData: params.processData, price }
      })
    return data
  }, combineObject({ processData }))


  return [
    $container(
      $Table({
        dataSource: marketParamList,
        $rowCallback: map(params => {
          return $column(clickMarketTether(nodeEvent('click'), constant(params.market)))
        }),
        scrollConfig: {
          $container: $column
        },
        columns: [
          {
            $head: $text('Market'),
            $bodyCallback: map(params => {
              return $marketSmallLabel(params.market)
            })
          },
          {
            $head: $text('Funding Rate'),
            gridTemplate: 'minmax(110px, 120px)',
            $bodyCallback: map(params => {
              const fees: Stream<IMarketFees> = v2Reader('getMarketInfo', gmxContractMap.Datastore.address, params.price, params.market.marketToken)
              const usage: Stream<IMarketUsageInfo> = fromPromise(getMarketPoolUsage(chain, params.market))

              const fundingFactorPerInterval  = map(marketParams => {
                return getFundingFactorPerInterval(params.price, marketParams.usage, marketParams.fees, GMX.TIME_INTERVAL_MAP.MIN60)
              }, combineObject({ usage, fees }))

              return $text(map(fr => readableFactorPercentage(fr), fundingFactorPerInterval))
            })
          },
          {
            $head: $text('Borrow Rate Long'),
            gridTemplate: '90px',
            $bodyCallback: map(params => {
              const marketFees: Stream<IMarketFees> = v2Reader('getMarketInfo', gmxContractMap.Datastore.address, params.price, params.market.marketToken)


              const shortBorrowRatePerInterval =  map(fees => {
                return getBorrowingFactorPerInterval(fees, true, GMX.TIME_INTERVAL_MAP.MIN60)
              }, marketFees)


              return $text(map(fr => readableFactorPercentage(fr), shortBorrowRatePerInterval))
            })
          },
          {
            $head: $text('Borrow Rate Short'),
            gridTemplate: '90px',
            $bodyCallback: map(params => {
              const marketFees: Stream<IMarketFees> = v2Reader('getMarketInfo', gmxContractMap.Datastore.address, params.price, params.market.marketToken)


              const shortBorrowRatePerInterval =  map(marketInfo => {
                return getBorrowingFactorPerInterval(marketInfo, false, GMX.TIME_INTERVAL_MAP.MIN60)
              }, marketFees)


              return $text(map(fr => readableFactorPercentage(fr), shortBorrowRatePerInterval))
            })
          },
          // {
          //   $head: $text('Liquidity'),
          //   $body: map(params => {
          //     const info: Stream<IMarketInfo> = v2Reader('getMarketInfo', gmxContractMap.Datastore.address, params.price, params.market.marketToken)

          //     const availableIndexLiquidityUsd =  map(marketInfo => {
          //       return getAvailableReservedUsd(marketInfo, params.price, true)
          //     }, info)

          //     const readPoolInfo = v2Reader(
          //       'getMarketTokenPrice',
          //       gmxContractMap.Datastore.address, params.market, params.price.indexTokenPrice,
          //       params.price.longTokenPrice, params.price.shortTokenPrice, hashKey("MAX_PNL_FACTOR_FOR_TRADERS"), true
          //     )

          //     const poolInfo: Stream<IMarketPoolInfo> = map(([_, marketInfo]) => marketInfo, readPoolInfo)



          //     return $text(map(value => readableFixedUSD30(value), availableIndexLiquidityUsd))
          //   })
          // }
        ]
      })({})
    ),

    { clickMarket }
  ]
})

