import * as ethers from 'ethers'
import { LogEvent, Func, ContractBase } from './abi.support'
import { ABI_JSON } from './Vault.abi'

export const abi = new ethers.Interface(ABI_JSON)

export const events = {
  BuyUSDG: new LogEvent<([account: string, token: string, tokenAmount: bigint, usdgAmount: bigint, feeBasisPoints: bigint] & {account: string, token: string, tokenAmount: bigint, usdgAmount: bigint, feeBasisPoints: bigint})>(
    abi, '0xab4c77c74cd32c85f35416cf03e7ce9e2d4387f7b7f2c1f4bf53daaecf8ea72d'
  ),
  ClosePosition: new LogEvent<([key: string, size: bigint, collateral: bigint, averagePrice: bigint, entryFundingRate: bigint, reserveAmount: bigint, realisedPnl: bigint] & {key: string, size: bigint, collateral: bigint, averagePrice: bigint, entryFundingRate: bigint, reserveAmount: bigint, realisedPnl: bigint})>(
    abi, '0x73af1d417d82c240fdb6d319b34ad884487c6bf2845d98980cc52ad9171cb455'
  ),
  CollectMarginFees: new LogEvent<([token: string, feeUsd: bigint, feeTokens: bigint] & {token: string, feeUsd: bigint, feeTokens: bigint})>(
    abi, '0x5d0c0019d3d45fadeb74eff9d2c9924d146d000ac6bcf3c28bf0ac3c9baa011a'
  ),
  CollectSwapFees: new LogEvent<([token: string, feeUsd: bigint, feeTokens: bigint] & {token: string, feeUsd: bigint, feeTokens: bigint})>(
    abi, '0x47cd9dda0e50ce30bcaaacd0488452b596221c07ac402a581cfae4d3933cac2b'
  ),
  DecreaseGuaranteedUsd: new LogEvent<([token: string, amount: bigint] & {token: string, amount: bigint})>(
    abi, '0x34e07158b9db50df5613e591c44ea2ebc82834eff4a4dc3a46e000e608261d68'
  ),
  DecreasePoolAmount: new LogEvent<([token: string, amount: bigint] & {token: string, amount: bigint})>(
    abi, '0x112726233fbeaeed0f5b1dba5cb0b2b81883dee49fb35ff99fd98ed9f6d31eb0'
  ),
  DecreasePosition: new LogEvent<([key: string, account: string, collateralToken: string, indexToken: string, collateralDelta: bigint, sizeDelta: bigint, isLong: boolean, price: bigint, fee: bigint] & {key: string, account: string, collateralToken: string, indexToken: string, collateralDelta: bigint, sizeDelta: bigint, isLong: boolean, price: bigint, fee: bigint})>(
    abi, '0x93d75d64d1f84fc6f430a64fc578bdd4c1e090e90ea2d51773e626d19de56d30'
  ),
  DecreaseReservedAmount: new LogEvent<([token: string, amount: bigint] & {token: string, amount: bigint})>(
    abi, '0x533cb5ed32be6a90284e96b5747a1bfc2d38fdb5768a6b5f67ff7d62144ed67b'
  ),
  DecreaseUsdgAmount: new LogEvent<([token: string, amount: bigint] & {token: string, amount: bigint})>(
    abi, '0xe1e812596aac93a06ecc4ca627014d18e30f5c33b825160cc9d5c0ba61e45227'
  ),
  DirectPoolDeposit: new LogEvent<([token: string, amount: bigint] & {token: string, amount: bigint})>(
    abi, '0xa5a389190ebf6170a133bda5c769b77f4d6715b8aa172ec0ddf8473d0b4944bd'
  ),
  IncreaseGuaranteedUsd: new LogEvent<([token: string, amount: bigint] & {token: string, amount: bigint})>(
    abi, '0xd9d4761f75e0d0103b5cbeab941eeb443d7a56a35b5baf2a0787c03f03f4e474'
  ),
  IncreasePoolAmount: new LogEvent<([token: string, amount: bigint] & {token: string, amount: bigint})>(
    abi, '0x976177fbe09a15e5e43f848844963a42b41ef919ef17ff21a17a5421de8f4737'
  ),
  IncreasePosition: new LogEvent<([key: string, account: string, collateralToken: string, indexToken: string, collateralDelta: bigint, sizeDelta: bigint, isLong: boolean, price: bigint, fee: bigint] & {key: string, account: string, collateralToken: string, indexToken: string, collateralDelta: bigint, sizeDelta: bigint, isLong: boolean, price: bigint, fee: bigint})>(
    abi, '0x2fe68525253654c21998f35787a8d0f361905ef647c854092430ab65f2f15022'
  ),
  IncreaseReservedAmount: new LogEvent<([token: string, amount: bigint] & {token: string, amount: bigint})>(
    abi, '0xaa5649d82f5462be9d19b0f2b31a59b2259950a6076550bac9f3a1c07db9f66d'
  ),
  IncreaseUsdgAmount: new LogEvent<([token: string, amount: bigint] & {token: string, amount: bigint})>(
    abi, '0x64243679a443432e2293343b77d411ff6144370404618f00ca0d2025d9ca9882'
  ),
  LiquidatePosition: new LogEvent<([key: string, account: string, collateralToken: string, indexToken: string, isLong: boolean, size: bigint, collateral: bigint, reserveAmount: bigint, realisedPnl: bigint, markPrice: bigint] & {key: string, account: string, collateralToken: string, indexToken: string, isLong: boolean, size: bigint, collateral: bigint, reserveAmount: bigint, realisedPnl: bigint, markPrice: bigint})>(
    abi, '0x2e1f85a64a2f22cf2f0c42584e7c919ed4abe8d53675cff0f62bf1e95a1c676f'
  ),
  SellUSDG: new LogEvent<([account: string, token: string, usdgAmount: bigint, tokenAmount: bigint, feeBasisPoints: bigint] & {account: string, token: string, usdgAmount: bigint, tokenAmount: bigint, feeBasisPoints: bigint})>(
    abi, '0xd732b7828fa6cee72c285eac756fc66a7477e3dc22e22e7c432f1c265d40b483'
  ),
  Swap: new LogEvent<([account: string, tokenIn: string, tokenOut: string, amountIn: bigint, amountOut: bigint, amountOutAfterFees: bigint, feeBasisPoints: bigint] & {account: string, tokenIn: string, tokenOut: string, amountIn: bigint, amountOut: bigint, amountOutAfterFees: bigint, feeBasisPoints: bigint})>(
    abi, '0x0874b2d545cb271cdbda4e093020c452328b24af12382ed62c4d00f5c26709db'
  ),
  UpdateFundingRate: new LogEvent<([token: string, fundingRate: bigint] & {token: string, fundingRate: bigint})>(
    abi, '0xa146fc154e1913322e9817d49f0d5c37466c24326e15de10e739a948be815eab'
  ),
  UpdatePnl: new LogEvent<([key: string, hasProfit: boolean, delta: bigint] & {key: string, hasProfit: boolean, delta: bigint})>(
    abi, '0x3ff41bdde87755b687ae83d0221a232b6be51a803330ed9661c1b5d0105e0d8a'
  ),
  UpdatePosition: new LogEvent<([key: string, size: bigint, collateral: bigint, averagePrice: bigint, entryFundingRate: bigint, reserveAmount: bigint, realisedPnl: bigint] & {key: string, size: bigint, collateral: bigint, averagePrice: bigint, entryFundingRate: bigint, reserveAmount: bigint, realisedPnl: bigint})>(
    abi, '0x25e8a331a7394a9f09862048843323b00bdbada258f524f5ce624a45bf00aabb'
  ),
}

