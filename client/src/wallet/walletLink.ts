import { combineObject, fromCallback } from "@aelea/core"
import { pallete, theme } from "@aelea/ui-components-theme"
import { awaitPromises, map, mergeArray, now, skip } from "@most/core"
import { Stream } from "@most/types"
import {
  Address, GetAccountResult, GetNetworkResult,
  WalletClient, WebSocketPublicClient, configureChains, createConfig, createStorage, fetchBlockNumber, getAccount,
  getNetwork, InjectedConnector, getPublicClient, getWalletClient, getWebSocketPublicClient, watchAccount, watchBlockNumber, watchNetwork
} from '@wagmi/core'
import { WalletConnectConnector } from '@wagmi/core/connectors/walletConnect'
import { switchMap } from "gmx-middleware-utils"
import { arbitrum } from "viem/chains"
import * as viem from 'viem'
import { alchemyProvider } from '@wagmi/core/providers/alchemy'
import { publicProvider } from '@wagmi/core/providers/public'
import { createWeb3Modal, walletConnectProvider } from '@web3modal/wagmi'
import { jsonRpcProvider } from '@wagmi/core/providers/jsonRpc'

const chains = [
  arbitrum,
  // avalanche
]

export type ISupportedChain = (typeof arbitrum) & { unsupported?: boolean }
export type ISupportedId = ISupportedChain['id']

export interface IWalletConnected {
  address: Address
  network: ISupportedChain
}

export type IWalletClient = WalletClient<viem.Transport, ISupportedChain>

const storage = createStorage({ storage: window.localStorage })
const projectId = import.meta.env.VITE_WC_PROJECT_ID || 'fdc797f2e6a68e01b9e17843c939673e'
const llamaRpc = import.meta.env.VITE_LLAMANODES_PROJECT_ID || '01HCB0CBBH06TE3XSM6ZE4YYAD'



export const wcConnector = new WalletConnectConnector({
  chains,
  options: {
    projectId,
    showQrModal: false,
    qrModalOptions: {

    }
  }
})


export const networkChange = fromCallback<GetNetworkResult>(watchNetwork)
export const accountChange = fromCallback<GetAccountResult>(watchAccount)


const networkQuery = map(() => getNetwork(), now(null))
export const chain: Stream<ISupportedChain> = map(getNetworkResult => {
  if (!getNetworkResult.chain) {
    return arbitrum
  }

  const defChain = chains.find(chain => chain.id == getNetworkResult.chain?.id) || null

  return defChain
}, mergeArray([skip(1, networkChange), networkQuery]))

export const account: Stream<GetAccountResult | null> = mergeArray([
  map(() => getAccount(), now(null)),
  accountChange
])

export const publicClient: Stream<viem.PublicClient> = map(params => {
  const chainId = params.chain?.id || arbitrum.id
  const wsc = getWebSocketPublicClient({ chainId }) || getWebSocketPublicClient({ chainId })
  const clientAvaialble = wsc || getPublicClient({ chainId }) || getPublicClient({ chainId })

  return clientAvaialble
}, combineObject({ chain }))

export const wallet = awaitPromises(map(async params => {
  if (params.chain == null) {
    return null
  }

  const clientAvaialble = await getWalletClient({ chainId: params.chain.id })

  return clientAvaialble as IWalletClient
}, combineObject({ chain, account })))

export const nativeBalance = awaitPromises(map(params => {
  if (params.wallet === null) return 0n

  return params.publicClient.getBalance({ address: params.wallet.account.address })
}, combineObject({ publicClient, wallet })))

export const gasPrice = awaitPromises(map(pc => pc.getGasPrice(), publicClient))
export const estimatedGasPrice = awaitPromises(map(pc => pc.estimateFeesPerGas({ chain: arbitrum }), publicClient))

export const blockCache = awaitPromises(map(async pc => {
  
  return (await pc.getBlockNumber({ maxAge: 10000 })) || 0n
}, publicClient))
export const block = awaitPromises(map(n => fetchBlockNumber(), now(null)))
export const blockChange = switchMap(c => fromCallback<bigint>(cb => watchBlockNumber({ listen: true, chainId: c.id }, bn => cb(bn))), chain)


// const configChain = configureChains(
//   chains,
//   [
//     // alchemyProvider({ apiKey: 'RBsflxWv6IhITsLxAWcQlhCqSuxV7Low' }),
//     // infuraProvider({ apiKey: '6d7e461ad6644743b92327579860b662' }),
//     // publicProvider(),

//     // w3mProvider({ projectId }),
//     // jsonRpcProvider({
//     //   rpc: chain => {
//     //     const supportedChains = [
//     //       1, 3, 4, 5, 10, 42, 56, 69, 97, 100, 137, 280, 324, 420, 42161, 42220, 43114, 80001, 421611,
//     //       421613, 1313161554, 1313161555
//     //     ]
//     //     const NAMESPACE = 'eip155'

//     //     if (supportedChains.includes(chain.id)) {
//     //       return {
//     //         http: `https://rpc.walletconnect.com/v1/?chainId=${NAMESPACE}:${chain.id}&projectId=${projectId}`
//     //       }
//     //     }

//     //     return {
//     //       http: chain.rpcUrls.default.http[0],
//     //       webSocket: chain.rpcUrls.default.webSocket?.[0]
//     //     }
//     //   }
//     // })
//   ],
//   { batch: { multicall: { wait: 20 } }, retryCount: 0 },
// )

// https://arbitrum-one.gateway.pokt.network/v1/lb/9d70f26468263cb1d61de3c0
const configChain = configureChains(
  chains, [
    // jsonRpcProvider({
    //   rpc: (chain) => {
    //     return {
    //       http: `https://arbitrum-one.gateway.pokt.network/v1/lb/9d70f26468263cb1d61de3c0`,
    //       // webSocket: `wss://arbitrum-one.gateway.pokt.network/v1/lb/9d70f26468263cb1d61de3c0`,
    //     }
    //   },
    // }),
    walletConnectProvider({ projectId }),
    publicProvider(),
    alchemyProvider({
      apiKey: 'RBsflxWv6IhITsLxAWcQlhCqSuxV7Low',
    }),
  ],
  {
    batch: { multicall: { wait: 30 } },
    retryCount: 0,
  }
)

const metadata = {
  name: import.meta.env.VITE_APP_NAME,
  description: import.meta.env.VITE_APP_DESC_LONG,
  url: import.meta.env.VITE_WEBSITE,
  icons: ['https://imagedelivery.net/_aTEfDRm7z3tKgu9JhfeKA/5a7df101-00dc-4856-60a9-921b2879e200/lg']
}

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors: [
    new WalletConnectConnector({ chains, options: { projectId, showQrModal: false, metadata } }),
    new InjectedConnector({ chains, options: { shimDisconnect: true } }),
  ],
  publicClient: configChain.publicClient,
  // webSocketPublicClient: configChain.webSocketPublicClient,
  storage,
})


export const modal = createWeb3Modal({ 
  wagmiConfig, projectId, chains, customWallets: [],
  themeMode: theme.name === 'dark' ? 'dark' : 'light',
  themeVariables: {
    "--w3m-color-mix": "red",
    "--w3m-color-mix-strength": 0,
    "--w3m-border-radius-master": "0px",
    '--w3m-font-family': 'var(--font)',
    '--w3m-accent': pallete.primary,
  },
})

