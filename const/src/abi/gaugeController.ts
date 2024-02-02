export default [{ inputs:[{ internalType:"contract Authority", name:"_authority", type:"address" }, { internalType:"address", name:"_token", type:"address" }, { internalType:"address", name:"_votingEscrow", type:"address" }], stateMutability:"nonpayable", type:"constructor" }, { inputs:[], name:"AlreadyInitialized", type:"error" }, { inputs:[], name:"AlreadyVoted", type:"error" }, { inputs:[], name:"EpochNotEnded", type:"error" }, { inputs:[], name:"EpochNotSet", type:"error" }, { inputs:[], name:"GaugeAlreadyAdded", type:"error" }, { inputs:[], name:"GaugeNotAdded", type:"error" }, { inputs:[], name:"GaugeTypeNotSet", type:"error" }, { inputs:[], name:"InvalidGaugeType", type:"error" }, { inputs:[], name:"InvalidUserWeight", type:"error" }, { inputs:[], name:"InvalidWeights", type:"error" }, { inputs:[], name:"TokenLockExpiresTooSoon", type:"error" }, { inputs:[], name:"TooMuchPowerUsed", type:"error" }, { inputs:[], name:"ZeroAddress", type:"error" }, { anonymous:false, inputs:[{ indexed:false, internalType:"string", name:"name", type:"string" }, { indexed:false, internalType:"int128", name:"typeID", type:"int128" }], name:"AddType", type:"event" }, { anonymous:false, inputs:[{ indexed:false, internalType:"uint256", name:"currentEpoch", type:"uint256" }], name:"AdvanceEpoch", type:"event" }, { anonymous:false, inputs:[{ indexed:true, internalType:"address", name:"user", type:"address" }, { indexed:true, internalType:"contract Authority", name:"newAuthority", type:"address" }], name:"AuthorityUpdated", type:"event" }, { anonymous:false, inputs:[{ indexed:false, internalType:"uint256", name:"timestamp", type:"uint256" }], name:"InitializeEpoch", type:"event" }, { anonymous:false, inputs:[{ indexed:false, internalType:"address", name:"addr", type:"address" }, { indexed:false, internalType:"int128", name:"gaugeType", type:"int128" }, { indexed:false, internalType:"uint256", name:"weight", type:"uint256" }], name:"NewGauge", type:"event" }, { anonymous:false, inputs:[{ indexed:false, internalType:"address", name:"gauge", type:"address" }, { indexed:false, internalType:"uint256", name:"time", type:"uint256" }, { indexed:false, internalType:"uint256", name:"weight", type:"uint256" }, { indexed:false, internalType:"uint256", name:"totalWeight", type:"uint256" }], name:"NewGaugeWeight", type:"event" }, { anonymous:false, inputs:[{ indexed:false, internalType:"int128", name:"typeID", type:"int128" }, { indexed:false, internalType:"uint256", name:"time", type:"uint256" }, { indexed:false, internalType:"uint256", name:"weight", type:"uint256" }, { indexed:false, internalType:"uint256", name:"totalWeight", type:"uint256" }], name:"NewTypeWeight", type:"event" }, { anonymous:false, inputs:[{ indexed:true, internalType:"address", name:"user", type:"address" }, { indexed:true, internalType:"address", name:"newOwner", type:"address" }], name:"OwnershipTransferred", type:"event" }, { anonymous:false, inputs:[{ indexed:false, internalType:"uint256", name:"profitWeight", type:"uint256" }, { indexed:false, internalType:"uint256", name:"volumeWeight", type:"uint256" }], name:"SetWeights", type:"event" }, { anonymous:false, inputs:[{ indexed:false, internalType:"uint256", name:"time", type:"uint256" }, { indexed:false, internalType:"address", name:"user", type:"address" }, { indexed:false, internalType:"address", name:"gauge", type:"address" }, { indexed:false, internalType:"uint256", name:"weight", type:"uint256" }], name:"VoteForGauge", type:"event" }, { inputs:[{ internalType:"address", name:"_gauge", type:"address" }, { internalType:"int128", name:"_gaugeType", type:"int128" }, { internalType:"uint256", name:"_weight", type:"uint256" }], name:"addGauge", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[{ internalType:"string", name:"_name", type:"string" }, { internalType:"uint256", name:"_weight", type:"uint256" }], name:"addType", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[], name:"advanceEpoch", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[], name:"authority", outputs:[{ internalType:"contract Authority", name:"", type:"address" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"address", name:"_gauge", type:"address" }, { internalType:"uint256", name:"_weight", type:"uint256" }], name:"changeGaugeWeight", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[{ internalType:"int128", name:"_typeID", type:"int128" }, { internalType:"uint256", name:"_weight", type:"uint256" }], name:"changeTypeWeight", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[{ internalType:"int128", name:"", type:"int128" }, { internalType:"uint256", name:"", type:"uint256" }], name:"changesSum", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"address", name:"", type:"address" }, { internalType:"uint256", name:"", type:"uint256" }], name:"changesWeight", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[], name:"checkpoint", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[{ internalType:"address", name:"_gauge", type:"address" }], name:"checkpointGauge", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[], name:"currentEpochEndTime", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[], name:"epoch", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"uint256", name:"", type:"uint256" }], name:"epochData", outputs:[{ internalType:"uint256", name:"startTime", type:"uint256" }, { internalType:"uint256", name:"endTime", type:"uint256" }, { internalType:"bool", name:"hasEnded", type:"bool" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"uint256", name:"_epoch", type:"uint256" }], name:"epochTimeframe", outputs:[{ internalType:"uint256", name:"", type:"uint256" }, { internalType:"uint256", name:"", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"address", name:"_gauge", type:"address" }, { internalType:"uint256", name:"_time", type:"uint256" }], name:"gaugeRelativeWeight", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"address", name:"addr", type:"address" }, { internalType:"uint256", name:"time", type:"uint256" }], name:"gaugeRelativeWeightWrite", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"nonpayable", type:"function" }, { inputs:[{ internalType:"int128", name:"", type:"int128" }], name:"gaugeTypeNames", outputs:[{ internalType:"string", name:"", type:"string" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"address", name:"_gauge", type:"address" }], name:"gaugeTypes", outputs:[{ internalType:"int128", name:"", type:"int128" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"address", name:"", type:"address" }], name:"gaugeTypes_", outputs:[{ internalType:"int128", name:"", type:"int128" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"uint256", name:"_epoch", type:"uint256" }, { internalType:"address", name:"_gauge", type:"address" }], name:"gaugeWeightForEpoch", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"uint256", name:"", type:"uint256" }], name:"gauges", outputs:[{ internalType:"address", name:"", type:"address" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"address", name:"_gauge", type:"address" }], name:"getGaugeWeight", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[], name:"getTotalWeight", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"int128", name:"_typeID", type:"int128" }], name:"getTypeWeight", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"int128", name:"_typeID", type:"int128" }], name:"getWeightsSumPerType", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"uint256", name:"_epoch", type:"uint256" }], name:"hasEpochEnded", outputs:[{ internalType:"bool", name:"", type:"bool" }], stateMutability:"view", type:"function" }, { inputs:[], name:"initializeEpoch", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[{ internalType:"address", name:"", type:"address" }, { internalType:"address", name:"", type:"address" }], name:"lastUserVote", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[], name:"numberGaugeTypes", outputs:[{ internalType:"int128", name:"", type:"int128" }], stateMutability:"view", type:"function" }, { inputs:[], name:"numberGauges", outputs:[{ internalType:"int128", name:"", type:"int128" }], stateMutability:"view", type:"function" }, { inputs:[], name:"owner", outputs:[{ internalType:"address", name:"", type:"address" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"int128", name:"", type:"int128" }, { internalType:"uint256", name:"", type:"uint256" }], name:"pointsSum", outputs:[{ internalType:"uint256", name:"bias", type:"uint256" }, { internalType:"uint256", name:"slope", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"uint256", name:"", type:"uint256" }], name:"pointsTotal", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"int128", name:"", type:"int128" }, { internalType:"uint256", name:"", type:"uint256" }], name:"pointsTypeWeight", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"address", name:"", type:"address" }, { internalType:"uint256", name:"", type:"uint256" }], name:"pointsWeight", outputs:[{ internalType:"uint256", name:"bias", type:"uint256" }, { internalType:"uint256", name:"slope", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[], name:"profitWeight", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"contract Authority", name:"newAuthority", type:"address" }], name:"setAuthority", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[{ internalType:"uint256", name:"_profit", type:"uint256" }, { internalType:"uint256", name:"_volume", type:"uint256" }], name:"setWeights", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[{ internalType:"uint256", name:"", type:"uint256" }], name:"timeSum", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[], name:"timeTotal", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"uint256", name:"", type:"uint256" }], name:"timeTypeWeight", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"address", name:"", type:"address" }], name:"timeWeight", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[], name:"token", outputs:[{ internalType:"address", name:"", type:"address" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"address", name:"newOwner", type:"address" }], name:"transferOwnership", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[], name:"volumeWeight", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"address", name:"_gauge", type:"address" }, { internalType:"uint256", name:"_userWeight", type:"uint256" }], name:"voteForGaugeWeights", outputs:[], stateMutability:"nonpayable", type:"function" }, { inputs:[{ internalType:"address", name:"", type:"address" }], name:"voteUserPower", outputs:[{ internalType:"uint256", name:"", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[{ internalType:"address", name:"", type:"address" }, { internalType:"address", name:"", type:"address" }], name:"voteUserSlopes", outputs:[{ internalType:"uint256", name:"slope", type:"uint256" }, { internalType:"uint256", name:"power", type:"uint256" }, { internalType:"uint256", name:"end", type:"uint256" }], stateMutability:"view", type:"function" }, { inputs:[], name:"votingEscrow", outputs:[{ internalType:"address", name:"", type:"address" }], stateMutability:"view", type:"function" }] as const