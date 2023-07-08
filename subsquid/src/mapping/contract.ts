import { DataHandlerContext } from '@subsquid/evm-processor'
import { Store } from '../db'
import { EntityBuffer } from '../entityBuffer'
import { ContractEventBuyUsdg, ContractEventClosePosition, ContractEventCollectMarginFees, ContractEventCollectSwapFees, ContractEventDecreaseGuaranteedUsd, ContractEventDecreasePoolAmount, ContractEventDecreasePosition, ContractEventDecreaseReservedAmount, ContractEventDecreaseUsdgAmount, ContractEventDirectPoolDeposit, ContractEventIncreaseGuaranteedUsd, ContractEventIncreasePoolAmount, ContractEventIncreasePosition, ContractEventIncreaseReservedAmount, ContractEventIncreaseUsdgAmount, ContractEventLiquidatePosition, ContractEventSellUsdg, ContractEventSwap, ContractEventUpdateFundingRate, ContractEventUpdatePnl, ContractEventUpdatePosition, ContractFunctionAddRouter, ContractFunctionBuyUsdg, ContractFunctionClearTokenConfig, ContractFunctionDecreasePosition, ContractFunctionDirectPoolDeposit, ContractFunctionGetPositionKey, ContractFunctionIncreasePosition, ContractFunctionInitialize, ContractFunctionLiquidatePosition, ContractFunctionRemoveRouter, ContractFunctionSellUsdg, ContractFunctionSetBufferAmount, ContractFunctionSetError, ContractFunctionSetErrorController, ContractFunctionSetFees, ContractFunctionSetFundingRate, ContractFunctionSetGov, ContractFunctionSetInManagerMode, ContractFunctionSetInPrivateLiquidationMode, ContractFunctionSetIsLeverageEnabled, ContractFunctionSetIsSwapEnabled, ContractFunctionSetLiquidator, ContractFunctionSetManager, ContractFunctionSetMaxGasPrice, ContractFunctionSetMaxLeverage, ContractFunctionSetPriceFeed, ContractFunctionSetTokenConfig, ContractFunctionSetUsdgAmount, ContractFunctionSwap, ContractFunctionUpdateCumulativeFundingRate, ContractFunctionUpgradeVault, ContractFunctionWithdrawFees } from '../model'
import * as spec from '../abi/Vault'
import { Log, Transaction } from '../processor'

const address = '0x489ee077994b6658eafa855c308275ead8097c4a'


