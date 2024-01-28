import { Op, combineObject } from '@aelea/core'
import { $Node, $text, NodeComposeFn, component, style } from '@aelea/dom'
import { $column } from '@aelea/ui-components'
import { colorAlpha, pallete } from "@aelea/ui-components-theme"
import { fromPromise, map, switchLatest, take } from "@most/core"
import { Stream } from "@most/types"
import { ADDRESS_ZERO, IntervalTime, getMappedValue, readableFactorPercentage, switchMap } from 'common-utils'
import * as GMX from "gmx-middleware-const"
import { IMarket, IMarketFees, IMarketPrice, IMarketUsageInfo, TEMP_MARKET_LIST, getBorrowingFactorPerInterval, getFundingFactorPerInterval } from 'gmx-middleware-utils'
import { latestPriceMap } from 'puppet-middleware-utils'
import { $Table, $defaultTableRowContainer } from 'ui-components'
import * as viem from 'viem'
import { $marketSmallLabel } from '../common/$common'
import { getMarketPoolUsage } from '../logic/tradeV2'
import { walletLink } from '../wallet'
import { IPublicProvider } from '../wallet/initWallet'
import { readContract } from 'viem/actions'

interface IMarketList {
  publicProviderQuery: Stream<Promise<IPublicProvider>>
  $container?: NodeComposeFn<$Node>
  chain: viem.Chain
  $rowCallback?: Op<{ market: IMarket, price: IMarketPrice }, NodeComposeFn<$Node>>
}

export const $MarketInfoList = (config: IMarketList) => component((
) => {
  const  { publicProviderQuery, $container = $column, chain, $rowCallback } = config
  const gmxContractMap = getMappedValue(GMX.CONTRACT, chain.id)

  const marketParamList = map(params => {
    const data = TEMP_MARKET_LIST
      .filter(market => market.indexToken !== ADDRESS_ZERO)
      .map(market => {
        const longTokenPrice = params.latestPriceMap[market.longToken]
        const shortTokenPrice = params.latestPriceMap[market.shortToken]
        const indexTokenPrice = params.latestPriceMap[market.indexToken]

        const price = { longTokenPrice, shortTokenPrice, indexTokenPrice }

        return { market, price }
      })
    return data
  }, combineObject({ latestPriceMap: take(1, latestPriceMap) }))


  return [
    $container(
      switchLatest(switchMap(async providerQuery => {
        const provider = await providerQuery

        return $Table({
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
              // const fees: Stream<IMarketFees> = v2Reader('getMarketInfo', )
                const fees: Stream<IMarketFees> = fromPromise(readContract(provider, {
                  ...gmxContractMap.ReaderV2,
                  functionName: 'getMarketInfo',
                  args: [gmxContractMap.Datastore.address, params.price, params.market.marketToken] as any
                }))
                const usage: Stream<IMarketUsageInfo> = fromPromise(getMarketPoolUsage(provider, params.market))

                const fundingFactorPerInterval  = map(marketParams => {
                  return getFundingFactorPerInterval(marketParams.usage, marketParams.fees, IntervalTime.MIN60)
                }, combineObject({ usage, fees }))

                return $text(map(fr => readableFactorPercentage(fr), fundingFactorPerInterval))
              })
            },
            {
              $head: $text('Borrow Rate Long'),
              gridTemplate: '90px',
              $bodyCallback: map(params => {
                const marketFees: Stream<IMarketFees> = fromPromise(readContract(provider, {
                  ...gmxContractMap.ReaderV2,
                  functionName: 'getMarketInfo',
                  args: [gmxContractMap.Datastore.address, params.price, params.market.marketToken] as any
                }))


                const shortBorrowRatePerInterval =  map(fees => {
                  return getBorrowingFactorPerInterval(fees, true, IntervalTime.MIN60)
                }, marketFees)


                return $text(map(fr => readableFactorPercentage(fr), shortBorrowRatePerInterval))
              })
            },
            {
              $head: $text('Borrow Rate Short'),
              gridTemplate: '90px',
              $bodyCallback: map(params => {
                const marketFees: Stream<IMarketFees> = fromPromise(readContract(provider, {
                  ...gmxContractMap.ReaderV2,
                  functionName: 'getMarketInfo',
                  args: [gmxContractMap.Datastore.address, params.price, params.market.marketToken] as any
                }))


                const shortBorrowRatePerInterval =  map(marketInfo => {
                  return getBorrowingFactorPerInterval(marketInfo, false, IntervalTime.MIN60)
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
      }, publicProviderQuery)),
    ),

    {  }
  ]
})

