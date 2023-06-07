import { ClientOptions, OperationContext, TypedDocumentNode, cacheExchange, createClient, fetchExchange, gql } from "@urql/core"
import fetch from "isomorphic-fetch"


export const createSubgraphClient = (opts: ClientOptions) => {

  const client = createClient(opts)

  return async <Data, Variables extends object = object>(document: TypedDocumentNode<Data, Variables>, params: Variables, context?: Partial<OperationContext>): Promise<Data> => {
    const result = await client.query(document, params, context)
      .toPromise()

    if (result.error) {
      throw new Error(result.error.message)
    }

    return result.data!
  }
}



const puppetSubgraph = createSubgraphClient({
  fetch: fetch,
  url: 'https://api.thegraph.com/subgraphs/name/nissoh/blueberry-club-arbitrum',
  exchanges: [cacheExchange, fetchExchange,],
})


export async function querySubgraph(document: string): Promise<any> {
  return puppetSubgraph(gql(document) as any, {})
}

