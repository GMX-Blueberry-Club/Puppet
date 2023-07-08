import { EvmBatchProcessor, EvmBatchProcessorFields, BlockHeader, Log as _Log, Transaction as _Transaction } from '@subsquid/evm-processor'
import { lookupArchive } from '@subsquid/archive-registry'
import * as contractAbi from './abi/Vault'

export const processor = new EvmBatchProcessor()
  .setDataSource({
    archive: lookupArchive('arbitrum', { type: 'EVM' }),
  })
  .setFields({
    log: {
      topics: true,
      data: true,
      transactionHash: true,
    },
    transaction: {
      hash: true,
      input: true,
      from: true,
      value: true,
      status: true,
    }
  })
  .addLog({
    address: ['0x489ee077994b6658eafa855c308275ead8097c4a'],
    topic0: [
      contractAbi.events['BuyUSDG'].topic,
      contractAbi.events['ClosePosition'].topic,
      contractAbi.events['CollectMarginFees'].topic,
      contractAbi.events['CollectSwapFees'].topic,
      contractAbi.events['DecreaseGuaranteedUsd'].topic,
      contractAbi.events['DecreasePoolAmount'].topic,
      contractAbi.events['DecreasePosition'].topic,
      contractAbi.events['DecreaseReservedAmount'].topic,
      contractAbi.events['DecreaseUsdgAmount'].topic,
      contractAbi.events['DirectPoolDeposit'].topic,
      contractAbi.events['IncreaseGuaranteedUsd'].topic,
      contractAbi.events['IncreasePoolAmount'].topic,
      contractAbi.events['IncreasePosition'].topic,
      contractAbi.events['IncreaseReservedAmount'].topic,
      contractAbi.events['IncreaseUsdgAmount'].topic,
      contractAbi.events['LiquidatePosition'].topic,
      contractAbi.events['SellUSDG'].topic,
      contractAbi.events['Swap'].topic,
      contractAbi.events['UpdateFundingRate'].topic,
      contractAbi.events['UpdatePnl'].topic,
      contractAbi.events['UpdatePosition'].topic,
    ],
    range: {
      from: 227091,
    },
  })
  .addTransaction({
    to: ['0x489ee077994b6658eafa855c308275ead8097c4a'],
    sighash: [
      contractAbi.functions['addRouter'].sighash,
      contractAbi.functions['buyUSDG'].sighash,
      contractAbi.functions['clearTokenConfig'].sighash,
      contractAbi.functions['decreasePosition'].sighash,
      contractAbi.functions['directPoolDeposit'].sighash,
      contractAbi.functions['getPositionKey'].sighash,
      contractAbi.functions['increasePosition'].sighash,
      contractAbi.functions['initialize'].sighash,
      contractAbi.functions['liquidatePosition'].sighash,
      contractAbi.functions['removeRouter'].sighash,
      contractAbi.functions['sellUSDG'].sighash,
      contractAbi.functions['setBufferAmount'].sighash,
      contractAbi.functions['setError'].sighash,
      contractAbi.functions['setErrorController'].sighash,
      contractAbi.functions['setFees'].sighash,
      contractAbi.functions['setFundingRate'].sighash,
      contractAbi.functions['setGov'].sighash,
      contractAbi.functions['setInManagerMode'].sighash,
      contractAbi.functions['setInPrivateLiquidationMode'].sighash,
      contractAbi.functions['setIsLeverageEnabled'].sighash,
      contractAbi.functions['setIsSwapEnabled'].sighash,
      contractAbi.functions['setLiquidator'].sighash,
      contractAbi.functions['setManager'].sighash,
      contractAbi.functions['setMaxGasPrice'].sighash,
      contractAbi.functions['setMaxLeverage'].sighash,
      contractAbi.functions['setPriceFeed'].sighash,
      contractAbi.functions['setTokenConfig'].sighash,
      contractAbi.functions['setUsdgAmount'].sighash,
      contractAbi.functions['swap'].sighash,
      contractAbi.functions['updateCumulativeFundingRate'].sighash,
      contractAbi.functions['upgradeVault'].sighash,
      contractAbi.functions['withdrawFees'].sighash,
    ],
    range: {
      from: 227091,
    },
  })

export type Fields = EvmBatchProcessorFields<typeof processor>
export type Block = BlockHeader<Fields>
export type Log = _Log<Fields>
export type Transaction = _Transaction<Fields>