export const functions = {
  BASIS_POINTS_DIVISOR: new Func<[], {}, bigint>(
    abi, '0x126082cf'
  ),
  FUNDING_RATE_PRECISION: new Func<[], {}, bigint>(
    abi, '0x6be6026b'
  ),
  MAX_FEE_BASIS_POINTS: new Func<[], {}, bigint>(
    abi, '0x4befe2ca'
  ),
  MAX_FUNDING_RATE_FACTOR: new Func<[], {}, bigint>(
    abi, '0x8a39735a'
  ),
  MAX_LIQUIDATION_FEE_USD: new Func<[], {}, bigint>(
    abi, '0x07c58752'
  ),
  MIN_FUNDING_RATE_INTERVAL: new Func<[], {}, bigint>(
    abi, '0xfce28c10'
  ),
  MIN_LEVERAGE: new Func<[], {}, bigint>(
    abi, '0x34c1557d'
  ),
  PRICE_PRECISION: new Func<[], {}, bigint>(
    abi, '0x95082d25'
  ),
  USDG_DECIMALS: new Func<[], {}, bigint>(
    abi, '0x870d917c'
  ),
  addRouter: new Func<[_router: string], {_router: string}, []>(
    abi, '0x24ca984e'
  ),
  adjustForDecimals: new Func<[_amount: bigint, _tokenDiv: string, _tokenMul: string], {_amount: bigint, _tokenDiv: string, _tokenMul: string}, bigint>(
    abi, '0x42152873'
  ),
  allWhitelistedTokens: new Func<[_: bigint], {}, string>(
    abi, '0xe468baf0'
  ),
  allWhitelistedTokensLength: new Func<[], {}, bigint>(
    abi, '0x0842b076'
  ),
  approvedRouters: new Func<[_: string, _: string], {}, boolean>(
    abi, '0x60922199'
  ),
  bufferAmounts: new Func<[_: string], {}, bigint>(
    abi, '0x4a993ee9'
  ),
  buyUSDG: new Func<[_token: string, _receiver: string], {_token: string, _receiver: string}, bigint>(
    abi, '0x817bb857'
  ),
  clearTokenConfig: new Func<[_token: string], {_token: string}, []>(
    abi, '0xe67f59a7'
  ),
  cumulativeFundingRates: new Func<[_: string], {}, bigint>(
    abi, '0xc65bc7b1'
  ),
  decreasePosition: new Func<[_account: string, _collateralToken: string, _indexToken: string, _collateralDelta: bigint, _sizeDelta: bigint, _isLong: boolean, _receiver: string], {_account: string, _collateralToken: string, _indexToken: string, _collateralDelta: bigint, _sizeDelta: bigint, _isLong: boolean, _receiver: string}, bigint>(
    abi, '0x82a08490'
  ),
  directPoolDeposit: new Func<[_token: string], {_token: string}, []>(
    abi, '0x5f7bc119'
  ),
  errorController: new Func<[], {}, string>(
    abi, '0x48f35cbb'
  ),
  errors: new Func<[_: bigint], {}, string>(
    abi, '0xfed1a606'
  ),
  feeReserves: new Func<[_: string], {}, bigint>(
    abi, '0x1ce9cb8f'
  ),
  fundingInterval: new Func<[], {}, bigint>(
    abi, '0x9849e412'
  ),
  fundingRateFactor: new Func<[], {}, bigint>(
    abi, '0xc4f718bf'
  ),
  getDelta: new Func<[_indexToken: string, _size: bigint, _averagePrice: bigint, _isLong: boolean, _lastIncreasedTime: bigint], {_indexToken: string, _size: bigint, _averagePrice: bigint, _isLong: boolean, _lastIncreasedTime: bigint}, [_: boolean, _: bigint]>(
    abi, '0x5c07eaab'
  ),
  getFeeBasisPoints: new Func<[_token: string, _usdgDelta: bigint, _feeBasisPoints: bigint, _taxBasisPoints: bigint, _increment: boolean], {_token: string, _usdgDelta: bigint, _feeBasisPoints: bigint, _taxBasisPoints: bigint, _increment: boolean}, bigint>(
    abi, '0xc7e074c3'
  ),
  getFundingFee: new Func<[_token: string, _size: bigint, _entryFundingRate: bigint], {_token: string, _size: bigint, _entryFundingRate: bigint}, bigint>(
    abi, '0xcc5b8144'
  ),
  getGlobalShortDelta: new Func<[_token: string], {_token: string}, [_: boolean, _: bigint]>(
    abi, '0xb364accb'
  ),
  getMaxPrice: new Func<[_token: string], {_token: string}, bigint>(
    abi, '0xe124e6d2'
  ),
  getMinPrice: new Func<[_token: string], {_token: string}, bigint>(
    abi, '0x81a612d6'
  ),
  getNextAveragePrice: new Func<[_indexToken: string, _size: bigint, _averagePrice: bigint, _isLong: boolean, _nextPrice: bigint, _sizeDelta: bigint, _lastIncreasedTime: bigint], {_indexToken: string, _size: bigint, _averagePrice: bigint, _isLong: boolean, _nextPrice: bigint, _sizeDelta: bigint, _lastIncreasedTime: bigint}, bigint>(
    abi, '0xdb97495f'
  ),
  getNextFundingRate: new Func<[_token: string], {_token: string}, bigint>(
    abi, '0xa93acac2'
  ),
  getNextGlobalShortAveragePrice: new Func<[_indexToken: string, _nextPrice: bigint, _sizeDelta: bigint], {_indexToken: string, _nextPrice: bigint, _sizeDelta: bigint}, bigint>(
    abi, '0x9d7432ca'
  ),
  getPosition: new Func<[_account: string, _collateralToken: string, _indexToken: string, _isLong: boolean], {_account: string, _collateralToken: string, _indexToken: string, _isLong: boolean}, [_: bigint, _: bigint, _: bigint, _: bigint, _: bigint, _: bigint, _: boolean, _: bigint]>(
    abi, '0x4a3f088d'
  ),
  getPositionDelta: new Func<[_account: string, _collateralToken: string, _indexToken: string, _isLong: boolean], {_account: string, _collateralToken: string, _indexToken: string, _isLong: boolean}, [_: boolean, _: bigint]>(
    abi, '0x45a6f370'
  ),
  getPositionFee: new Func<[_sizeDelta: bigint], {_sizeDelta: bigint}, bigint>(
    abi, '0x17bbf25c'
  ),
  getPositionKey: new Func<[_account: string, _collateralToken: string, _indexToken: string, _isLong: boolean], {_account: string, _collateralToken: string, _indexToken: string, _isLong: boolean}, string>(
    abi, '0x2d4b0576'
  ),
  getPositionLeverage: new Func<[_account: string, _collateralToken: string, _indexToken: string, _isLong: boolean], {_account: string, _collateralToken: string, _indexToken: string, _isLong: boolean}, bigint>(
    abi, '0x51723e82'
  ),
  getRedemptionAmount: new Func<[_token: string, _usdgAmount: bigint], {_token: string, _usdgAmount: bigint}, bigint>(
    abi, '0x2c668ec1'
  ),
  getRedemptionCollateral: new Func<[_token: string], {_token: string}, bigint>(
    abi, '0xb136ca49'
  ),
  getRedemptionCollateralUsd: new Func<[_token: string], {_token: string}, bigint>(
    abi, '0x29ff9615'
  ),
  getTargetUsdgAmount: new Func<[_token: string], {_token: string}, bigint>(
    abi, '0x3a05dcc1'
  ),
  getUtilisation: new Func<[_token: string], {_token: string}, bigint>(
    abi, '0x04fef1db'
  ),
  globalShortAveragePrices: new Func<[_: string], {}, bigint>(
    abi, '0x62749803'
  ),
  globalShortSizes: new Func<[_: string], {}, bigint>(
    abi, '0x8a78daa8'
  ),
  gov: new Func<[], {}, string>(
    abi, '0x12d43a51'
  ),
  guaranteedUsd: new Func<[_: string], {}, bigint>(
    abi, '0xf07456ce'
  ),
  hasDynamicFees: new Func<[], {}, boolean>(
    abi, '0x9f392eb3'
  ),
  inManagerMode: new Func<[], {}, boolean>(
    abi, '0x9060b1ca'
  ),
  inPrivateLiquidationMode: new Func<[], {}, boolean>(
    abi, '0x181e210e'
  ),
  includeAmmPrice: new Func<[], {}, boolean>(
    abi, '0xab08c1c6'
  ),
  increasePosition: new Func<[_account: string, _collateralToken: string, _indexToken: string, _sizeDelta: bigint, _isLong: boolean], {_account: string, _collateralToken: string, _indexToken: string, _sizeDelta: bigint, _isLong: boolean}, []>(
    abi, '0x48d91abf'
  ),
  initialize: new Func<[_router: string, _usdg: string, _priceFeed: string, _liquidationFeeUsd: bigint, _fundingRateFactor: bigint, _stableFundingRateFactor: bigint], {_router: string, _usdg: string, _priceFeed: string, _liquidationFeeUsd: bigint, _fundingRateFactor: bigint, _stableFundingRateFactor: bigint}, []>(
    abi, '0x728cdbca'
  ),
  isInitialized: new Func<[], {}, boolean>(
    abi, '0x392e53cd'
  ),
  isLeverageEnabled: new Func<[], {}, boolean>(
    abi, '0x3e72a262'
  ),
  isLiquidator: new Func<[_: string], {}, boolean>(
    abi, '0x529a356f'
  ),
  isManager: new Func<[_: string], {}, boolean>(
    abi, '0xf3ae2415'
  ),
  isSwapEnabled: new Func<[], {}, boolean>(
    abi, '0x351a964d'
  ),
  lastFundingTimes: new Func<[_: string], {}, bigint>(
    abi, '0xd8f897c3'
  ),
  liquidatePosition: new Func<[_account: string, _collateralToken: string, _indexToken: string, _isLong: boolean, _feeReceiver: string], {_account: string, _collateralToken: string, _indexToken: string, _isLong: boolean, _feeReceiver: string}, []>(
    abi, '0xde2ea948'
  ),
  liquidationFeeUsd: new Func<[], {}, bigint>(
    abi, '0x174d2694'
  ),
  marginFeeBasisPoints: new Func<[], {}, bigint>(
    abi, '0x318bc689'
  ),
  maxGasPrice: new Func<[], {}, bigint>(
    abi, '0x3de39c11'
  ),
  maxLeverage: new Func<[], {}, bigint>(
    abi, '0xae3302c2'
  ),
  maxUsdgAmounts: new Func<[_: string], {}, bigint>(
    abi, '0xad1e4f8d'
  ),
  minProfitBasisPoints: new Func<[_: string], {}, bigint>(
    abi, '0x88b1fbdf'
  ),
  minProfitTime: new Func<[], {}, bigint>(
    abi, '0xd9ac4225'
  ),
  mintBurnFeeBasisPoints: new Func<[], {}, bigint>(
    abi, '0x4d47b304'
  ),
  poolAmounts: new Func<[_: string], {}, bigint>(
    abi, '0x52f55eed'
  ),
  positions: new Func<[_: string], {}, ([size: bigint, collateral: bigint, averagePrice: bigint, entryFundingRate: bigint, reserveAmount: bigint, realisedPnl: bigint, lastIncreasedTime: bigint] & {size: bigint, collateral: bigint, averagePrice: bigint, entryFundingRate: bigint, reserveAmount: bigint, realisedPnl: bigint, lastIncreasedTime: bigint})>(
    abi, '0x514ea4bf'
  ),
  priceFeed: new Func<[], {}, string>(
    abi, '0x741bef1a'
  ),
  removeRouter: new Func<[_router: string], {_router: string}, []>(
    abi, '0x6ae0b154'
  ),
  reservedAmounts: new Func<[_: string], {}, bigint>(
    abi, '0xc3c7b9e9'
  ),
  router: new Func<[], {}, string>(
    abi, '0xf887ea40'
  ),
  sellUSDG: new Func<[_token: string, _receiver: string], {_token: string, _receiver: string}, bigint>(
    abi, '0x711e6190'
  ),
  setBufferAmount: new Func<[_token: string, _amount: bigint], {_token: string, _amount: bigint}, []>(
    abi, '0x8585f4d2'
  ),
  setError: new Func<[_errorCode: bigint, _error: string], {_errorCode: bigint, _error: string}, []>(
    abi, '0x28e67be5'
  ),
  setErrorController: new Func<[_errorController: string], {_errorController: string}, []>(
    abi, '0x8f7b8404'
  ),
  setFees: new Func<[_taxBasisPoints: bigint, _stableTaxBasisPoints: bigint, _mintBurnFeeBasisPoints: bigint, _swapFeeBasisPoints: bigint, _stableSwapFeeBasisPoints: bigint, _marginFeeBasisPoints: bigint, _liquidationFeeUsd: bigint, _minProfitTime: bigint, _hasDynamicFees: boolean], {_taxBasisPoints: bigint, _stableTaxBasisPoints: bigint, _mintBurnFeeBasisPoints: bigint, _swapFeeBasisPoints: bigint, _stableSwapFeeBasisPoints: bigint, _marginFeeBasisPoints: bigint, _liquidationFeeUsd: bigint, _minProfitTime: bigint, _hasDynamicFees: boolean}, []>(
    abi, '0x40eb3802'
  ),
  setFundingRate: new Func<[_fundingInterval: bigint, _fundingRateFactor: bigint, _stableFundingRateFactor: bigint], {_fundingInterval: bigint, _fundingRateFactor: bigint, _stableFundingRateFactor: bigint}, []>(
    abi, '0x8a27d468'
  ),
  setGov: new Func<[_gov: string], {_gov: string}, []>(
    abi, '0xcfad57a2'
  ),
  setInManagerMode: new Func<[_inManagerMode: boolean], {_inManagerMode: boolean}, []>(
    abi, '0x24b0c04d'
  ),
  setInPrivateLiquidationMode: new Func<[_inPrivateLiquidationMode: boolean], {_inPrivateLiquidationMode: boolean}, []>(
    abi, '0xf07bbf77'
  ),
  setIsLeverageEnabled: new Func<[_isLeverageEnabled: boolean], {_isLeverageEnabled: boolean}, []>(
    abi, '0x7c2eb9f7'
  ),
  setIsSwapEnabled: new Func<[_isSwapEnabled: boolean], {_isSwapEnabled: boolean}, []>(
    abi, '0x30455ede'
  ),
  setLiquidator: new Func<[_liquidator: string, _isActive: boolean], {_liquidator: string, _isActive: boolean}, []>(
    abi, '0x4453a374'
  ),
  setManager: new Func<[_manager: string, _isManager: boolean], {_manager: string, _isManager: boolean}, []>(
    abi, '0xa5e90eee'
  ),
  setMaxGasPrice: new Func<[_maxGasPrice: bigint], {_maxGasPrice: bigint}, []>(
    abi, '0xd2fa635e'
  ),
  setMaxLeverage: new Func<[_maxLeverage: bigint], {_maxLeverage: bigint}, []>(
    abi, '0xd3127e63'
  ),
  setPriceFeed: new Func<[_priceFeed: string], {_priceFeed: string}, []>(
    abi, '0x724e78da'
  ),
  setTokenConfig: new Func<[_token: string, _tokenDecimals: bigint, _tokenWeight: bigint, _minProfitBps: bigint, _maxUsdgAmount: bigint, _isStable: boolean, _isShortable: boolean], {_token: string, _tokenDecimals: bigint, _tokenWeight: bigint, _minProfitBps: bigint, _maxUsdgAmount: bigint, _isStable: boolean, _isShortable: boolean}, []>(
    abi, '0x3c5a6e35'
  ),
  setUsdgAmount: new Func<[_token: string, _amount: bigint], {_token: string, _amount: bigint}, []>(
    abi, '0xd66b000d'
  ),
  shortableTokens: new Func<[_: string], {}, boolean>(
    abi, '0xdb3555fb'
  ),
  stableFundingRateFactor: new Func<[], {}, bigint>(
    abi, '0x134ca63b'
  ),
  stableSwapFeeBasisPoints: new Func<[], {}, bigint>(
    abi, '0xdf73a267'
  ),
  stableTaxBasisPoints: new Func<[], {}, bigint>(
    abi, '0x10eb56c2'
  ),
  stableTokens: new Func<[_: string], {}, boolean>(
    abi, '0x42b60b03'
  ),
  swap: new Func<[_tokenIn: string, _tokenOut: string, _receiver: string], {_tokenIn: string, _tokenOut: string, _receiver: string}, bigint>(
    abi, '0x93316212'
  ),
  swapFeeBasisPoints: new Func<[], {}, bigint>(
    abi, '0xa22f2392'
  ),
  taxBasisPoints: new Func<[], {}, bigint>(
    abi, '0x7a210a2b'
  ),
  tokenBalances: new Func<[_: string], {}, bigint>(
    abi, '0x523fba7f'
  ),
  tokenDecimals: new Func<[_: string], {}, bigint>(
    abi, '0x8ee573ac'
  ),
  tokenToUsdMin: new Func<[_token: string, _tokenAmount: bigint], {_token: string, _tokenAmount: bigint}, bigint>(
    abi, '0x0a48d5a9'
  ),
  tokenWeights: new Func<[_: string], {}, bigint>(
    abi, '0xab2f3ad4'
  ),
  totalTokenWeights: new Func<[], {}, bigint>(
    abi, '0xdc8f5fac'
  ),
  updateCumulativeFundingRate: new Func<[_token: string], {_token: string}, []>(
    abi, '0x13f1e736'
  ),
  upgradeVault: new Func<[_newVault: string, _token: string, _amount: bigint], {_newVault: string, _token: string, _amount: bigint}, []>(
    abi, '0xcea0c328'
  ),
  usdToToken: new Func<[_token: string, _usdAmount: bigint, _price: bigint], {_token: string, _usdAmount: bigint, _price: bigint}, bigint>(
    abi, '0xfa12dbc0'
  ),
  usdToTokenMax: new Func<[_token: string, _usdAmount: bigint], {_token: string, _usdAmount: bigint}, bigint>(
    abi, '0xa42ab3d2'
  ),
  usdToTokenMin: new Func<[_token: string, _usdAmount: bigint], {_token: string, _usdAmount: bigint}, bigint>(
    abi, '0x9899cd02'
  ),
  usdg: new Func<[], {}, string>(
    abi, '0xf5b91b7b'
  ),
  usdgAmounts: new Func<[_: string], {}, bigint>(
    abi, '0x1aa4ace5'
  ),
  useSwapPricing: new Func<[], {}, boolean>(
    abi, '0xb06423f3'
  ),
  validateLiquidation: new Func<[_account: string, _collateralToken: string, _indexToken: string, _isLong: boolean, _raise: boolean], {_account: string, _collateralToken: string, _indexToken: string, _isLong: boolean, _raise: boolean}, [_: bigint, _: bigint]>(
    abi, '0xd54d5a9f'
  ),
  whitelistedTokenCount: new Func<[], {}, bigint>(
    abi, '0x62287a32'
  ),
  whitelistedTokens: new Func<[_: string], {}, boolean>(
    abi, '0xdaf9c210'
  ),
  withdrawFees: new Func<[_token: string, _receiver: string], {_token: string, _receiver: string}, bigint>(
    abi, '0xf2555278'
  ),
}

