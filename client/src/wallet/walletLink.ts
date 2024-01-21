import { combineObject, fromCallback, replayLatest } from "@aelea/core"
import { pallete } from "@aelea/ui-components-theme"
import { awaitPromises, continueWith, fromPromise, map, mergeArray, multicast, now } from "@most/core"
import { Stream } from "@most/types"
import { coinbaseWallet, injected, walletConnect } from '@wagmi/connectors'
import {
  GetAccountReturnType, createConfig, createStorage,
  getBlockNumber,
  getChainId, getWalletClient, http, reconnect, watchAccount, watchBlockNumber, watchChainId, watchPublicClient
} from "@wagmi/core"
import { arbitrum } from '@wagmi/core/chains'
import { switchMap } from "common-utils"
import * as viem from 'viem'

export const chains = [
  arbitrum, // avalanche

  // mainnet, sepolia,
  
] as const

export type ISupportedChain = typeof chains[number]

export interface IWalletConnected {
  address: viem.Address
  network: ISupportedChain
}

export type IWalletClient = viem.WalletClient<viem.Transport, ISupportedChain, viem.Account>

const storage = createStorage({ storage: window.localStorage })
const projectId = import.meta.env.VITE_WC_PROJECT_ID || 'fdc797f2e6a68e01b9e17843c939673e'
const llamaRpc = import.meta.env.VITE_LLAMANODES_PROJECT_ID || '01HCB0CBBH06TE3XSM6ZE4YYAD'


const metadata = {
  name: '__APP_NAME__',
  description: '__APP_DESC_SHORT__',
  url: '__WEBSITE__',
  icons: ['https://imagedelivery.net/_aTEfDRm7z3tKgu9JhfeKA/5a7df101-00dc-4856-60a9-921b2879e200/lg']
}


export const wcConnector = walletConnect({
  showQrModal: false,
  projectId, metadata,
  qrModalOptions: {
    themeVariables: {
      // "--w3m-color-mix": "red",
      // "--w3m-color-mix-strength": 0,
      // "--w3m-border-radius-master": "0px",
      // '--w3m-font-family': 'var(--font)',
      // '--w3m-accent': pallete.primary,
      "--wcm-accent-color": pallete.primary,
      "--wcm-font-family": 'var(--font)',
      "--wcm-background-color": pallete.background,
    }
  }
})
const transports = chains.reduce((acc, chain) => {
  return {
    ...acc,
    [chain.id]: http()
  }
}, {} as Record<ISupportedChain['id'], viem.Transport>)

export const wagmiConfig = createConfig({
  chains,
  connectors: [
    // injected(),
    // coinbaseWallet({ appName: 'Create Wagmi' }),
    wcConnector,
  ],
  transports,
})

const reconnectQuery = switchMap(() => {
  return fromPromise(reconnect(wagmiConfig))
}, now(null))

const initalChain = map(([res]) => {
  return res ? chains.find(c => c.id === res.chainId) : chains[0]
}, reconnectQuery)

export const chain: Stream<ISupportedChain> = continueWith(() =>  fromCallback(cb => {
  const watcher = watchChainId(wagmiConfig, {
    onChange(res) {
      const match = chains.find(chain => chain.id == res) || chains[0]
      cb(match)
    }
  })
  
  return watcher
}), initalChain)



export const account: Stream<GetAccountReturnType> = continueWith(() => multicast(fromCallback(cb => {
  const watch = watchAccount(wagmiConfig, {
    onChange(res) {
      console.log('accountChange', res)
      return cb(res)
    }
  })
  


  return watch
})), reconnectQuery) 




export const publicClient: Stream<viem.PublicClient> = replayLatest(multicast(fromCallback(cb => {
  return watchPublicClient(wagmiConfig, { onChange(res) {
    return cb(res)
  } })  
})))




export const wallet = replayLatest(multicast(switchMap(async params => {
  if (params.account?.status !== 'connected') {
    return null
  }

  const clientAvaialble = await getWalletClient(wagmiConfig)

  return clientAvaialble
}, combineObject({ account }))))


// export const nativeBalance = switchMap(async params => {
//   if (params.wallet === null) return 0n

//   return params.publicClient.getBalance({ address: params.wallet.account.address })
// }, combineObject({ publicClient, wallet }))

export const gasPrice = awaitPromises(map(pc => pc.getGasPrice(), publicClient))
export const estimatedGasPrice = awaitPromises(map(pc => pc.estimateFeesPerGas({ chain: arbitrum }), publicClient))

export const block = awaitPromises(map(n => getBlockNumber(wagmiConfig), now(null)))
export const blockChange: Stream<bigint> = fromCallback(cb => watchBlockNumber(wagmiConfig, { onBlockNumber: blockNumber => cb(blockNumber) }))




