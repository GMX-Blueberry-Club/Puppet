import * as viem from 'viem'
import { arbitrum } from 'viem/chains'

export const chains = [ arbitrum ] as const

export type ISupportedChain = typeof chains[number]
export type IWalletClient = viem.WalletClient<viem.Transport, ISupportedChain, viem.Account>

// const storage = createStorage({ storage: window.localStorage, key: 'walletLink' })
const projectId = import.meta.env.VITE_WC_PROJECT_ID || 'fdc797f2e6a68e01b9e17843c939673e'
// const llamaRpc = import.meta.env.VITE_LLAMANODES_PROJECT_ID || '01HCB0CBBH06TE3XSM6ZE4YYAD'

export const publicTransportMap = {
  [arbitrum.id]: viem.fallback([
    viem.webSocket('wss://arb-mainnet.g.alchemy.com/v2/RBsflxWv6IhITsLxAWcQlhCqSuxV7Low'),
    viem.http('https://arb1.arbitrum.io/rpc')
  ]),
  // [CHAIN.AVALANCHE]: avaGlobalProvider,
}


const metadata = {
  name: '__APP_NAME__',
  description: '__APP_DESC_SHORT__',
  url: '__WEBSITE__',
  icons: ['https://imagedelivery.net/_aTEfDRm7z3tKgu9JhfeKA/5a7df101-00dc-4856-60a9-921b2879e200/lg']
}

// export const wcConnector = walletConnect({
//   showQrModal: true,
//   projectId, metadata,
//   // isNewChainsStale: true,
//   // qrModalOptions: {
//   //   themeVariables: {
//   //     // "--w3m-color-mix": "red",
//   //     // "--w3m-color-mix-strength": 0,
//   //     // "--w3m-border-radius-master": "0px",
//   //     // '--w3m-font-family': 'var(--font)',
//   //     // '--w3m-accent': pallete.primary,
//   //     "--wcm-accent-color": pallete.primary,
//   //     "--wcm-font-family": 'var(--font)',
//   //     "--wcm-background-color": pallete.background,
//   //   }
//   // }
// })