export class Contract extends ContractBase {

  BASIS_POINTS_DIVISOR(): Promise<bigint> {
    return this.eth_call(functions.BASIS_POINTS_DIVISOR, [])
  }

  FUNDING_RATE_PRECISION(): Promise<bigint> {
    return this.eth_call(functions.FUNDING_RATE_PRECISION, [])
  }

  MAX_FEE_BASIS_POINTS(): Promise<bigint> {
    return this.eth_call(functions.MAX_FEE_BASIS_POINTS, [])
  }

  MAX_FUNDING_RATE_FACTOR(): Promise<bigint> {
    return this.eth_call(functions.MAX_FUNDING_RATE_FACTOR, [])
  }

  MAX_LIQUIDATION_FEE_USD(): Promise<bigint> {
    return this.eth_call(functions.MAX_LIQUIDATION_FEE_USD, [])
  }

  MIN_FUNDING_RATE_INTERVAL(): Promise<bigint> {
    return this.eth_call(functions.MIN_FUNDING_RATE_INTERVAL, [])
  }

  MIN_LEVERAGE(): Promise<bigint> {
    return this.eth_call(functions.MIN_LEVERAGE, [])
  }

  PRICE_PRECISION(): Promise<bigint> {
    return this.eth_call(functions.PRICE_PRECISION, [])
  }

