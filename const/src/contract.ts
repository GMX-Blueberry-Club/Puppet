import { arbitrum } from "viem/chains"

import scoreGague from './abi/scoreGague.js'
import auth from './abi/auth.js'
import route from './abi/route.js'
import puppet from './abi/puppet.js'
import orchestrator from './abi/orchestrator.js'
import orchestratorReader from './abi/orchestratorReader.js'
import routeFactory from './abi/routeFactory.js'
import datastore from './abi/datastore.js'
import commonHelper from './abi/commonHelper.js'
import oPuppet from "./abi/oPuppet.js"
import votingEscrow from "./abi/votingEscrow.js"
import gaugeController from "./abi/gaugeController.js"
import flashLoanHandler from "./abi/flashLoanHandler.js"
import decreaseSizeResolver from "./abi/decreaseSizeResolver.js"
import dictator from "./abi/dictator.js"

export const CONTRACT = {
  [arbitrum.id]: {
    Puppet: {
      address: "0xAde170A4C11574Aa3732e9EBA994D891F99Ab33E",
      abi: puppet,
    },
    oPuppet: {
      address: "0xD4062F781c0A5255886a4666576584b2d1D5aE69",
      abi: oPuppet,
    },
    FlashLoanHandler: {
      address: "0xD4062F781c0A5255886a4666576584b2d1D5aE69",
      abi: flashLoanHandler,
    },
    VotingEscrow: {
      address: "0xE85389C50CBa4953174236be6C864901BB2dCA61",
      abi: votingEscrow,
    },
    GaugeController: {
      address: "0x6287778122A449c825D66d2d28ADAb7ce8595e16",
      abi: gaugeController,
    },


    ScoreGaugeV1: {
      address: "0x00e930320A64273Ff0a544c57b58ebA8C8b3E35E",
      abi: scoreGague,
    },

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
    Dictator: {
      address: "0xA12a6281c1773F267C274c3BE1B71DB2BACE06Cb",
      abi: dictator,
    },
    OrchestratorReader: {
      address: "0xa6faf588ce2bb5564db5724e4928512bc95be200",
      abi: orchestratorReader,
    },
    Auth: {
      address: '0xA12a6281c1773F267C274c3BE1B71DB2BACE06Cb',
      abi: auth,
    },
    ScoreGague: {
      address: '0x920C10F42c3F5Dba70Cd2c7567918D3A400FA876',
      abi: scoreGague,
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