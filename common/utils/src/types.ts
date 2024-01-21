export interface IRequestPagePositionApi {
  offset: number
  pageSize: number
}


export interface IResponsePageApi<T> extends IRequestPagePositionApi {
  page: T[]
}

export interface IRequestSortApi<T> {
  selector: keyof T
  direction: 'desc' | 'asc'
}

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type Nullable<T> = {
  [P in keyof T]: T[P] | null
}
export type NonNullableStruct<T> = {
  [P in keyof T]: NonNullable<T[P]>
}

export interface ITokenDescription {
  name: string
  symbol: string
  isUsd: boolean
  decimals: number
}