  USDG_DECIMALS(): Promise<bigint> {
    return this.eth_call(functions.USDG_DECIMALS, [])
  }

  adjustForDecimals(_amount: bigint, _tokenDiv: string, _tokenMul: string): Promise<bigint> {
    return this.eth_call(functions.adjustForDecimals, [_amount, _tokenDiv, _tokenMul])
  }

  allWhitelistedTokens(arg0: bigint): Promise<string> {
    return this.eth_call(functions.allWhitelistedTokens, [arg0])
  }

  allWhitelistedTokensLength(): Promise<bigint> {
    return this.eth_call(functions.allWhitelistedTokensLength, [])
  }

  approvedRouters(arg0: string, arg1: string): Promise<boolean> {
    return this.eth_call(functions.approvedRouters, [arg0, arg1])
  }

  bufferAmounts(arg0: string): Promise<bigint> {
    return this.eth_call(functions.bufferAmounts, [arg0])
  }

  cumulativeFundingRates(arg0: string): Promise<bigint> {
    return this.eth_call(functions.cumulativeFundingRates, [arg0])
  }

  errorController(): Promise<string> {
    return this.eth_call(functions.errorController, [])
  }

  errors(arg0: bigint): Promise<string> {
    return this.eth_call(functions.errors, [arg0])
  }

