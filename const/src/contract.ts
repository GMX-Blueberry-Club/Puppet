import { arbitrum } from "viem/chains"

import scoreGague from './abi/scoreGague.js'
import auth from './abi/auth.js'
import route from './abi/route.js'
import puppet from './abi/puppet.js'
import orchestrator from './abi/orchestrator.js'
import orchestratorReader from './abi/orchestratorReader.js'
import routeFactory from './abi/routeFactory.js'

export const CONTRACT = {
  [arbitrum.id]: {
    Puppet: {
      address: "0x16e55B1a06eEdC9e08E47434D0dB2735eA589Db7",
      abi: puppet,
    },
    Datastore: {
      address: "0x7c543a3B2b463984bCf94847798be384a4022E16",
      abi: puppet,
    },
    Orchestrator: {
      address: "0x8AF2BcB9673580859Cdd9D85F89e246a9482Bc0d",
      abi: orchestrator,
    },
    OrchestratorReader: {
      address: "0x846Ad1Bd60C4377e310147C5f6293F92E8B00780",
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
      address: "0x747DCa007d3Fe4B86aE5Cf7558F3Be88C8F0F723",
      abi: routeFactory,
    },
  },
} as const