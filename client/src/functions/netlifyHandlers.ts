exports.handler = async function (event, context) {
  const API_SECRET = process.env.API_SECRET
  const result = await fetch(`https://some-api.com/data?secret=${API_SECRET}`)
  const data = await result.json()

  return {
    statusCode: 200,
    body: JSON.stringify(data)
  }
}

import { Config, Context } from "https://edge.netlify.com"

export default async (req: Request, { cookies, geo }: Context) => {
  if (
    geo.city === "Paris" &&
    cookies.get("promo-code") === "baguette"
  ) {
    const newURL = new URL("/sale", req.url)
    const res = await fetch(newURL)
    const text = await res.text()

    return new Response(text.replaceAll("baguette", "🥖"), res)
  }
}

export const config: Config = {
  path: "/"
}