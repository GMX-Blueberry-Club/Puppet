import playwright from 'playwright-core'


const pageQuery = launchBrowser()

Bun.serve({
  async fetch(request: Request) {
    const url = new URL(request.url)

    // if (url.pathname !== "/screenshot") {
    //   return new Response("Invalid request", { status: 400 })
    // }

    try {
      const page = await pageQuery

      console.log('going to page')
      await page.goto('https://puppet.house/app/profile/trader/0x015067eE4B1d20Cb205700b012FfdCF569Aa58E4', { timeout: 15 * 1000, waitUntil: 'networkidle' })
      const screenshot = await page.screenshot({ type: 'jpeg', quality: 95 })
      console.log('screenshot taken')

      return new Response(screenshot, {
        headers: { "Content-Type": "image/png" },
      })
    } catch (error) {
      return Response.json({ error: 'Screenshot failed' })
    }
  },
})

console.log("Server running on http://localhost:3000")


async function launchBrowser() {
  console.log('Launching browser')
  const localChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  const localExists = await Bun.file(localChrome).exists()
  console.log('localExists', localExists)
  const executable = localExists ? localChrome : process.env['CHROMIUM_EXECUTABLE_PATH']
  const browser = await playwright.chromium.launch({
    executablePath: executable,
    headless: true, 
  })

  console.log('Browser launched')

  const page = await browser.newPage({
    viewport: { height: 600, width: 600 }
  })

  console.log('Page created viewpost: 600x600')

  return page
}