export default [{ inputs:[{ components:[{ internalType:"contract Dictator", name:"dictator", type:"address" }, { internalType:"contract PuppetToken", name:"puppetToken", type:"address" }, { internalType:"contract IVault", name:"lp", type:"address" }, { internalType:"contract Router", name:"router", type:"address" }, { internalType:"contract PriceStore", name:"priceStore", type:"address" }, { internalType:"contract VotingEscrow", name:"votingEscrow", type:"address" }, { internalType:"contract WNT", name:"wnt", type:"address" }], internalType:"struct RewardRouter.RewardRouterParams", name:"_params", type:"tuple" }, { components:[{ internalType:"contract IVeRevenueDistributor", name:"revenueDistributor", type:"address" }, { internalType:"contract IDataStore", name:"dataStore", type:"address" }, { internalType:"contract RewardLogic", name:"rewardLogic", type:"address" }, { internalType:"contract OracleLogic", name:"oracleLogic", type:"address" }, { internalType:"contract IUniswapV3Pool[]", name:"wntUsdPoolList", type:"address[]" }, { internalType:"uint32", name:"wntUsdTwapInterval", type:"uint32" }, { internalType:"address", name:"dao", type:"address" }, { internalType:"contract IERC20", name:"revenueInToken", type:"address" }, { internalType:"bytes32", name:"poolId", type:"bytes32" }, { internalType:"uint256", name:"lockRate", type:"uint256" }, { internalType:"uint256", name:"exitRate", type:"uint256" }, { internalType:"uint256", name:"treasuryLockRate", type:"uint256" }, { internalType:"uint256", name:"treasuryExitRate", type:"uint256" }], internalType:"struct RewardRouter.RewardRouterConfigParams", name:"_config", type:"tuple" }], stateMutability:"nonpayable", type:"constructor" }, { inputs:[{ internalType:"address", name:"target", type:"address" }], name:"AddressEmptyCode", type:"error" }, { inputs:[{ internalType:"address", name:"account", type:"address" }], name:"AddressInsufficientBalance", type:"error" }, { inputs:[], name:"EmptyHoldingAddress", type:"error" }, { inputs:[], name:"EmptyReceiver", type:"error" }, { inputs:[{ internalType:"address", name:"token", type:"address" }], name:"EmptyTokenTranferGasLimit", type:"error" }, { inputs:[], name:"FailedInnerCall", type:"error" }, { inputs:[], name:"NoRouteTypeGiven", type:"error" }, { inputs:[], name:"ReentrancyGuardReentrantCall", type:"error" }, { inputs:[], name:"RewardRouter__AdjustOtherLock", type:"error" }, { inputs:[], name:"RewardRouter__InvalidWeightFactors", type:"error" }, { inputs:[], name:"RewardRouter__NotEnoughSources", type:"error" }, { inputs:[], name:"RewardRouter__PoolDoesNotExit", type:"error" }, { inputs:[], name:"RewardRouter__SourceCountNotOdd", type:"error" }, { inputs:[], name:"RewardRouter__UnacceptableTokenPrice", type:"error" }, { inputs:[{ internalType:"address", name:"token", type:"address" }], name:"SafeERC20FailedOperation", type:"error" }, { inputs:[{ internalType:"address", name:"token", type:"address" }, { internalType:"address", name:"receiver", type:"address" }, { internalType:"uint256", name:"amount", type:"uint256" }], name:"TokenTransferError", type:"error" }, { anonymous:false, inputs:[{ indexed:true, internalType:"address", name:"user", type:"address" }, { indexed:true, internalType:"contract Authority", name:"newAuthority", type:"address" }], name:"AuthorityUpdated", type:"event" }, { anonymous:false, inputs:[{ indexed:true, internalType:"address", name:"user", type:"address" }, { indexed:true, internalType:"address", name:"newOwner", type:"address" }], name:"OwnershipTransferred", type:"event" }, { anonymous:false, inputs:[{ indexed:false, internalType:"uint256", name:"lockRate", type:"uint256" }, { indexed:false, internalType:"uint256", name:"exitRate", type:"uint256" }, { indexed:false, internalType:"uint256", name:"treasuryLockRate", type:"uint256" }, { indexed:false, internalType:"uint256", name:"treasuryExitRate", type:"uint256" }], name:"RewardRouter__WeightRateSet", type:"event" }, { anonymous:false, inputs:[{ indexed:false, internalType:"string", name:"reason", type:"string" }, { indexed:false, internalType:"bytes", name:"returndata", type:"bytes" }], name:"TokenTransferReverted", type:"event" }, { inputs:[], name:"authority", outputs:[{ internalType:"contract Authority", name:"", type:"address" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"address", name:"to", type:"address" }], name:"claim", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"nonpayable", type:"function" }, { inputs:[{ internalType:"address", name:"daoAddress", type:"address" }], name:"configDaoAddress", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[{ internalType:"uint256", name:"_lockRate", type:"uint256" }, { internalType:"uint256", name:"_exitRate", type:"uint256" }, { internalType:"uint256", name:"_treasuryLockRate", type:"uint256" }, { internalType:"uint256", name:"_treasuryExitRate", type:"uint256" }], name:"configOptionDistributionRate", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[{ internalType:"contract IVault", name:"vault", type:"address" }, { internalType:"bytes32", name:"poolId", type:"bytes32" }], name:"configPoolId", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[{ internalType:"contract IERC20", name:"revenueInToken", type:"address" }], name:"configRevenueInToken", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[{ internalType:"contract IUniswapV3Pool[]", name:"wntUsdPoolList", type:"address[]" }], name:"configWntUsdPoolList", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[{ internalType:"uint32", name:"twapInterval", type:"uint32" }], name:"configWntUsdTwapInterval", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[{ internalType:"uint256", name:"maxAcceptableTokenPriceInUsdc", type:"uint256" }], name:"exit", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[{ internalType:"uint256", name:"unlockTime", type:"uint256" }, { internalType:"uint256", name:"maxAcceptableTokenPriceInUsdc", type:"uint256" }], name:"lock", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[{ internalType:"bytes[]", name:"data", type:"bytes[]" }], name:"multicall", outputs:[{ internalType:"bytes[]", name:"results", type:"bytes[]" }], stateMutability:"nonpayable", type:"function" }, { inputs:[], name:"owner", outputs:[{ internalType:"address", name:"", type:"address" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"bytes[]", name:"data", type:"bytes[]" }], name:"payableMulticall", outputs:[{ internalType:"bytes[]", name:"results", type:"bytes[]" }], stateMutability:"payable", type:"function" }, { inputs:[{ internalType:"contract IERC20", name:"token", type:"address" }, { internalType:"address", name:"from", type:"address" }, { internalType:"address", name:"to", type:"address" }, { internalType:"uint256", name:"amount", type:"uint256" }], name:"pluginTransfer", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[{ internalType:"contract IERC721", name:"token", type:"address" }, { internalType:"address", name:"from", type:"address" }, { internalType:"address", name:"to", type:"address" }, { internalType:"uint256", name:"tokenId", type:"uint256" }], name:"pluginTransferNft", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[], name:"router", outputs:[{ internalType:"contract Router", name:"", type:"address" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"address", name:"receiver", type:"address" }, { internalType:"uint256", name:"amount", type:"uint256" }], name:"sendNativeToken", outputs:[], stateMutability:"payable", type:"function" }, { inputs:[{ internalType:"contract IERC20", name:"token", type:"address" }, { internalType:"address", name:"receiver", type:"address" }, { internalType:"uint256", name:"amount", type:"uint256" }], name:"sendTokens", outputs:[], stateMutability:"payable", type:"function" }, { inputs:[{ internalType:"address", name:"receiver", type:"address" }, { internalType:"uint256", name:"amount", type:"uint256" }], name:"sendWnt", outputs:[], stateMutability:"payable", type:"function" }, { inputs:[{ internalType:"contract Authority", name:"newAuthority", type:"address" }], name:"setAuthority", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[{ internalType:"contract IDataStore", name:"dataStore", type:"address" }], name:"setDataStore", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[{ internalType:"address", name:"_holdingAddress", type:"address" }], name:"setHoldingAddress", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[{ internalType:"uint256", name:"_nativeTokenGasLimit", type:"uint256" }], name:"setNativeTokenGasLimit", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[{ internalType:"contract OracleLogic", name:"priceLogic", type:"address" }], name:"setPriceLogic", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[{ internalType:"contract RewardLogic", name:"rewardLogic", type:"address" }], name:"setRewardLogic", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[{ internalType:"address", name:"newOwner", type:"address" }], name:"transferOwnership", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[{ internalType:"uint256", name:"value", type:"uint256" }, { internalType:"address", name:"to", type:"address" }], name:"veDeposit", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[{ internalType:"address", name:"to", type:"address" }, { internalType:"uint256", name:"_tokenAmount", type:"uint256" }, { internalType:"uint256", name:"unlockTime", type:"uint256" }], name:"veLock", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[{ internalType:"address", name:"to", type:"address" }], name:"veWithdraw", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[], name:"wnt", outputs:[{ internalType:"contract WNT", name:"", type:"address" }], stateMutability:"view", type:"function" }] as const