import { Op, combineObject } from '@aelea/core'
import { $Node, $text, NodeComposeFn, component, style } from '@aelea/dom'
import { $column } from '@aelea/ui-components'
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { fromPromise, map } from "@most/core"
import { Stream } from "@most/types"
import * as GMX from "gmx-middleware-const"
import { $Table, $defaultTableRowContainer, $marketSmallLabel } from 'gmx-middleware-ui-components'
import { IMarket, IMarketFees, IMarketPrice, IMarketUsageInfo, getBorrowingFactorPerInterval, getFundingFactorPerInterval, readableFactorPercentage } from 'gmx-middleware-utils'
import { IGmxProcessState } from '../data/process/process'
import { contractReader } from '../logic/common'
import { getMarketPoolUsage } from '../logic/tradeV2'
import { ISupportedChain } from '../wallet/walletLink'


interface IMarketList {
  $container?: NodeComposeFn<$Node>
  processData: Stream<IGmxProcessState>
  chain: ISupportedChain

  $rowCallback?: Op<{ market: IMarket, price: IMarketPrice }, NodeComposeFn<$Node>>
}

export const $MarketInfoList = ({
  $container = $column,
  processData,
  chain,
  $rowCallback
}: IMarketList) => component((
  // [changeMarket, changeMarketTether]: Behavior<INode, IMarket>,
) => {
  const gmxContractMap = GMX.CONTRACT[chain.id]
  const v2Reader = contractReader(gmxContractMap.ReaderV2)



  const marketParamList = map(params => {
    const data = Object
      .values(params.processData.marketMap)
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
        $rowContainer: $defaultTableRowContainer(style({ borderTop: `1px solid ${colorAlpha(pallete.foreground, .2)}` })),
        $rowCallback,
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

    {  }
  ]
})

