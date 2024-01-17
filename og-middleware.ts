import type { Context } from "@netlify/edge-functions"

export default async function handler(request: Request, context: Context) {
  const response = await context.next()
  const page = await response.text()
  const url = new URL(request.url)
  const pathParam = url.searchParams.get('path') || ''
  const titleParam = url.searchParams.get('title') || ''
  const cacheParam = url.searchParams.get('cache') || '86400'

  const replacement = `og-screenast/?path=${encodeURIComponent(pathParam)}&title=${encodeURIComponent(titleParam)}&cache=${encodeURIComponent(cacheParam)}`
  const replacedPage = page.replace(/(<meta property="og:image" content=")[^"]*(">)/, `$1${replacement}$2`)

  response.headers.set('cache-control', `s-maxage=${cacheParam}`)

  return new Response(replacedPage, response)
}

export const config = { path: "/*" }