import { arbitrum } from "viem/chains"

import scoreGague from './abi/scoreGague.js'
import auth from './abi/auth.js'
import route from './abi/route.js'
import puppet from './abi/puppet.js'
import orchestrator from './abi/orchestrator.js'
import routeFactory from './abi/routeFactory.js'

export const CONTRACT = {
  [arbitrum.id]: {
    Puppet: {
      address: "0x16e55B1a06eEdC9e08E47434D0dB2735eA589Db7",
      abi: puppet,
      subgraph: 'https://api.studio.thegraph.com/query/47960/puppet/version/latest',
    },
    Orchestrator: {
      address: "0x446fb2e318632135a34CF395840FfE6a483274C7",
      abi: orchestrator,
      subgraph: 'https://api.studio.thegraph.com/query/47960/puppet/version/latest',
    },
    Auth: {
      address: '0xA12a6281c1773F267C274c3BE1B71DB2BACE06Cb',
      abi: auth,
      subgraph: 'https://api.studio.thegraph.com/query/47960/puppet/version/latest',
    },
    ScoreGague: {
      address: '0x920C10F42c3F5Dba70Cd2c7567918D3A400FA876',
      abi: scoreGague,
      subgraph: 'https://api.studio.thegraph.com/query/47960/puppet/version/latest',
    },
    Route: {
      abi: route,
      subgraph: 'https://api.studio.thegraph.com/query/47960/puppet/version/latest',
    },
    RouteFactory: {
      address: "0x3fC294C613C920393698d12bD26061fb8300e415",
      abi: routeFactory,
      subgraph: 'https://api.studio.thegraph.com/query/47960/puppet/version/latest',
    },
  },
} as const