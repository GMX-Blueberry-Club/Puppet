import { combineObject, fromCallback } from "@aelea/core"
import { pallete } from "@aelea/ui-components-theme"
import { awaitPromises, map, mergeArray, now, skip } from "@most/core"
import { Stream } from "@most/types"
import {
  Address, GetAccountResult, GetNetworkResult,
  WalletClient, WebSocketPublicClient, configureChains, createConfig, createStorage, fetchBlockNumber, getAccount,
  getNetwork, getPublicClient, getWalletClient, getWebSocketPublicClient, watchAccount, watchBlockNumber, watchNetwork
} from '@wagmi/core'
import { WalletConnectConnector } from '@wagmi/core/connectors/walletConnect'
import { EthereumClient, w3mConnectors, w3mProvider } from '@web3modal/ethereum'
import { Web3Modal } from '@web3modal/html'
import { switchMap } from "gmx-middleware-utils"
import { arbitrum } from "viem/chains"
import * as viem from 'viem'

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


const configChain = configureChains(
  chains,
  [
    // alchemyProvider({ apiKey: 'RBsflxWv6IhITsLxAWcQlhCqSuxV7Low' }),
    // infuraProvider({ apiKey: '6d7e461ad6644743b92327579860b662' }),
    // publicProvider(),
    w3mProvider({ projectId }),
    // jsonRpcProvider({
    //   rpc: chain => {
    //     const supportedChains = [
    //       1, 3, 4, 5, 10, 42, 56, 69, 97, 100, 137, 280, 324, 420, 42161, 42220, 43114, 80001, 421611,
    //       421613, 1313161554, 1313161555
    //     ]
    //     const NAMESPACE = 'eip155'

    //     if (supportedChains.includes(chain.id)) {
    //       return {
    //         http: `https://rpc.walletconnect.com/v1/?chainId=${NAMESPACE}:${chain.id}&projectId=${projectId}`
    //       }
    //     }

    //     return {
    //       http: chain.rpcUrls.default.http[0],
    //       webSocket: chain.rpcUrls.default.webSocket?.[0]
    //     }
    //   }
    // })
  ],
  { batch: { multicall: { wait: 20 } }, retryCount: 0 },
)


export const wcConnector = new WalletConnectConnector({
  chains,
  options: {
    projectId,
    showQrModal: false,
    qrModalOptions: {

    }
  }
})


export const walletConfig = createConfig({
  autoConnect: true,
  connectors: w3mConnectors({ projectId, chains,  }),
  publicClient: configChain.publicClient,
  // webSocketPublicClient: configChain.webSocketPublicClient,
  storage,
})


const ethereumClient = new EthereumClient(walletConfig, chains)



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

export const account = mergeArray([
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

  return clientAvaialble
}, combineObject({ chain, account })))

export const nativeBalance = awaitPromises(map(params => {
  if (params.wallet === null) return 0n

  return params.publicClient.getBalance({ address: params.wallet.account.address })
}, combineObject({ publicClient, wallet })))

export const gasPrice = awaitPromises(map(pc => pc.getGasPrice(), publicClient))

export const blockCache = awaitPromises(map(async pc => {
  
  return (await pc.getBlockNumber({ maxAge: 10000 })) || 0n
}, publicClient))
export const block = awaitPromises(map(n => fetchBlockNumber(), now(null)))
export const blockChange = switchMap(c => fromCallback<bigint>(cb => watchBlockNumber({ listen: true, chainId: c.id }, bn => cb(bn))), chain)


export const web3Modal = new Web3Modal({
  defaultChain: arbitrum,
  // privacyPolicyUrl: 'https://www.walletconnect.com/privacy-policy.html',
  // explorerRecommendedWalletIds: ['fbc8d86ad914ebd733fec4812b4b7af5ca709fdd9e75a930115e5baa02c4ef4c'],
  projectId,
  themeVariables: {
    '--w3m-accent-color': '#FF8700',
    '--w3m-accent-fill-color': '#000000',
    '--w3m-background-color': pallete.foreground,
    // '--w3m-background-image-url': '/images/customisation/background.png',
    // '--w3m-logo-image-url': '/images/customisation/logo.png',
    '--w3m-background-border-radius': '0px',
    '--w3m-container-border-radius': '0px',
    '--w3m-wallet-icon-border-radius': '0px',
    '--w3m-wallet-icon-large-border-radius': '0px',
    '--w3m-input-border-radius': '0px',
    '--w3m-button-border-radius': '0px',
    '--w3m-secondary-button-border-radius': '0px',
    '--w3m-notification-border-radius': '0px',
    '--w3m-icon-button-border-radius': '0px',
    '--w3m-button-hover-highlight-border-radius': '0px',
    '--w3m-font-family': `'Moderat', sans-serif`
  }
}, ethereumClient)




// const core = new Core({ projectId })

// // e.g. for SignClient. See the "Shared Core" guide linked above for details.
// const signClient = await SignClient.init({
//   core,
//   metadata: {
//     url: 'https://localhost',
//     name: 'My Sign-Enabled Dapp',
//     icons: ['https://my-dapp.com/icons/logo.png'],
//     description: 'ff'
//   }
// })

// const pushDappClient = await PushDappClient.init({
//   core,
//   metadata: {
//     name: 'My Push-Enabled Dapp',
//     description: 'A dapp using WalletConnect PushClient',
//     url: 'https://my-dapp.com',
//     icons: ['https://my-dapp.com/icons/logo.png']
//   }
// })

