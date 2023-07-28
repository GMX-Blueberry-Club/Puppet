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
      address: "0xE6A0D99D119E07a5a1401924219077c3C58fD044",
      abi: abi.orchestrator,
      subgraph: 'https://api.studio.thegraph.com/query/47960/puppet/version/latest',
    },
    Route: {
      abi: abi.route,
      subgraph: 'https://api.studio.thegraph.com/query/47960/puppet/version/latest',
    },
  },
} as const