  feeReserves(arg0: string): Promise<bigint> {
    return this.eth_call(functions.feeReserves, [arg0])
  }

  fundingInterval(): Promise<bigint> {
    return this.eth_call(functions.fundingInterval, [])
  }

  fundingRateFactor(): Promise<bigint> {
    return this.eth_call(functions.fundingRateFactor, [])
  }

  getDelta(_indexToken: string, _size: bigint, _averagePrice: bigint, _isLong: boolean, _lastIncreasedTime: bigint): Promise<[_: boolean, _: bigint]> {
    return this.eth_call(functions.getDelta, [_indexToken, _size, _averagePrice, _isLong, _lastIncreasedTime])
  }

  getFeeBasisPoints(_token: string, _usdgDelta: bigint, _feeBasisPoints: bigint, _taxBasisPoints: bigint, _increment: boolean): Promise<bigint> {
    return this.eth_call(functions.getFeeBasisPoints, [_token, _usdgDelta, _feeBasisPoints, _taxBasisPoints, _increment])
  }

  getFundingFee(_token: string, _size: bigint, _entryFundingRate: bigint): Promise<bigint> {
    return this.eth_call(functions.getFundingFee, [_token, _size, _entryFundingRate])
  }

  getGlobalShortDelta(_token: string): Promise<[_: boolean, _: bigint]> {
    return this.eth_call(functions.getGlobalShortDelta, [_token])
  }

