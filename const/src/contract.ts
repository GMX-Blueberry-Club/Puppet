import { arbitrum } from "viem/chains"

import scoreGague from './abi/scoreGague.js'
import auth from './abi/auth.js'
import route from './abi/route.js'
import puppet from './abi/puppet.js'
import orchestrator from './abi/orchestrator.js'
import orchestratorReader from './abi/orchestratorReader.js'
import routeFactory from './abi/routeFactory.js'
import datastore from './abi/datastore.js'

export const CONTRACT = {
  [arbitrum.id]: {
    Puppet: {
      address: "0x16e55B1a06eEdC9e08E47434D0dB2735eA589Db7",
      abi: puppet,
    },
    Datastore: {
      address: "0x803f3e2ab48DD93ac62bf1d0DB5F434E7B915158",
      abi: datastore,
    },
    Orchestrator: {
      address: "0x8992D776Ad36a92f29c6B3AB8DAd2c0520075364",
      abi: orchestrator,
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
      address: "0x747DCa007d3Fe4B86aE5Cf7558F3Be88C8F0F723",
      abi: routeFactory,
    },
  },
} as const