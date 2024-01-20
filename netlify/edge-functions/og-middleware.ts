import type { Context } from "@netlify/edge-functions"

export default async function handler(request: Request, context: Context) {
  const response = await context.next()

  // Only process HTML documents
  const contentType = response.headers.get('Content-Type') || ''
  if (!contentType.includes('text/html')) {
    return response
  }

  try {
    const page = await response.text()
    const url = new URL(request.url)
    const pathParam = encodeURIComponent(url.searchParams.get('path') || '')
    const titleParam = encodeURIComponent(url.searchParams.get('title') || '')
    const cacheParam = encodeURIComponent(url.searchParams.get('cache') || '86400')

    const opengraphService = Netlify.env.get("CLIENT") || 'http://localhost:8000'
    const replacement = `${opengraphService}${url.pathname}?path=${pathParam}&title=${titleParam}&cache=${cacheParam}`
    const replacedPage = page.replace(/(<meta property="og:image" content=")[^"]*(">)/, `$1${replacement}$2`)

    // Set the Content-Type header
    const headers = new Headers(response.headers)
    headers.set('Content-Type', 'text/html')

    return new Response(replacedPage, {
      headers: headers,
      status: response.status,
      statusText: response.statusText,
    })
  } catch (error) {
    // Handle errors or return the original response
    console.error(error)
    return response
  }
}

export const config = { path: "/*" }