  getMaxPrice(_token: string): Promise<bigint> {
    return this.eth_call(functions.getMaxPrice, [_token])
  }

  getMinPrice(_token: string): Promise<bigint> {
    return this.eth_call(functions.getMinPrice, [_token])
  }

  getNextAveragePrice(_indexToken: string, _size: bigint, _averagePrice: bigint, _isLong: boolean, _nextPrice: bigint, _sizeDelta: bigint, _lastIncreasedTime: bigint): Promise<bigint> {
    return this.eth_call(functions.getNextAveragePrice, [_indexToken, _size, _averagePrice, _isLong, _nextPrice, _sizeDelta, _lastIncreasedTime])
  }

  getNextFundingRate(_token: string): Promise<bigint> {
    return this.eth_call(functions.getNextFundingRate, [_token])
  }

  getNextGlobalShortAveragePrice(_indexToken: string, _nextPrice: bigint, _sizeDelta: bigint): Promise<bigint> {
    return this.eth_call(functions.getNextGlobalShortAveragePrice, [_indexToken, _nextPrice, _sizeDelta])
  }

  getPosition(_account: string, _collateralToken: string, _indexToken: string, _isLong: boolean): Promise<[_: bigint, _: bigint, _: bigint, _: bigint, _: bigint, _: bigint, _: boolean, _: bigint]> {
    return this.eth_call(functions.getPosition, [_account, _collateralToken, _indexToken, _isLong])
  }

