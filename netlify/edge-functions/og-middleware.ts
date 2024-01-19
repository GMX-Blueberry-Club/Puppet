import type { Context } from "@netlify/edge-functions"

export default async function handler(request: Request, context: Context) {
  const response = await context.next()
  const page = await response.text()

  const url = new URL(request.url)
  const pathParam = encodeURIComponent(url.searchParams.get('path') || '')
  const titleParam = encodeURIComponent(url.searchParams.get('title') || '')
  const cacheParam = encodeURIComponent(url.searchParams.get('cache') || '86400')

  const opengraphService = process?.env.CLIENT || 'http://localhost:8000'
  const replacement = `${opengraphService}${url.pathname}?path=${pathParam}&title=${titleParam}&cache=${cacheParam}`
  const replacedPage = page.replace(/(<meta property="og:image" content=")[^"]*(">)/, `$1${replacement}$2`)

  return new Response(replacedPage, response)
}

export const config = { path: "/*" }

