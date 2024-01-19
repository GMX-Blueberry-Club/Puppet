import { O } from "@aelea/core"
import { map } from "@most/core"
import { Client, ClientOptions, Exchange, OperationContext, TypedDocumentNode, cacheExchange, createClient, fetchExchange, gql } from "@urql/core"
import {
  IIdentifiableEntity, IRequestPagePositionApi
} from "gmx-middleware-utils"
import fetch from "isomorphic-fetch"
import { numberToHex } from "viem"
import { ILabItem, ILabItemOwnership, IOwner, IToken } from "./types.js"
export { Stream } from "@most/types"


export type { Client, ClientOptions, OperationContext, TypedDocumentNode }

const createSubgraphClient = (opts: ClientOptions) => {
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

const blueberrySubgraph = createSubgraphClient({
  fetch: fetch,
  url: 'https://api.thegraph.com/subgraphs/name/nissoh/blueberry-club-arbitrum',
  exchanges: [cacheExchange, fetchExchange,],
})


export async function querySubgraph(document: string): Promise<any> {
  return blueberrySubgraph(gql(document) as any, {})
}


export const ownerList = O(
  map(async (queryParams: Partial<IRequestPagePositionApi>) => {

    const res = await await querySubgraph(`
{
  owners(first: ${queryParams.pageSize || 1000}, skip: ${queryParams.offset || 0}, orderDirection: asc) {
    id
    balance
    ownedLabItems(first: 1000) {
      balance
      id
    }
    ownedTokens(first: 1000) {
      id
      labItems {
        id
      }
    }
    profile {
      id
      labItems {
        id
      }
    }
  }
}
`)


    return res.owners.map(ownerJson) as IOwner[]
  })
)

export const owner = O(
  map(async (queryParams: IIdentifiableEntity) => {

    const res = await await querySubgraph(`
{
  owner(id: "${queryParams.id.toLowerCase()}") {
    id
    balance
    ownedLabItems(first: 1000) {
      balance
      id
    }
    ownedTokens(first: 1000) {
      id
      labItems {
        id
      }
    }
    profile {
      id
      labItems {
        id
      }
    }
  }
}
`)

    return res.owner ? ownerJson(res.owner) : null
  })
)

export const token = O(
  map(async (queryParams: IIdentifiableEntity) => {

    const res = await await querySubgraph(`
{
  token(id: "${numberToHex(Number(queryParams.id))}") {
    id
    owner {
      id
      balance
      ownedLabItems(first: 1000) {
        balance
        id
      }
      rewardClaimedCumulative
      ownedTokens(first: 1000) {
        id
        labItems {
          id
        }
      }
      profile {
        id
        labItems {
          id
        }
      }
    }
    transfers {
      id
      token
      from {
        id
      }
      to {
        id
      }
      timestamp
      transaction {
        id
      }
    }
    labItems {
      id
    }
  }
}
`)


    return tokenJson(res.token)
  })
)

export async function getTokenListPick(tokenList: number[]) {

  const newLocal = `
{
  ${tokenList.map(id => `
_${id}: token(id: "${numberToHex(id)}") {
  id
  labItems {
    id
  }
}
  `).join('')}
}
`
  const res = await querySubgraph(newLocal)
  const rawList: IToken[] = Object.values(res)

  return rawList.map(token => tokenJson(token))
}



export async function getProfilePickList(idList: string[]): Promise<IOwner[]> {
  if (idList.length === 0) {
    return []
  }


  const doc = `
{
  ${idList.map(id => `
_${id}: owner(id: "${id}") {
    id
    ownedLabItems {
      balance
      item {
        id
      }
      id
    }
    ownedTokens {
      id
      labItems {
        id
      }
    }
    profile {
      id
      labItems {
        id
      }
    }

}
  `).join('')}
}
`
  const res = await querySubgraph(doc)
  const rawList: IOwner[] = Object.values(res)

  return rawList.filter(x => x !== null).map(token => ownerJson(token))
}



function labItemJson(obj: ILabItem): ILabItem {
  return {
    ...obj
  }
}

function tokenJson(obj: IToken): IToken {
  return {
    ...obj,
    labItems: obj.labItems.map(labItemJson),
    owner: obj.owner ? ownerJson(obj.owner) : obj.owner,
    id: Number(obj.id)
  }
}

function ownerJson(obj: IOwner): IOwner {
  const ownedTokens = obj.ownedTokens.map(t => tokenJson(t))

  const newLocal = obj.ownedLabItems.map((json): ILabItemOwnership => {
    return { ...json, balance: BigInt(json.balance), item: { ...json.item, id: Number(json.id) } }
  })

  return {
    ...obj,
    profile: obj.profile ? tokenJson(obj.profile) : null,
    ownedTokens,
    ownedLabItems: newLocal
  }
}
