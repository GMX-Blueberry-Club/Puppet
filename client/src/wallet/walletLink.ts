import { combineObject, fromCallback } from "@aelea/core"
import { pallete } from "@aelea/ui-components-theme"
import { awaitPromises, delay, map, mergeArray, now } from "@most/core"
import { Stream } from "@most/types"
import { Address, GetAccountResult, GetNetworkResult, InjectedConnector, WalletClient, configureChains, createConfig, createStorage, getAccount, getNetwork, getPublicClient, getWalletClient, getWebSocketPublicClient, watchAccount, watchNetwork } from '@wagmi/core'
import { WalletConnectConnector } from '@wagmi/core/connectors/walletConnect'
import { alchemyProvider } from "@wagmi/core/providers/alchemy"
import { jsonRpcProvider } from '@wagmi/core/providers/jsonRpc'
import { EthereumClient } from '@web3modal/ethereum'
import { Web3Modal } from '@web3modal/html'
import { PublicClient, Transport } from "viem"
import { arbitrum, avalanche } from "viem/chains"

const chains = [arbitrum, avalanche]

export type ISupportedChain = (typeof arbitrum) & { unsupported?: boolean }
export type ISupportedId = ISupportedChain['id']

export interface IWalletConnected {
  address: Address
  network: ISupportedChain
}

export type IWalletClient = WalletClient<Transport, ISupportedChain>

const storage = createStorage({ storage: window.localStorage })

const projectId = 'c7cea9637dde679f833971689e9a3119'



const configChain = configureChains(
  [arbitrum, avalanche],
  [
    alchemyProvider({ apiKey: 'RBsflxWv6IhITsLxAWcQlhCqSuxV7Low' }),
    // w3mProvider({ projectId }),
    jsonRpcProvider({
      rpc: chain => {
        const supportedChains = [
          1, 3, 4, 5, 10, 42, 56, 69, 97, 100, 137, 280, 324, 420, 42161, 42220, 43114, 80001, 421611,
          421613, 1313161554, 1313161555
        ]
        const NAMESPACE = 'eip155'

        if (supportedChains.includes(chain.id)) {
          return {
            http: `https://rpc.walletconnect.com/v1/?chainId=${NAMESPACE}:${chain.id}&projectId=${projectId}`
          }
        }

        return {
          http: chain.rpcUrls.default.http[0],
          webSocket: chain.rpcUrls.default.webSocket?.[0]
        }
      }
    })
  ],
)


export const wcConnector = new WalletConnectConnector({
  chains,
  options: { projectId, showQrModal: false }
})


const injectedConnector = new InjectedConnector({ chains, options: { name: 'injected' } })
export const walletConfig = createConfig({
  autoConnect: true,
  connectors: [injectedConnector, wcConnector],
  publicClient: configChain.publicClient,
  webSocketPublicClient: configChain.webSocketPublicClient,
  storage,
})


const ethereumClient = new EthereumClient(walletConfig, chains)



export const networkChange = fromCallback<GetNetworkResult>(watchNetwork)
export const accountChange = fromCallback<GetAccountResult>(watchAccount)



export const chain: Stream<ISupportedChain> = map(getNetworkResult => {
  if (!getNetworkResult) {
    throw new Error('network is null')
  }


  const chain = chains.find(chain => chain.id == getNetworkResult.chain?.id) || arbitrum

  return chain
}, mergeArray([
  map(() => getNetwork(), now(null)),
  networkChange
]))



export const account = mergeArray([
  map(() => getAccount(), delay(500, now(null))),
  accountChange
])

export const publicClient: Stream<PublicClient<Transport, ISupportedChain>> = map(params => {
  if (params.chain == null) {
    throw new Error('network is null')
  }

  const chainId = params.chain.id
  const wsc = getWebSocketPublicClient({ chainId })
  const clientAvaialble = wsc || getPublicClient({ chainId }) || getPublicClient({ chainId: arbitrum.id })

  return clientAvaialble
}, combineObject({ chain }))



export const wallet = awaitPromises(map(async params => {

  const clientAvaialble = await getWalletClient({ chainId: params.chain.id })

  return clientAvaialble
}, combineObject({ chain, account })))



export const web3Modal = new Web3Modal({
  defaultChain: arbitrum,
  privacyPolicyUrl: 'https://www.walletconnect.com/privacy-policy.html',
  explorerRecommendedWalletIds: ['fbc8d86ad914ebd733fec4812b4b7af5ca709fdd9e75a930115e5baa02c4ef4c'],
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