  getPositionDelta(_account: string, _collateralToken: string, _indexToken: string, _isLong: boolean): Promise<[_: boolean, _: bigint]> {
    return this.eth_call(functions.getPositionDelta, [_account, _collateralToken, _indexToken, _isLong])
  }

  getPositionFee(_sizeDelta: bigint): Promise<bigint> {
    return this.eth_call(functions.getPositionFee, [_sizeDelta])
  }

  getPositionKey(_account: string, _collateralToken: string, _indexToken: string, _isLong: boolean): Promise<string> {
    return this.eth_call(functions.getPositionKey, [_account, _collateralToken, _indexToken, _isLong])
  }

  getPositionLeverage(_account: string, _collateralToken: string, _indexToken: string, _isLong: boolean): Promise<bigint> {
    return this.eth_call(functions.getPositionLeverage, [_account, _collateralToken, _indexToken, _isLong])
  }

  getRedemptionAmount(_token: string, _usdgAmount: bigint): Promise<bigint> {
    return this.eth_call(functions.getRedemptionAmount, [_token, _usdgAmount])
  }

  getRedemptionCollateral(_token: string): Promise<bigint> {
    return this.eth_call(functions.getRedemptionCollateral, [_token])
  }

  getRedemptionCollateralUsd(_token: string): Promise<bigint> {
    return this.eth_call(functions.getRedemptionCollateralUsd, [_token])
  }

  getTargetUsdgAmount(_token: string): Promise<bigint> {
    return this.eth_call(functions.getTargetUsdgAmount, [_token])
  }

  getUtilisation(_token: string): Promise<bigint> {
    return this.eth_call(functions.getUtilisation, [_token])
  }

  globalShortAveragePrices(arg0: string): Promise<bigint> {
    return this.eth_call(functions.globalShortAveragePrices, [arg0])
  }

  globalShortSizes(arg0: string): Promise<bigint> {
    return this.eth_call(functions.globalShortSizes, [arg0])
  }

  gov(): Promise<string> {
    return this.eth_call(functions.gov, [])
  }

  guaranteedUsd(arg0: string): Promise<bigint> {
    return this.eth_call(functions.guaranteedUsd, [arg0])
  }

  hasDynamicFees(): Promise<boolean> {
    return this.eth_call(functions.hasDynamicFees, [])
  }

  inManagerMode(): Promise<boolean> {
    return this.eth_call(functions.inManagerMode, [])
  }

  inPrivateLiquidationMode(): Promise<boolean> {
    return this.eth_call(functions.inPrivateLiquidationMode, [])
  }

  includeAmmPrice(): Promise<boolean> {
    return this.eth_call(functions.includeAmmPrice, [])
  }

  isInitialized(): Promise<boolean> {
    return this.eth_call(functions.isInitialized, [])
  }

  isLeverageEnabled(): Promise<boolean> {
    return this.eth_call(functions.isLeverageEnabled, [])
  }

  isLiquidator(arg0: string): Promise<boolean> {
    return this.eth_call(functions.isLiquidator, [arg0])
  }

  isManager(arg0: string): Promise<boolean> {
    return this.eth_call(functions.isManager, [arg0])
  }

  isSwapEnabled(): Promise<boolean> {
    return this.eth_call(functions.isSwapEnabled, [])
  }