export function parseEvent(ctx: DataHandlerContext<Store>, log: Log) {
  try {
    switch (log.topics[0]) {
    case spec.events['BuyUSDG'].topic: {
      const e = spec.events['BuyUSDG'].decode(log)
      EntityBuffer.add(
        new ContractEventBuyUsdg({
          id: log.id,
          blockNumber: log.block.height,
          blockTimestamp: new Date(log.block.timestamp),
          transactionHash: log.transactionHash,
          contract: log.address,
          eventName: 'BuyUSDG',
          account: e[0],
          token: e[1],
          tokenAmount: e[2],
          usdgAmount: e[3],
          feeBasisPoints: e[4],
        })
      )
      break
    }
    case spec.events['ClosePosition'].topic: {
      const e = spec.events['ClosePosition'].decode(log)
      EntityBuffer.add(
        new ContractEventClosePosition({
          id: log.id,
          blockNumber: log.block.height,
          blockTimestamp: new Date(log.block.timestamp),
          transactionHash: log.transactionHash,
          contract: log.address,
          eventName: 'ClosePosition',
          key: e[0],
          size: e[1],
          collateral: e[2],
          averagePrice: e[3],
          entryFundingRate: e[4],
          reserveAmount: e[5],
          realisedPnl: e[6],
        })
      )
      break
    }
    case spec.events['CollectMarginFees'].topic: {
      const e = spec.events['CollectMarginFees'].decode(log)
      EntityBuffer.add(
        new ContractEventCollectMarginFees({
          id: log.id,
          blockNumber: log.block.height,
          blockTimestamp: new Date(log.block.timestamp),
          transactionHash: log.transactionHash,
          contract: log.address,
          eventName: 'CollectMarginFees',
          token: e[0],
          feeUsd: e[1],
          feeTokens: e[2],
        })
      )
      break
    }
    case spec.events['CollectSwapFees'].topic: {
      const e = spec.events['CollectSwapFees'].decode(log)
      EntityBuffer.add(
        new ContractEventCollectSwapFees({
          id: log.id,
          blockNumber: log.block.height,
          blockTimestamp: new Date(log.block.timestamp),
          transactionHash: log.transactionHash,
          contract: log.address,
          eventName: 'CollectSwapFees',
          token: e[0],
          feeUsd: e[1],
          feeTokens: e[2],
        })
      )
      break
    }
    case spec.events['DecreaseGuaranteedUsd'].topic: {
      const e = spec.events['DecreaseGuaranteedUsd'].decode(log)
      EntityBuffer.add(
        new ContractEventDecreaseGuaranteedUsd({
          id: log.id,
          blockNumber: log.block.height,
          blockTimestamp: new Date(log.block.timestamp),
          transactionHash: log.transactionHash,
          contract: log.address,
          eventName: 'DecreaseGuaranteedUsd',
          token: e[0],
          amount: e[1],
        })
      )
      break
    }
    case spec.events['DecreasePoolAmount'].topic: {
      const e = spec.events['DecreasePoolAmount'].decode(log)
      EntityBuffer.add(
        new ContractEventDecreasePoolAmount({
          id: log.id,
          blockNumber: log.block.height,
          blockTimestamp: new Date(log.block.timestamp),
          transactionHash: log.transactionHash,
          contract: log.address,
          eventName: 'DecreasePoolAmount',
          token: e[0],
          amount: e[1],
        })
      )
      break
    }
    case spec.events['DecreasePosition'].topic: {
      const e = spec.events['DecreasePosition'].decode(log)
      EntityBuffer.add(
        new ContractEventDecreasePosition({
          id: log.id,
          blockNumber: log.block.height,
          blockTimestamp: new Date(log.block.timestamp),
          transactionHash: log.transactionHash,
          contract: log.address,
          eventName: 'DecreasePosition',
          key: e[0],
          account: e[1],
          collateralToken: e[2],
          indexToken: e[3],
          collateralDelta: e[4],
          sizeDelta: e[5],
          isLong: e[6],
          price: e[7],
          fee: e[8],
        })
      )
      break
    }
    case spec.events['DecreaseReservedAmount'].topic: {
      const e = spec.events['DecreaseReservedAmount'].decode(log)
      EntityBuffer.add(
        new ContractEventDecreaseReservedAmount({
          id: log.id,
          blockNumber: log.block.height,
          blockTimestamp: new Date(log.block.timestamp),
          transactionHash: log.transactionHash,
          contract: log.address,
          eventName: 'DecreaseReservedAmount',
          token: e[0],
          amount: e[1],
        })
      )
      break
    }
    case spec.events['DecreaseUsdgAmount'].topic: {
      const e = spec.events['DecreaseUsdgAmount'].decode(log)
      EntityBuffer.add(
        new ContractEventDecreaseUsdgAmount({
          id: log.id,
          blockNumber: log.block.height,
          blockTimestamp: new Date(log.block.timestamp),
          transactionHash: log.transactionHash,
          contract: log.address,
          eventName: 'DecreaseUsdgAmount',
          token: e[0],
          amount: e[1],
        })
      )
      break
    }
    case spec.events['DirectPoolDeposit'].topic: {
      const e = spec.events['DirectPoolDeposit'].decode(log)
      EntityBuffer.add(
        new ContractEventDirectPoolDeposit({
          id: log.id,
          blockNumber: log.block.height,
          blockTimestamp: new Date(log.block.timestamp),
          transactionHash: log.transactionHash,
          contract: log.address,
          eventName: 'DirectPoolDeposit',
          token: e[0],
          amount: e[1],
        })
      )
      break
    }
    case spec.events['IncreaseGuaranteedUsd'].topic: {
      const e = spec.events['IncreaseGuaranteedUsd'].decode(log)
      EntityBuffer.add(
        new ContractEventIncreaseGuaranteedUsd({
          id: log.id,
          blockNumber: log.block.height,
          blockTimestamp: new Date(log.block.timestamp),
          transactionHash: log.transactionHash,
          contract: log.address,
          eventName: 'IncreaseGuaranteedUsd',
          token: e[0],
          amount: e[1],
        })
      )
      break
    }
    case spec.events['IncreasePoolAmount'].topic: {
      const e = spec.events['IncreasePoolAmount'].decode(log)
      EntityBuffer.add(
        new ContractEventIncreasePoolAmount({
          id: log.id,
          blockNumber: log.block.height,
          blockTimestamp: new Date(log.block.timestamp),
          transactionHash: log.transactionHash,
          contract: log.address,
          eventName: 'IncreasePoolAmount',
          token: e[0],
          amount: e[1],
        })
      )
      break
    }
    case spec.events['IncreasePosition'].topic: {
      const e = spec.events['IncreasePosition'].decode(log)
      EntityBuffer.add(
        new ContractEventIncreasePosition({
          id: log.id,
          blockNumber: log.block.height,
          blockTimestamp: new Date(log.block.timestamp),
          transactionHash: log.transactionHash,
          contract: log.address,
          eventName: 'IncreasePosition',
          key: e[0],
          account: e[1],
          collateralToken: e[2],
          indexToken: e[3],
          collateralDelta: e[4],
          sizeDelta: e[5],
          isLong: e[6],
          price: e[7],
          fee: e[8],
        })
      )
      break
    }
    case spec.events['IncreaseReservedAmount'].topic: {
      const e = spec.events['IncreaseReservedAmount'].decode(log)
      EntityBuffer.add(
        new ContractEventIncreaseReservedAmount({
          id: log.id,
          blockNumber: log.block.height,
          blockTimestamp: new Date(log.block.timestamp),
          transactionHash: log.transactionHash,
          contract: log.address,
          eventName: 'IncreaseReservedAmount',
          token: e[0],
          amount: e[1],
        })
      )
      break
    }
    case spec.events['IncreaseUsdgAmount'].topic: {
      const e = spec.events['IncreaseUsdgAmount'].decode(log)
      EntityBuffer.add(
        new ContractEventIncreaseUsdgAmount({
          id: log.id,
          blockNumber: log.block.height,
          blockTimestamp: new Date(log.block.timestamp),
          transactionHash: log.transactionHash,
          contract: log.address,
          eventName: 'IncreaseUsdgAmount',
          token: e[0],
          amount: e[1],
        })
      )
      break
    }
    case spec.events['LiquidatePosition'].topic: {
      const e = spec.events['LiquidatePosition'].decode(log)
      EntityBuffer.add(
        new ContractEventLiquidatePosition({
          id: log.id,
          blockNumber: log.block.height,
          blockTimestamp: new Date(log.block.timestamp),
          transactionHash: log.transactionHash,
          contract: log.address,
          eventName: 'LiquidatePosition',
          key: e[0],
          account: e[1],
          collateralToken: e[2],
          indexToken: e[3],
          isLong: e[4],
          size: e[5],
          collateral: e[6],
          reserveAmount: e[7],
          realisedPnl: e[8],
          markPrice: e[9],
        })
      )
      break
    }
    case spec.events['SellUSDG'].topic: {
      const e = spec.events['SellUSDG'].decode(log)
      EntityBuffer.add(
        new ContractEventSellUsdg({
          id: log.id,
          blockNumber: log.block.height,
          blockTimestamp: new Date(log.block.timestamp),
          transactionHash: log.transactionHash,
          contract: log.address,
          eventName: 'SellUSDG',
          account: e[0],
          token: e[1],
          usdgAmount: e[2],
          tokenAmount: e[3],
          feeBasisPoints: e[4],
        })
      )
      break
    }
    case spec.events['Swap'].topic: {
      const e = spec.events['Swap'].decode(log)
      EntityBuffer.add(
        new ContractEventSwap({
          id: log.id,
          blockNumber: log.block.height,
          blockTimestamp: new Date(log.block.timestamp),
          transactionHash: log.transactionHash,
          contract: log.address,
          eventName: 'Swap',
          account: e[0],
          tokenIn: e[1],
          tokenOut: e[2],
          amountIn: e[3],
          amountOut: e[4],
          amountOutAfterFees: e[5],
          feeBasisPoints: e[6],
        })
      )
      break
    }
    case spec.events['UpdateFundingRate'].topic: {
      const e = spec.events['UpdateFundingRate'].decode(log)
      EntityBuffer.add(
        new ContractEventUpdateFundingRate({
          id: log.id,
          blockNumber: log.block.height,
          blockTimestamp: new Date(log.block.timestamp),
          transactionHash: log.transactionHash,
          contract: log.address,
          eventName: 'UpdateFundingRate',
          token: e[0],
          fundingRate: e[1],
        })
      )
      break
    }
    case spec.events['UpdatePnl'].topic: {
      const e = spec.events['UpdatePnl'].decode(log)
      EntityBuffer.add(
        new ContractEventUpdatePnl({
          id: log.id,
          blockNumber: log.block.height,
          blockTimestamp: new Date(log.block.timestamp),
          transactionHash: log.transactionHash,
          contract: log.address,
          eventName: 'UpdatePnl',
          key: e[0],
          hasProfit: e[1],
          delta: e[2],
        })
      )
      break
    }
    case spec.events['UpdatePosition'].topic: {
      const e = spec.events['UpdatePosition'].decode(log)
      EntityBuffer.add(
        new ContractEventUpdatePosition({
          id: log.id,
          blockNumber: log.block.height,
          blockTimestamp: new Date(log.block.timestamp),
          transactionHash: log.transactionHash,
          contract: log.address,
          eventName: 'UpdatePosition',
          key: e[0],
          size: e[1],
          collateral: e[2],
          averagePrice: e[3],
          entryFundingRate: e[4],
          reserveAmount: e[5],
          realisedPnl: e[6],
        })
      )
      break
    }
    }
  }
  catch (error) {
    ctx.log.error({ error, blockNumber: log.block.height, blockHash: log.block.hash, address }, `Unable to decode event "${log.topics[0]}"`)
  }
}

