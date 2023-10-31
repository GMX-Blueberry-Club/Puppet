export default [{ inputs:[{ internalType:"address", name:"_dataStore", type:"address" }, { internalType:"address", name:"_wntAddr", type:"address" }, { internalType:"address", name:"_routeReaderAddr", type:"address" }], stateMutability:"nonpayable", type:"constructor" }, { inputs:[], name:"basisPointsDivisor", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"pure", type:"function" }, { inputs:[{ internalType:"address", name:"_route", type:"address" }], name:"collateralToken", outputs:[{ internalType:"address", name:"", type:"address" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"address", name:"_token", type:"address" }], name:"collateralTokenDecimals", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[], name:"dataStore", outputs:[{ internalType:"contract IDataStore", name:"", type:"address" }], stateMutability:"view", type:"function" }, { inputs:[], name:"gmxDataStore", outputs:[{ internalType:"address", name:"", type:"address" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"address", name:"_route", type:"address" }], name:"indexToken", outputs:[{ internalType:"address", name:"", type:"address" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"address", name:"_token", type:"address" }], name:"isCollateralToken", outputs:[{ internalType:"bool", name:"", type:"bool" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"address", name:"_route", type:"address" }], name:"isLong", outputs:[{ internalType:"bool", name:"", type:"bool" }], stateMutability:"view", type:"function" }, { inputs:[], name:"isPaused", outputs:[{ internalType:"bool", name:"", type:"bool" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"bytes32", name:"_routeKey", type:"bytes32" }], name:"isPositionOpen", outputs:[{ internalType:"bool", name:"", type:"bool" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"bytes32", name:"_routeKey", type:"bytes32" }], name:"isRouteRegistered", outputs:[{ internalType:"bool", name:"", type:"bool" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"address", name:"_route", type:"address" }], name:"isRouteRegistered", outputs:[{ internalType:"bool", name:"", type:"bool" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"bytes32", name:"_routeTypeKey", type:"bytes32" }], name:"isRouteTypeRegistered", outputs:[{ internalType:"bool", name:"", type:"bool" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"bytes32", name:"_routeKey", type:"bytes32" }], name:"isWaitingForCallback", outputs:[{ internalType:"bool", name:"", type:"bool" }], stateMutability:"view", type:"function" }, { inputs:[], name:"keeper", outputs:[{ internalType:"address", name:"", type:"address" }], stateMutability:"view", type:"function" }, { inputs:[], name:"managementFeePercentage", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[], name:"multiSubscriber", outputs:[{ internalType:"address", name:"", type:"address" }], stateMutability:"view", type:"function" }, { inputs:[], name:"orchestrator", outputs:[{ internalType:"address", name:"", type:"address" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"address", name:"_asset", type:"address" }], name:"platformAccountBalance", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[], name:"platformFeeRecipient", outputs:[{ internalType:"address", name:"", type:"address" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"address", name:"_route", type:"address" }], name:"positionKey", outputs:[{ internalType:"bytes32", name:"", type:"bytes32" }], stateMutability:"view", type:"function" }, { inputs:[], name:"precision", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"pure", type:"function" }, { inputs:[{ internalType:"bytes32", name:"_routeKey", type:"bytes32" }, { internalType:"uint256", name:"_index", type:"uint256" }], name:"puppetAt", outputs:[{ internalType:"address", name:"", type:"address" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"address", name:"_puppet", type:"address" }, { internalType:"bytes32", name:"_routeKey", type:"bytes32" }], name:"puppetSubscriptionExpiry", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"address", name:"_puppet", type:"address" }], name:"puppetSubscriptions", outputs:[{ internalType:"address[]", name:"", type:"address[]" }], stateMutability:"view", type:"function" }, { inputs:[], name:"referralCode", outputs:[{ internalType:"bytes32", name:"", type:"bytes32" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"address", name:"_trader", type:"address" }, { internalType:"address", name:"_collateralToken", type:"address" }, { internalType:"address", name:"_indexToken", type:"address" }, { internalType:"bool", name:"_isLong", type:"bool" }, { internalType:"bytes", name:"_data", type:"bytes" }], name:"routeAddress", outputs:[{ internalType:"address", name:"", type:"address" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"bytes32", name:"_routeKey", type:"bytes32" }], name:"routeAddress", outputs:[{ internalType:"address", name:"", type:"address" }], stateMutability:"view", type:"function" }, { inputs:[], name:"routeFactory", outputs:[{ internalType:"address", name:"", type:"address" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"address", name:"_route", type:"address" }], name:"routeKey", outputs:[{ internalType:"bytes32", name:"", type:"bytes32" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"address", name:"_trader", type:"address" }, { internalType:"bytes32", name:"_routeTypeKey", type:"bytes32" }], name:"routeKey", outputs:[{ internalType:"bytes32", name:"", type:"bytes32" }], stateMutability:"view", type:"function" }, { inputs:[], name:"routeReader", outputs:[{ internalType:"address", name:"", type:"address" }], stateMutability:"view", type:"function" }, { inputs:[], name:"routeSetter", outputs:[{ internalType:"address", name:"", type:"address" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"address", name:"_route", type:"address" }], name:"routeType", outputs:[{ internalType:"bytes32", name:"", type:"bytes32" }], stateMutability:"view", type:"function" }, { inputs:[], name:"routes", outputs:[{ internalType:"address[]", name:"", type:"address[]" }], stateMutability:"view", type:"function" }, { inputs:[], name:"scoreGauge", outputs:[{ internalType:"address", name:"", type:"address" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"bytes32", name:"_routeKey", type:"bytes32" }], name:"subscribedPuppets", outputs:[{ internalType:"address[]", name:"", type:"address[]" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"bytes32", name:"_routeKey", type:"bytes32" }], name:"subscribedPuppetsCount", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"address", name:"_route", type:"address" }], name:"trader", outputs:[{ internalType:"address", name:"", type:"address" }], stateMutability:"view", type:"function" }, { inputs:[], name:"withdrawalFeePercentage", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[], name:"wnt", outputs:[{ internalType:"address", name:"", type:"address" }], stateMutability:"view", type:"function" }] as const