  lastFundingTimes(arg0: string): Promise<bigint> {
    return this.eth_call(functions.lastFundingTimes, [arg0])
  }

  liquidationFeeUsd(): Promise<bigint> {
    return this.eth_call(functions.liquidationFeeUsd, [])
  }

  marginFeeBasisPoints(): Promise<bigint> {
    return this.eth_call(functions.marginFeeBasisPoints, [])
  }

  maxGasPrice(): Promise<bigint> {
    return this.eth_call(functions.maxGasPrice, [])
  }

  maxLeverage(): Promise<bigint> {
    return this.eth_call(functions.maxLeverage, [])
  }

  maxUsdgAmounts(arg0: string): Promise<bigint> {
    return this.eth_call(functions.maxUsdgAmounts, [arg0])
  }

  minProfitBasisPoints(arg0: string): Promise<bigint> {
    return this.eth_call(functions.minProfitBasisPoints, [arg0])
  }

  minProfitTime(): Promise<bigint> {
    return this.eth_call(functions.minProfitTime, [])
  }

  mintBurnFeeBasisPoints(): Promise<bigint> {
    return this.eth_call(functions.mintBurnFeeBasisPoints, [])
  }

  poolAmounts(arg0: string): Promise<bigint> {
    return this.eth_call(functions.poolAmounts, [arg0])
  }

  positions(arg0: string): Promise<([size: bigint, collateral: bigint, averagePrice: bigint, entryFundingRate: bigint, reserveAmount: bigint, realisedPnl: bigint, lastIncreasedTime: bigint] & {size: bigint, collateral: bigint, averagePrice: bigint, entryFundingRate: bigint, reserveAmount: bigint, realisedPnl: bigint, lastIncreasedTime: bigint})> {
    return this.eth_call(functions.positions, [arg0])
  }

  priceFeed(): Promise<string> {
    return this.eth_call(functions.priceFeed, [])
  }

  reservedAmounts(arg0: string): Promise<bigint> {
    return this.eth_call(functions.reservedAmounts, [arg0])
  }

  router(): Promise<string> {
    return this.eth_call(functions.router, [])
  }

  shortableTokens(arg0: string): Promise<boolean> {
    return this.eth_call(functions.shortableTokens, [arg0])
  }

  stableFundingRateFactor(): Promise<bigint> {
    return this.eth_call(functions.stableFundingRateFactor, [])
  }

  stableSwapFeeBasisPoints(): Promise<bigint> {
    return this.eth_call(functions.stableSwapFeeBasisPoints, [])
  }

  stableTaxBasisPoints(): Promise<bigint> {
    return this.eth_call(functions.stableTaxBasisPoints, [])
  }

  stableTokens(arg0: string): Promise<boolean> {
    return this.eth_call(functions.stableTokens, [arg0])
  }

  swapFeeBasisPoints(): Promise<bigint> {
    return this.eth_call(functions.swapFeeBasisPoints, [])
  }

  taxBasisPoints(): Promise<bigint> {
    return this.eth_call(functions.taxBasisPoints, [])
  }

  tokenBalances(arg0: string): Promise<bigint> {
    return this.eth_call(functions.tokenBalances, [arg0])
  }

  tokenDecimals(arg0: string): Promise<bigint> {
    return this.eth_call(functions.tokenDecimals, [arg0])
  }

  tokenToUsdMin(_token: string, _tokenAmount: bigint): Promise<bigint> {
    return this.eth_call(functions.tokenToUsdMin, [_token, _tokenAmount])
  }

  tokenWeights(arg0: string): Promise<bigint> {
    return this.eth_call(functions.tokenWeights, [arg0])
  }

  totalTokenWeights(): Promise<bigint> {
    return this.eth_call(functions.totalTokenWeights, [])
  }

  usdToToken(_token: string, _usdAmount: bigint, _price: bigint): Promise<bigint> {
    return this.eth_call(functions.usdToToken, [_token, _usdAmount, _price])
  }

  usdToTokenMax(_token: string, _usdAmount: bigint): Promise<bigint> {
    return this.eth_call(functions.usdToTokenMax, [_token, _usdAmount])
  }

  usdToTokenMin(_token: string, _usdAmount: bigint): Promise<bigint> {
    return this.eth_call(functions.usdToTokenMin, [_token, _usdAmount])
  }

  usdg(): Promise<string> {
    return this.eth_call(functions.usdg, [])
  }

  usdgAmounts(arg0: string): Promise<bigint> {
    return this.eth_call(functions.usdgAmounts, [arg0])
  }

  useSwapPricing(): Promise<boolean> {
    return this.eth_call(functions.useSwapPricing, [])
  }

  validateLiquidation(_account: string, _collateralToken: string, _indexToken: string, _isLong: boolean, _raise: boolean): Promise<[_: bigint, _: bigint]> {
    return this.eth_call(functions.validateLiquidation, [_account, _collateralToken, _indexToken, _isLong, _raise])
  }

  whitelistedTokenCount(): Promise<bigint> {
    return this.eth_call(functions.whitelistedTokenCount, [])
  }

  whitelistedTokens(arg0: string): Promise<boolean> {
    return this.eth_call(functions.whitelistedTokens, [arg0])
  }
}
