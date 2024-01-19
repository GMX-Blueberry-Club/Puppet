import playwright from 'playwright-core'
import { getAddress } from 'viem'

const CLIENT = process.env['CLIENT'] || 'http://localhost:8888'

let browser = await launchBrowser()

browser.addListener('close', async page => {
  console.log('browser disconnected')
  browser = await launchBrowser()
})

browser.addListener('crash', async page => {
  console.log('browser crashed')
  browser = await launchBrowser()
})

// http://localhost:3000/app/profile/trader/0x01c067eE4B1d20Cb205700b0a2FfdCF569Aa58a3?path=&title=&cache=86400

export const ETH_ADDRESS_REGEXP = /^0x[a-fA-F0-9]{40}$/i
export const TX_HASH_REGEX = /^0x([A-Fa-f0-9]{64})$/i


export const whitelistPages = [
  {
    urlExp: /^\/app\/profile\/trader\/(0x[a-fA-F0-9]{40})$/,
    getUrl: (url: URL) => {
      const activityTimeframe = url.searchParams.get('activityTimeframe') || 2628000
      const address = getAddress(url.pathname.split('/')[4])
      return `trader?address=${address}&activityTimeframe=${activityTimeframe}`
    },
  }
]


const server = Bun.serve({
  async fetch(request: Request) {
    if (request.method !== 'GET') {
      return new Response('invalid method', { status: 400 })
    }

    if (browser.isClosed()) {
      return new Response('browser is closed', { status: 400 })
    }

    const url = new URL(request.url)

    // validate the pathname and query parameters from ogPages map
    const match = whitelistPages.find(x => url.pathname.match(x.urlExp))

    if (!match) {
      return new Response('invalid url', { status: 400 })
    }


    try {
      const cardUrl = match.getUrl(url)

      await browser.goto(`${CLIENT}/og/${cardUrl}`, { timeout: 15 * 1000, waitUntil: 'networkidle' })

      const screenshot = await browser.screenshot({ type: 'jpeg', quality: 95 })

      return new Response(screenshot, {
        headers: { "Content-Type": "image/png" },
      })
    } catch (error) {
      if (error instanceof Error) {
        return new Response(error.message, { status: 400 })
      }

      return new Response('unknown error', { status: 400 })
    }
  },
})

console.log('Server running at', server.url)


async function launchBrowser() {
  console.log('Launching browser')
  const localChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  const localExists = await Bun.file(localChrome).exists()
  console.log('localExists', localExists)
  const executable = localExists ? localChrome : process.env['CHROME_BIN']
  const chrome = await playwright.chromium.launch({
    executablePath: executable,
    headless: true, 
  })

  console.log('Browser launched')

  const page = await chrome.newPage({
    viewport: { height: 600, width: 600 }
  })

  console.log('Page created viewpost: 600x600')

  return page
}