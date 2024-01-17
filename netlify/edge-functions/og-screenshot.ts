// screenshot.ts
import { Context, } from '@netlify/edge-functions'
import chromium from 'chrome-aws-lambda'

export default async function handler(request: Request, context: Context) {
  let browser = null
  const url = new URL(request.url)
  console.log('TEST')

  try {
    // Launch the browser in headless mode
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    })

    const cacheParam = url.searchParams.get('cache')
    const page = await browser.newPage()
    await page.goto(request.url, { waitUntil: 'networkidle0' })
    const screenshot = await page.screenshot({ type: 'jpeg' })
    const imageStr = screenshot.toString('base64')

    return new Response(imageStr, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': `s-maxage=${cacheParam}`,
      },
      // isBase64Encoded: true,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Screenshot failed' }), {
      status: 500,
    })
  } finally {
    // Close the browser
    if (browser !== null) {
      await browser.close()
    }
  }
}

export const config = { path: "/og-screenshot" }



// import { existsSync } from 'fs'
// import chromium from 'chrome-aws-lambda'
// import puppeteer from 'puppeteer-core'

// export default async function handler(request, context) {
//   const localChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
//   const executable = existsSync(localChrome) ? localChrome : chromium.executablePath
//   const browser = await puppeteer.launch({
//     args: chromium.args,
//     executablePath: await executable,
//     headless: true,
//     defaultViewport: { height: 600, width: 600 }, 
//   })

//   const url = new URL(request.url)
//   // const titleParam = url.searchParams.get('title')
//   const pathParam = url.searchParams.get('path')
//   const cacheParam = url.searchParams.get('cache')

//   // ensure that path is plain simple word
//   // const isValidPath = pathParam.match(/^\w+$/)
//   const targetUrl = pathParam // isValidPath ? `https://puppet.house/app/${pathParam}` : 'https://puppet.house/app/leaderboard'

//   const page = await browser.newPage()

//   await page.goto(targetUrl, { waitUntil: 'networkidle0' })

//   const imageStr = (await page.screenshot()).toString('base64')
  
//   return new Response(
//     imageStr,
//     {
//       status: 200,
//       headers: {
//         'Content-Type': 'image/png',
//         'Cache-Control': `s-maxage=${cacheParam}`,
//       },
//     }
//   )
// }

// export const config = { path: "/og-screenshot" }