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
      address: "0x7288699A7323Da69efD0Ed50b9c36d983006456B",
      abi: datastore,
    },
    Orchestrator: {
      address: "0x92100ed7c156887D173880572718971E9d7B585E",
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
      address: "0xC45e80332fd2aF686A190e01AEBf8ddd6eEd7f36",
      abi: routeFactory,
    },
  },
} as const