export function parseFunction(ctx: DataHandlerContext<Store>, transaction: Transaction) {
  try {
    switch (transaction.input.slice(0, 10)) {
    case spec.functions['addRouter'].sighash: {
      const f = spec.functions['addRouter'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionAddRouter({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'addRouter',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          router: f[0],
        })
      )
      break
    }
    case spec.functions['buyUSDG'].sighash: {
      const f = spec.functions['buyUSDG'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionBuyUsdg({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'buyUSDG',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          token: f[0],
          receiver: f[1],
        })
      )
      break
    }
    case spec.functions['clearTokenConfig'].sighash: {
      const f = spec.functions['clearTokenConfig'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionClearTokenConfig({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'clearTokenConfig',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          token: f[0],
        })
      )
      break
    }
    case spec.functions['decreasePosition'].sighash: {
      const f = spec.functions['decreasePosition'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionDecreasePosition({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'decreasePosition',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          account: f[0],
          collateralToken: f[1],
          indexToken: f[2],
          collateralDelta: f[3],
          sizeDelta: f[4],
          isLong: f[5],
          receiver: f[6],
        })
      )
      break
    }
    case spec.functions['directPoolDeposit'].sighash: {
      const f = spec.functions['directPoolDeposit'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionDirectPoolDeposit({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'directPoolDeposit',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          token: f[0],
        })
      )
      break
    }
    case spec.functions['getPositionKey'].sighash: {
      const f = spec.functions['getPositionKey'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionGetPositionKey({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'getPositionKey',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          account: f[0],
          collateralToken: f[1],
          indexToken: f[2],
          isLong: f[3],
        })
      )
      break
    }
    case spec.functions['increasePosition'].sighash: {
      const f = spec.functions['increasePosition'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionIncreasePosition({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'increasePosition',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          account: f[0],
          collateralToken: f[1],
          indexToken: f[2],
          sizeDelta: f[3],
          isLong: f[4],
        })
      )
      break
    }
    case spec.functions['initialize'].sighash: {
      const f = spec.functions['initialize'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionInitialize({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'initialize',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          router: f[0],
          usdg: f[1],
          priceFeed: f[2],
          liquidationFeeUsd: f[3],
          fundingRateFactor: f[4],
          stableFundingRateFactor: f[5],
        })
      )
      break
    }
    case spec.functions['liquidatePosition'].sighash: {
      const f = spec.functions['liquidatePosition'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionLiquidatePosition({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'liquidatePosition',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          account: f[0],
          collateralToken: f[1],
          indexToken: f[2],
          isLong: f[3],
          feeReceiver: f[4],
        })
      )
      break
    }
    case spec.functions['removeRouter'].sighash: {
      const f = spec.functions['removeRouter'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionRemoveRouter({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'removeRouter',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          router: f[0],
        })
      )
      break
    }
    case spec.functions['sellUSDG'].sighash: {
      const f = spec.functions['sellUSDG'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionSellUsdg({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'sellUSDG',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          token: f[0],
          receiver: f[1],
        })
      )
      break
    }
    case spec.functions['setBufferAmount'].sighash: {
      const f = spec.functions['setBufferAmount'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionSetBufferAmount({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'setBufferAmount',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          token: f[0],
          amount: f[1],
        })
      )
      break
    }
    case spec.functions['setError'].sighash: {
      const f = spec.functions['setError'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionSetError({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'setError',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          errorCode: f[0],
          error: f[1],
        })
      )
      break
    }
    case spec.functions['setErrorController'].sighash: {
      const f = spec.functions['setErrorController'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionSetErrorController({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'setErrorController',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          errorController: f[0],
        })
      )
      break
    }
    case spec.functions['setFees'].sighash: {
      const f = spec.functions['setFees'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionSetFees({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'setFees',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          taxBasisPoints: f[0],
          stableTaxBasisPoints: f[1],
          mintBurnFeeBasisPoints: f[2],
          swapFeeBasisPoints: f[3],
          stableSwapFeeBasisPoints: f[4],
          marginFeeBasisPoints: f[5],
          liquidationFeeUsd: f[6],
          minProfitTime: f[7],
          hasDynamicFees: f[8],
        })
      )
      break
    }
    case spec.functions['setFundingRate'].sighash: {
      const f = spec.functions['setFundingRate'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionSetFundingRate({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'setFundingRate',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          fundingInterval: f[0],
          fundingRateFactor: f[1],
          stableFundingRateFactor: f[2],
        })
      )
      break
    }
    case spec.functions['setGov'].sighash: {
      const f = spec.functions['setGov'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionSetGov({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'setGov',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          gov: f[0],
        })
      )
      break
    }
    case spec.functions['setInManagerMode'].sighash: {
      const f = spec.functions['setInManagerMode'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionSetInManagerMode({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'setInManagerMode',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          inManagerMode: f[0],
        })
      )
      break
    }
    case spec.functions['setInPrivateLiquidationMode'].sighash: {
      const f = spec.functions['setInPrivateLiquidationMode'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionSetInPrivateLiquidationMode({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'setInPrivateLiquidationMode',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          inPrivateLiquidationMode: f[0],
        })
      )
      break
    }
    case spec.functions['setIsLeverageEnabled'].sighash: {
      const f = spec.functions['setIsLeverageEnabled'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionSetIsLeverageEnabled({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'setIsLeverageEnabled',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          isLeverageEnabled: f[0],
        })
      )
      break
    }
    case spec.functions['setIsSwapEnabled'].sighash: {
      const f = spec.functions['setIsSwapEnabled'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionSetIsSwapEnabled({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'setIsSwapEnabled',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          isSwapEnabled: f[0],
        })
      )
      break
    }
    case spec.functions['setLiquidator'].sighash: {
      const f = spec.functions['setLiquidator'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionSetLiquidator({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'setLiquidator',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          liquidator: f[0],
          isActive: f[1],
        })
      )
      break
    }
    case spec.functions['setManager'].sighash: {
      const f = spec.functions['setManager'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionSetManager({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'setManager',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          manager: f[0],
          isManager: f[1],
        })
      )
      break
    }
    case spec.functions['setMaxGasPrice'].sighash: {
      const f = spec.functions['setMaxGasPrice'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionSetMaxGasPrice({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'setMaxGasPrice',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          maxGasPrice: f[0],
        })
      )
      break
    }
    case spec.functions['setMaxLeverage'].sighash: {
      const f = spec.functions['setMaxLeverage'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionSetMaxLeverage({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'setMaxLeverage',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          maxLeverage: f[0],
        })
      )
      break
    }
    case spec.functions['setPriceFeed'].sighash: {
      const f = spec.functions['setPriceFeed'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionSetPriceFeed({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'setPriceFeed',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          priceFeed: f[0],
        })
      )
      break
    }
    case spec.functions['setTokenConfig'].sighash: {
      const f = spec.functions['setTokenConfig'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionSetTokenConfig({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'setTokenConfig',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          token: f[0],
          tokenDecimals: f[1],
          tokenWeight: f[2],
          minProfitBps: f[3],
          maxUsdgAmount: f[4],
          isStable: f[5],
          isShortable: f[6],
        })
      )
      break
    }
    case spec.functions['setUsdgAmount'].sighash: {
      const f = spec.functions['setUsdgAmount'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionSetUsdgAmount({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'setUsdgAmount',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          token: f[0],
          amount: f[1],
        })
      )
      break
    }
    case spec.functions['swap'].sighash: {
      const f = spec.functions['swap'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionSwap({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'swap',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          tokenIn: f[0],
          tokenOut: f[1],
          receiver: f[2],
        })
      )
      break
    }
    case spec.functions['updateCumulativeFundingRate'].sighash: {
      const f = spec.functions['updateCumulativeFundingRate'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionUpdateCumulativeFundingRate({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'updateCumulativeFundingRate',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          token: f[0],
        })
      )
      break
    }
    case spec.functions['upgradeVault'].sighash: {
      const f = spec.functions['upgradeVault'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionUpgradeVault({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'upgradeVault',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          newVault: f[0],
          token: f[1],
          amount: f[2],
        })
      )
      break
    }
    case spec.functions['withdrawFees'].sighash: {
      const f = spec.functions['withdrawFees'].decode(transaction.input)
      EntityBuffer.add(
        new ContractFunctionWithdrawFees({
          id: transaction.id,
          blockNumber: transaction.block.height,
          blockTimestamp: new Date(transaction.block.timestamp),
          transactionHash: transaction.hash,
          contract: transaction.to!,
          functionName: 'withdrawFees',
          functionValue: transaction.value,
          functionSuccess: transaction.status != null ? Boolean(transaction.status) : undefined,
          token: f[0],
          receiver: f[1],
        })
      )
      break
    }
    }
  }
  catch (error) {
    ctx.log.error({ error, blockNumber: transaction.block.height, blockHash: transaction.block.hash, address }, `Unable to decode function "${transaction.input.slice(0, 10)}"`)
  }
}
