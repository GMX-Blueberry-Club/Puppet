import playwright from 'playwright-core'
import { getAddress } from 'viem'

const CLIENT = process.env['CLIENT'] || 'http://localhost:8888'
const browserPage = launchBrowser()
const whitelistPages = [
  {
    urlExp: /^\/app\/profile\/trader\/(0x[a-fA-F0-9]{40})$/,
    getUrl: (url: URL) => {
      const activityTimeframe = url.searchParams.get('activityTimeframe') || 2628000
      const address = getAddress(url.pathname.split('/')[4])
      return `/og/trader?address=${address}&activityTimeframe=${activityTimeframe}`
    },
  }
]


Bun.serve({
  async fetch(request: Request) {
    if (request.method !== 'GET') {
      return new Response('invalid method', { status: 400 })
    }

    const page = await browserPage

    if (page.isClosed()) {
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

      console.log('cardUrl', cardUrl)


      // Use pushState to navigate to a new URL within the SPA
      await page.evaluate(async (url) => {
        // @ts-ignore
        (history as any).pushState({}, '', url)
        console.log('pushed state', url)
        await Promise.resolve()
      }, cardUrl)

      await page.waitForLoadState('networkidle')

      const screenshot = await page.screenshot({ omitBackground: true, type: 'png', quality: 95 })

      const headers = { "Content-Type": "image/png" }

      return new Response(screenshot, { headers })
    } catch (error) {
      console.error(error)
      if (error instanceof Error) {
        return new Response(error.message, { status: 400 })
      }

      return new Response('unknown error', { status: 400 })
    }
  },
})


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
    baseURL: CLIENT,
    viewport: { height: 600, width: 600 }
  })

  console.log(`going to ${CLIENT}`)



  await page.goto(`${CLIENT}/app/leaderboard`)

  await page.waitForLoadState('networkidle')

  console.log('Page loaded')

  // page.addListener('close', async page => {
  //   console.error('browser disconnected')
  //   browserPage = await launchBrowser()
  // })

  // page.addListener('crash', async page => {
  //   console.error('browser crashed')
  //   browserPage = await launchBrowser()
  // })

  return page
}