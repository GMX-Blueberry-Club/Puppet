export const ABI_JSON = [
    {
        "type": "constructor",
        "stateMutability": "undefined",
        "payable": false,
        "inputs": []
    },
    {
        "type": "event",
        "anonymous": false,
        "name": "BuyUSDG",
        "inputs": [
            {
                "type": "address",
                "name": "account",
                "indexed": false
            },
            {
                "type": "address",
                "name": "token",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "tokenAmount",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "usdgAmount",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "feeBasisPoints",
                "indexed": false
            }
        ]
    },
    {
        "type": "event",
        "anonymous": false,
        "name": "ClosePosition",
        "inputs": [
            {
                "type": "bytes32",
                "name": "key",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "size",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "collateral",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "averagePrice",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "entryFundingRate",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "reserveAmount",
                "indexed": false
            },
            {
                "type": "int256",
                "name": "realisedPnl",
                "indexed": false
            }
        ]
    },
    {
        "type": "event",
        "anonymous": false,
        "name": "CollectMarginFees",
        "inputs": [
            {
                "type": "address",
                "name": "token",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "feeUsd",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "feeTokens",
                "indexed": false
            }
        ]
    },
    {
        "type": "event",
        "anonymous": false,
        "name": "CollectSwapFees",
        "inputs": [
            {
                "type": "address",
                "name": "token",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "feeUsd",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "feeTokens",
                "indexed": false
            }
        ]
    },
    {
        "type": "event",
        "anonymous": false,
        "name": "DecreaseGuaranteedUsd",
        "inputs": [
            {
                "type": "address",
                "name": "token",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "amount",
                "indexed": false
            }
        ]
    },
    {
        "type": "event",
        "anonymous": false,
        "name": "DecreasePoolAmount",
        "inputs": [
            {
                "type": "address",
                "name": "token",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "amount",
                "indexed": false
            }
        ]
    },
    {
        "type": "event",
        "anonymous": false,
        "name": "DecreasePosition",
        "inputs": [
            {
                "type": "bytes32",
                "name": "key",
                "indexed": false
            },
            {
                "type": "address",
                "name": "account",
                "indexed": false
            },
            {
                "type": "address",
                "name": "collateralToken",
                "indexed": false
            },
            {
                "type": "address",
                "name": "indexToken",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "collateralDelta",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "sizeDelta",
                "indexed": false
            },
            {
                "type": "bool",
                "name": "isLong",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "price",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "fee",
                "indexed": false
            }
        ]
    },
    {
        "type": "event",
        "anonymous": false,
        "name": "DecreaseReservedAmount",
        "inputs": [
            {
                "type": "address",
                "name": "token",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "amount",
                "indexed": false
            }
        ]
    },
    {
        "type": "event",
        "anonymous": false,
        "name": "DecreaseUsdgAmount",
        "inputs": [
            {
                "type": "address",
                "name": "token",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "amount",
                "indexed": false
            }
        ]
    },
    {
        "type": "event",
        "anonymous": false,
        "name": "DirectPoolDeposit",
        "inputs": [
            {
                "type": "address",
                "name": "token",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "amount",
                "indexed": false
            }
        ]
    },
    {
        "type": "event",
        "anonymous": false,
        "name": "IncreaseGuaranteedUsd",
        "inputs": [
            {
                "type": "address",
                "name": "token",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "amount",
                "indexed": false
            }
        ]
    },
    {
        "type": "event",
        "anonymous": false,
        "name": "IncreasePoolAmount",
        "inputs": [
            {
                "type": "address",
                "name": "token",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "amount",
                "indexed": false
            }
        ]
    },
    {
        "type": "event",
        "anonymous": false,
        "name": "IncreasePosition",
        "inputs": [
            {
                "type": "bytes32",
                "name": "key",
                "indexed": false
            },
            {
                "type": "address",
                "name": "account",
                "indexed": false
            },
            {
                "type": "address",
                "name": "collateralToken",
                "indexed": false
            },
            {
                "type": "address",
                "name": "indexToken",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "collateralDelta",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "sizeDelta",
                "indexed": false
            },
            {
                "type": "bool",
                "name": "isLong",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "price",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "fee",
                "indexed": false
            }
        ]
    },
    {
        "type": "event",
        "anonymous": false,
        "name": "IncreaseReservedAmount",
        "inputs": [
            {
                "type": "address",
                "name": "token",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "amount",
                "indexed": false
            }
        ]
    },
    {
        "type": "event",
        "anonymous": false,
        "name": "IncreaseUsdgAmount",
        "inputs": [
            {
                "type": "address",
                "name": "token",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "amount",
                "indexed": false
            }
        ]
    },
    {
        "type": "event",
        "anonymous": false,
        "name": "LiquidatePosition",
        "inputs": [
            {
                "type": "bytes32",
                "name": "key",
                "indexed": false
            },
            {
                "type": "address",
                "name": "account",
                "indexed": false
            },
            {
                "type": "address",
                "name": "collateralToken",
                "indexed": false
            },
            {
                "type": "address",
                "name": "indexToken",
                "indexed": false
            },
            {
                "type": "bool",
                "name": "isLong",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "size",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "collateral",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "reserveAmount",
                "indexed": false
            },
            {
                "type": "int256",
                "name": "realisedPnl",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "markPrice",
                "indexed": false
            }
        ]
    },
    {
        "type": "event",
        "anonymous": false,
        "name": "SellUSDG",
        "inputs": [
            {
                "type": "address",
                "name": "account",
                "indexed": false
            },
            {
                "type": "address",
                "name": "token",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "usdgAmount",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "tokenAmount",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "feeBasisPoints",
                "indexed": false
            }
        ]
    },
    {
        "type": "event",
        "anonymous": false,
        "name": "Swap",
        "inputs": [
            {
                "type": "address",
                "name": "account",
                "indexed": false
            },
            {
                "type": "address",
                "name": "tokenIn",
                "indexed": false
            },
            {
                "type": "address",
                "name": "tokenOut",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "amountIn",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "amountOut",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "amountOutAfterFees",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "feeBasisPoints",
                "indexed": false
            }
        ]
    },
    {
        "type": "event",
        "anonymous": false,
        "name": "UpdateFundingRate",
        "inputs": [
            {
                "type": "address",
                "name": "token",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "fundingRate",
                "indexed": false
            }
        ]
    },
    {
        "type": "event",
        "anonymous": false,
        "name": "UpdatePnl",
        "inputs": [
            {
                "type": "bytes32",
                "name": "key",
                "indexed": false
            },
            {
                "type": "bool",
                "name": "hasProfit",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "delta",
                "indexed": false
            }
        ]
    },
    {
        "type": "event",
        "anonymous": false,
        "name": "UpdatePosition",
        "inputs": [
            {
                "type": "bytes32",
                "name": "key",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "size",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "collateral",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "averagePrice",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "entryFundingRate",
                "indexed": false
            },
            {
                "type": "uint256",
                "name": "reserveAmount",
                "indexed": false
            },
            {
                "type": "int256",
                "name": "realisedPnl",
                "indexed": false
            }
        ]
    },
    {
        "type": "function",
        "name": "BASIS_POINTS_DIVISOR",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "FUNDING_RATE_PRECISION",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "MAX_FEE_BASIS_POINTS",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "MAX_FUNDING_RATE_FACTOR",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "MAX_LIQUIDATION_FEE_USD",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "MIN_FUNDING_RATE_INTERVAL",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "MIN_LEVERAGE",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "PRICE_PRECISION",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "USDG_DECIMALS",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "addRouter",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_router"
            }
        ],
        "outputs": []
    },
    {
        "type": "function",
        "name": "adjustForDecimals",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "uint256",
                "name": "_amount"
            },
            {
                "type": "address",
                "name": "_tokenDiv"
            },
            {
                "type": "address",
                "name": "_tokenMul"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "allWhitelistedTokens",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "uint256"
            }
        ],
        "outputs": [
            {
                "type": "address"
            }
        ]
    },
    {
        "type": "function",
        "name": "allWhitelistedTokensLength",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "approvedRouters",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address"
            },
            {
                "type": "address"
            }
        ],
        "outputs": [
            {
                "type": "bool"
            }
        ]
    },
    {
        "type": "function",
        "name": "bufferAmounts",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "buyUSDG",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_token"
            },
            {
                "type": "address",
                "name": "_receiver"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "clearTokenConfig",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_token"
            }
        ],
        "outputs": []
    },
    {
        "type": "function",
        "name": "cumulativeFundingRates",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "decreasePosition",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_account"
            },
            {
                "type": "address",
                "name": "_collateralToken"
            },
            {
                "type": "address",
                "name": "_indexToken"
            },
            {
                "type": "uint256",
                "name": "_collateralDelta"
            },
            {
                "type": "uint256",
                "name": "_sizeDelta"
            },
            {
                "type": "bool",
                "name": "_isLong"
            },
            {
                "type": "address",
                "name": "_receiver"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "directPoolDeposit",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_token"
            }
        ],
        "outputs": []
    },
    {
        "type": "function",
        "name": "errorController",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "address"
            }
        ]
    },
    {
        "type": "function",
        "name": "errors",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "uint256"
            }
        ],
        "outputs": [
            {
                "type": "string"
            }
        ]
    },
    {
        "type": "function",
        "name": "feeReserves",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "fundingInterval",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "fundingRateFactor",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "getDelta",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_indexToken"
            },
            {
                "type": "uint256",
                "name": "_size"
            },
            {
                "type": "uint256",
                "name": "_averagePrice"
            },
            {
                "type": "bool",
                "name": "_isLong"
            },
            {
                "type": "uint256",
                "name": "_lastIncreasedTime"
            }
        ],
        "outputs": [
            {
                "type": "bool"
            },
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "getFeeBasisPoints",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_token"
            },
            {
                "type": "uint256",
                "name": "_usdgDelta"
            },
            {
                "type": "uint256",
                "name": "_feeBasisPoints"
            },
            {
                "type": "uint256",
                "name": "_taxBasisPoints"
            },
            {
                "type": "bool",
                "name": "_increment"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "getFundingFee",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_token"
            },
            {
                "type": "uint256",
                "name": "_size"
            },
            {
                "type": "uint256",
                "name": "_entryFundingRate"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "getGlobalShortDelta",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_token"
            }
        ],
        "outputs": [
            {
                "type": "bool"
            },
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "getMaxPrice",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_token"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "getMinPrice",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_token"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "getNextAveragePrice",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_indexToken"
            },
            {
                "type": "uint256",
                "name": "_size"
            },
            {
                "type": "uint256",
                "name": "_averagePrice"
            },
            {
                "type": "bool",
                "name": "_isLong"
            },
            {
                "type": "uint256",
                "name": "_nextPrice"
            },
            {
                "type": "uint256",
                "name": "_sizeDelta"
            },
            {
                "type": "uint256",
                "name": "_lastIncreasedTime"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "getNextFundingRate",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_token"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "getNextGlobalShortAveragePrice",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_indexToken"
            },
            {
                "type": "uint256",
                "name": "_nextPrice"
            },
            {
                "type": "uint256",
                "name": "_sizeDelta"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "getPosition",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_account"
            },
            {
                "type": "address",
                "name": "_collateralToken"
            },
            {
                "type": "address",
                "name": "_indexToken"
            },
            {
                "type": "bool",
                "name": "_isLong"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            },
            {
                "type": "uint256"
            },
            {
                "type": "uint256"
            },
            {
                "type": "uint256"
            },
            {
                "type": "uint256"
            },
            {
                "type": "uint256"
            },
            {
                "type": "bool"
            },
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "getPositionDelta",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_account"
            },
            {
                "type": "address",
                "name": "_collateralToken"
            },
            {
                "type": "address",
                "name": "_indexToken"
            },
            {
                "type": "bool",
                "name": "_isLong"
            }
        ],
        "outputs": [
            {
                "type": "bool"
            },
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "getPositionFee",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "uint256",
                "name": "_sizeDelta"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "getPositionKey",
        "constant": true,
        "stateMutability": "pure",
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_account"
            },
            {
                "type": "address",
                "name": "_collateralToken"
            },
            {
                "type": "address",
                "name": "_indexToken"
            },
            {
                "type": "bool",
                "name": "_isLong"
            }
        ],
        "outputs": [
            {
                "type": "bytes32"
            }
        ]
    },
    {
        "type": "function",
        "name": "getPositionLeverage",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_account"
            },
            {
                "type": "address",
                "name": "_collateralToken"
            },
            {
                "type": "address",
                "name": "_indexToken"
            },
            {
                "type": "bool",
                "name": "_isLong"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "getRedemptionAmount",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_token"
            },
            {
                "type": "uint256",
                "name": "_usdgAmount"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "getRedemptionCollateral",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_token"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "getRedemptionCollateralUsd",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_token"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "getTargetUsdgAmount",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_token"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "getUtilisation",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_token"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "globalShortAveragePrices",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "globalShortSizes",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "gov",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "address"
            }
        ]
    },
    {
        "type": "function",
        "name": "guaranteedUsd",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "hasDynamicFees",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "bool"
            }
        ]
    },
    {
        "type": "function",
        "name": "inManagerMode",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "bool"
            }
        ]
    },
    {
        "type": "function",
        "name": "inPrivateLiquidationMode",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "bool"
            }
        ]
    },
    {
        "type": "function",
        "name": "includeAmmPrice",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "bool"
            }
        ]
    },
    {
        "type": "function",
        "name": "increasePosition",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_account"
            },
            {
                "type": "address",
                "name": "_collateralToken"
            },
            {
                "type": "address",
                "name": "_indexToken"
            },
            {
                "type": "uint256",
                "name": "_sizeDelta"
            },
            {
                "type": "bool",
                "name": "_isLong"
            }
        ],
        "outputs": []
    },
    {
        "type": "function",
        "name": "initialize",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_router"
            },
            {
                "type": "address",
                "name": "_usdg"
            },
            {
                "type": "address",
                "name": "_priceFeed"
            },
            {
                "type": "uint256",
                "name": "_liquidationFeeUsd"
            },
            {
                "type": "uint256",
                "name": "_fundingRateFactor"
            },
            {
                "type": "uint256",
                "name": "_stableFundingRateFactor"
            }
        ],
        "outputs": []
    },
    {
        "type": "function",
        "name": "isInitialized",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "bool"
            }
        ]
    },
    {
        "type": "function",
        "name": "isLeverageEnabled",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "bool"
            }
        ]
    },
    {
        "type": "function",
        "name": "isLiquidator",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address"
            }
        ],
        "outputs": [
            {
                "type": "bool"
            }
        ]
    },
    {
        "type": "function",
        "name": "isManager",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address"
            }
        ],
        "outputs": [
            {
                "type": "bool"
            }
        ]
    },
    {
        "type": "function",
        "name": "isSwapEnabled",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "bool"
            }
        ]
    },
    {
        "type": "function",
        "name": "lastFundingTimes",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "liquidatePosition",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_account"
            },
            {
                "type": "address",
                "name": "_collateralToken"
            },
            {
                "type": "address",
                "name": "_indexToken"
            },
            {
                "type": "bool",
                "name": "_isLong"
            },
            {
                "type": "address",
                "name": "_feeReceiver"
            }
        ],
        "outputs": []
    },
    {
        "type": "function",
        "name": "liquidationFeeUsd",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "marginFeeBasisPoints",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "maxGasPrice",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "maxLeverage",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "maxUsdgAmounts",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "minProfitBasisPoints",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "minProfitTime",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "mintBurnFeeBasisPoints",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "poolAmounts",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "positions",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "bytes32"
            }
        ],
        "outputs": [
            {
                "type": "uint256",
                "name": "size"
            },
            {
                "type": "uint256",
                "name": "collateral"
            },
            {
                "type": "uint256",
                "name": "averagePrice"
            },
            {
                "type": "uint256",
                "name": "entryFundingRate"
            },
            {
                "type": "uint256",
                "name": "reserveAmount"
            },
            {
                "type": "int256",
                "name": "realisedPnl"
            },
            {
                "type": "uint256",
                "name": "lastIncreasedTime"
            }
        ]
    },
    {
        "type": "function",
        "name": "priceFeed",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "address"
            }
        ]
    },
    {
        "type": "function",
        "name": "removeRouter",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_router"
            }
        ],
        "outputs": []
    },
    {
        "type": "function",
        "name": "reservedAmounts",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "router",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "address"
            }
        ]
    },
    {
        "type": "function",
        "name": "sellUSDG",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_token"
            },
            {
                "type": "address",
                "name": "_receiver"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "setBufferAmount",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_token"
            },
            {
                "type": "uint256",
                "name": "_amount"
            }
        ],
        "outputs": []
    },
    {
        "type": "function",
        "name": "setError",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "uint256",
                "name": "_errorCode"
            },
            {
                "type": "string",
                "name": "_error"
            }
        ],
        "outputs": []
    },
    {
        "type": "function",
        "name": "setErrorController",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_errorController"
            }
        ],
        "outputs": []
    },
    {
        "type": "function",
        "name": "setFees",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "uint256",
                "name": "_taxBasisPoints"
            },
            {
                "type": "uint256",
                "name": "_stableTaxBasisPoints"
            },
            {
                "type": "uint256",
                "name": "_mintBurnFeeBasisPoints"
            },
            {
                "type": "uint256",
                "name": "_swapFeeBasisPoints"
            },
            {
                "type": "uint256",
                "name": "_stableSwapFeeBasisPoints"
            },
            {
                "type": "uint256",
                "name": "_marginFeeBasisPoints"
            },
            {
                "type": "uint256",
                "name": "_liquidationFeeUsd"
            },
            {
                "type": "uint256",
                "name": "_minProfitTime"
            },
            {
                "type": "bool",
                "name": "_hasDynamicFees"
            }
        ],
        "outputs": []
    },
    {
        "type": "function",
        "name": "setFundingRate",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "uint256",
                "name": "_fundingInterval"
            },
            {
                "type": "uint256",
                "name": "_fundingRateFactor"
            },
            {
                "type": "uint256",
                "name": "_stableFundingRateFactor"
            }
        ],
        "outputs": []
    },
    {
        "type": "function",
        "name": "setGov",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_gov"
            }
        ],
        "outputs": []
    },
    {
        "type": "function",
        "name": "setInManagerMode",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "bool",
                "name": "_inManagerMode"
            }
        ],
        "outputs": []
    },
    {
        "type": "function",
        "name": "setInPrivateLiquidationMode",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "bool",
                "name": "_inPrivateLiquidationMode"
            }
        ],
        "outputs": []
    },
    {
        "type": "function",
        "name": "setIsLeverageEnabled",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "bool",
                "name": "_isLeverageEnabled"
            }
        ],
        "outputs": []
    },
    {
        "type": "function",
        "name": "setIsSwapEnabled",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "bool",
                "name": "_isSwapEnabled"
            }
        ],
        "outputs": []
    },
    {
        "type": "function",
        "name": "setLiquidator",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_liquidator"
            },
            {
                "type": "bool",
                "name": "_isActive"
            }
        ],
        "outputs": []
    },
    {
        "type": "function",
        "name": "setManager",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_manager"
            },
            {
                "type": "bool",
                "name": "_isManager"
            }
        ],
        "outputs": []
    },
    {
        "type": "function",
        "name": "setMaxGasPrice",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "uint256",
                "name": "_maxGasPrice"
            }
        ],
        "outputs": []
    },
    {
        "type": "function",
        "name": "setMaxLeverage",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "uint256",
                "name": "_maxLeverage"
            }
        ],
        "outputs": []
    },
    {
        "type": "function",
        "name": "setPriceFeed",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_priceFeed"
            }
        ],
        "outputs": []
    },
    {
        "type": "function",
        "name": "setTokenConfig",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_token"
            },
            {
                "type": "uint256",
                "name": "_tokenDecimals"
            },
            {
                "type": "uint256",
                "name": "_tokenWeight"
            },
            {
                "type": "uint256",
                "name": "_minProfitBps"
            },
            {
                "type": "uint256",
                "name": "_maxUsdgAmount"
            },
            {
                "type": "bool",
                "name": "_isStable"
            },
            {
                "type": "bool",
                "name": "_isShortable"
            }
        ],
        "outputs": []
    },
    {
        "type": "function",
        "name": "setUsdgAmount",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_token"
            },
            {
                "type": "uint256",
                "name": "_amount"
            }
        ],
        "outputs": []
    },
    {
        "type": "function",
        "name": "shortableTokens",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address"
            }
        ],
        "outputs": [
            {
                "type": "bool"
            }
        ]
    },
    {
        "type": "function",
        "name": "stableFundingRateFactor",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "stableSwapFeeBasisPoints",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "stableTaxBasisPoints",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "stableTokens",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address"
            }
        ],
        "outputs": [
            {
                "type": "bool"
            }
        ]
    },
    {
        "type": "function",
        "name": "swap",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_tokenIn"
            },
            {
                "type": "address",
                "name": "_tokenOut"
            },
            {
                "type": "address",
                "name": "_receiver"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "swapFeeBasisPoints",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "taxBasisPoints",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "tokenBalances",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "tokenDecimals",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "tokenToUsdMin",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_token"
            },
            {
                "type": "uint256",
                "name": "_tokenAmount"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "tokenWeights",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "totalTokenWeights",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "updateCumulativeFundingRate",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_token"
            }
        ],
        "outputs": []
    },
    {
        "type": "function",
        "name": "upgradeVault",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_newVault"
            },
            {
                "type": "address",
                "name": "_token"
            },
            {
                "type": "uint256",
                "name": "_amount"
            }
        ],
        "outputs": []
    },
    {
        "type": "function",
        "name": "usdToToken",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_token"
            },
            {
                "type": "uint256",
                "name": "_usdAmount"
            },
            {
                "type": "uint256",
                "name": "_price"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "usdToTokenMax",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_token"
            },
            {
                "type": "uint256",
                "name": "_usdAmount"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "usdToTokenMin",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_token"
            },
            {
                "type": "uint256",
                "name": "_usdAmount"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "usdg",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "address"
            }
        ]
    },
    {
        "type": "function",
        "name": "usdgAmounts",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "useSwapPricing",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "bool"
            }
        ]
    },
    {
        "type": "function",
        "name": "validateLiquidation",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_account"
            },
            {
                "type": "address",
                "name": "_collateralToken"
            },
            {
                "type": "address",
                "name": "_indexToken"
            },
            {
                "type": "bool",
                "name": "_isLong"
            },
            {
                "type": "bool",
                "name": "_raise"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            },
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "whitelistedTokenCount",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    },
    {
        "type": "function",
        "name": "whitelistedTokens",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "address"
            }
        ],
        "outputs": [
            {
                "type": "bool"
            }
        ]
    },
    {
        "type": "function",
        "name": "withdrawFees",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "address",
                "name": "_token"
            },
            {
                "type": "address",
                "name": "_receiver"
            }
        ],
        "outputs": [
            {
                "type": "uint256"
            }
        ]
    }
]
