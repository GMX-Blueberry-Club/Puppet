import { arbitrum } from "viem/chains"
import * as abi from "./abi.js"

export const CONTRACT = {
  [arbitrum.id]: {
    RouteFactory: {
      address: "0x3fC294C613C920393698d12bD26061fb8300e415",
      abi: abi.route,
      subgraph: 'https://api.studio.thegraph.com/query/47960/puppet/version/latest',
    },
    Orchestrator: {
      address: "0x82403099D24b2bF9Ee036F05E34da85E30982234",
      abi: abi.orchestrator,
      subgraph: 'https://api.studio.thegraph.com/query/47960/puppet/version/latest',
    },
    Route: {
      abi: abi.route,
      subgraph: 'https://api.studio.thegraph.com/query/47960/puppet/version/latest',
    },
  },
} as const