import { arbitrum } from "viem/chains"

import route from './abi/route.js'
import puppet from './abi/puppet.js'
import orchestrator from './abi/orchestrator.js'
import orchestratorReader from './abi/orchestratorReader.js'
import routeFactory from './abi/routeFactory.js'
import datastore from './abi/datastore.js'
import commonHelper from './abi/commonHelper.js'
import votingEscrow from "./abi/votingEscrow.js"
import decreaseSizeResolver from "./abi/decreaseSizeResolver.js"
import dictator from "./abi/dictator.js"
import basePool from "./abi/basePool.js"
import tokenRouter from "./abi/tokenRouter.js"
import oracleLogic from "./abi/oracleLogic.js"
import priceStore from "./abi/priceStore.js"
import rewardLogic from "./abi/rewardLogic.js"
import rewardRouter from "./abi/rewardRouter.js"
import veRevenueDistributor from "./abi/veRevenueDistributor.js"



export const CONTRACT = {
  [arbitrum.id]: {

    // tokenomics
    Dictator: {
      address: "0xA12a6281c1773F267C274c3BE1B71DB2BACE06Cb",
      abi: dictator,
    },
    PuppetToken: {
      address: "0x5C7E34292ac14008D8B15C0402CA9657501B949C",
      abi: puppet,
    },
    BasePool: {
      address: "0xc6295e969be65560d1cb8ce06b1b20e62337625c",
      abi: basePool,
    },
    TokenRouter: {
      address: "0xc6295e969be65560d1cb8ce06b1b20e62337625c",
      abi: tokenRouter,
    },
    OracleLogic: {
      address: "0x412979f3210d8cf121971B0176cA3704b8bE0945",
      abi: oracleLogic,
    },
    PriceStore: {
      address: "0xe9e9ce24275Ec23257551Cbb62D79A4e9cfE2428",
      abi: priceStore,
    },
    RewardLogic: {
      address: "0x356Df7BE8a48d514c3A24A4b4cC0CB4AAd45B617",
      abi: rewardLogic,
    },
    VotingEscrow: {
      address: "0xd6D057D0b2f16a9bcdca4b8A7EF3532386cB3058",
      abi: votingEscrow,
    },
    VeRevenueDistributor: {
      address: "0xeA1e7206dD22cD452E8bb4A393C003ABF9C5826e",
      abi: veRevenueDistributor,
    },
    RewardRouter: {
      address: "0xeBE43819468Bc0B167Baa5224Fe46A9EaDCA67Ce",
      abi: rewardRouter,
    },

    // trading
    Datastore: {
      address: "0x75236b405F460245999F70bc06978AB2B4116920",
      abi: datastore,
    },
    CommonHelper: {
      address: "0x32b0373B53eC9e16eAFda86b41a6aCf3B2a39f14",
      abi: commonHelper,
    },
    Orchestrator: {
      address: "0x9212c5a9e49B4E502F2A6E0358DEBe038707D6AC",
      abi: orchestrator,
    },
    DecreaseSizeResolver: {
      address: "0x4ae74D2Cb2F10D90e6E37Cf256A15a783C4f655B",
      abi: decreaseSizeResolver,
    },
    OrchestratorReader: {
      address: "0xa6faf588ce2bb5564db5724e4928512bc95be200",
      abi: orchestratorReader,
    },
    Route: {
      abi: route,
    },
    RouteFactory: {
      address: "0xF72042137F5a1b07E683E55AF8701CEBfA051cf4",
      abi: routeFactory,
    },
  },
} as const