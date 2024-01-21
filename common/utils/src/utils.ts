import { curry2 } from "@most/prelude"
import * as viem from "viem"
import { IRequestPagePositionApi, IRequestSortApi, IResponsePageApi, ITokenDescription } from "./types.js"
import { BASIS_POINTS_DIVISOR, FACTOR_PERCISION, USD_DECIMALS } from "./const.js"
export * as GraphQL from '@urql/core'


export enum IntervalTime {
  SEC = 1,
  MIN = 60,
  MIN5 = 300,
  MIN15 = 900,
  MIN30 = 1800,
  MIN60 = 3600,
  HR2 = 7200,
  HR4 = 14400,
  HR6 = 21600,
  HR8 = 28800,
  HR24 = 86400,
  DAY7 = 604800,
  MONTH = 2628000,
  MONTH2 = 5256000,
  YEAR = 31536000
}


export const ETH_ADDRESS_REGEXP = /^0x[a-fA-F0-9]{40}$/i
export const TX_HASH_REGEX = /^0x([A-Fa-f0-9]{64})$/i
export const VALID_FRACTIONAL_NUMBER_REGEXP = /^-?(0|[1-9]\d*)(\.\d+)?$/


export function getTokenAmount(price: bigint, amountUsd: bigint) {
  return price ? amountUsd / price : 0n
}

export function getTokenUsd(price: bigint, tokenAmount: bigint) {
  return tokenAmount ? tokenAmount * price : 0n
}


// Constant to pull zeros from for multipliers
let zeros = "0"
while (zeros.length < 256) { zeros += zeros }

export function isAddress(address: any): address is viem.Address {
  return ETH_ADDRESS_REGEXP.test(address)
}

export function shortenAddress(address: string, padRight = 4, padLeft = 6) {
  return address.slice(0, padLeft) + "..." + address.slice(address.length - padRight, address.length)
}

export function shortPostAdress(address: string) {
  return address.slice(address.length - 4, address.length)
}

export function parseReadableNumber(stringNumber: string, locale?: Intl.NumberFormatOptions) {
  const thousandSeparator = Intl.NumberFormat('en-US', locale).format(11111).replace(/\p{Number}/gu, '')
  const decimalSeparator = Intl.NumberFormat('en-US', locale).format(1.1).replace(/\p{Number}/gu, '')

  const parsed = parseFloat(stringNumber
    .replace(new RegExp('\\' + thousandSeparator, 'g'), '')
    .replace(new RegExp('\\' + decimalSeparator), '.')
  )
  return parsed
}

export const readableAccountingNumber: Intl.NumberFormatOptions = { maximumFractionDigits: 2, minimumFractionDigits: 2 }
export const readableLargeNumber: Intl.NumberFormatOptions = { maximumFractionDigits: 0 }
export const readableTinyNumber: Intl.NumberFormatOptions = { maximumSignificantDigits: 2, minimumSignificantDigits: 2 }

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#options
export const readableNumber = curry2((formatOptions: Intl.NumberFormatOptions, ammount: number | bigint) => {
  const absAmount = Math.abs(Number(ammount))
  const digitOptions = absAmount >= 1000 ? readableLargeNumber : absAmount >= 1 ? readableAccountingNumber : readableTinyNumber

  return Intl.NumberFormat("en-US", { ...digitOptions, ...formatOptions,  }).format(ammount)
})

const intlOptions: Intl.DateTimeFormatOptions = { year: '2-digit', month: 'short', day: '2-digit' }

export const readableUnitAmount = readableNumber({ })
export const readableAccountingAmount = readableNumber(readableAccountingNumber)
export const readableUSD = readableNumber({ })
export const readablePercentage = (amount: bigint) => readableUnitAmount(formatFixed(amount, 2)) + '%'
export const readableFactorPercentage = (amount: bigint) => readableUnitAmount(formatFixed(amount, FACTOR_PERCISION) * 100) + '%'
export const readableLeverage = (a: bigint, b: bigint) => (b ? readableUnitAmount(formatFixed(a * BASIS_POINTS_DIVISOR / b, 4)) : 0n) + 'x'
export const readableUsd = (ammount: bigint) => readableUSD(formatFixed(ammount, USD_DECIMALS))
export const readablePnl = (ammount: bigint) => readableNumber({ signDisplay: "exceptZero" })(formatFixed(ammount, USD_DECIMALS))
export const readableTokenAmountFromUsdAmount = (decimals: number, price: bigint, amount: bigint) => readableUnitAmount(formatFixed(getTokenAmount(price, amount), decimals))
export const readableTokenUsd = (price: bigint, amount: bigint) => readableUsd(getTokenUsd(price, amount))
export const readableTokenAmount = (tokenDesc: ITokenDescription, amount: bigint) => readableUnitAmount(formatFixed(amount, tokenDesc.decimals))
export const readableTokenAmountLabel = (tokenDesc: ITokenDescription, amount: bigint) => readableTokenAmount(tokenDesc, amount) + ' ' + tokenDesc.symbol
export const readableTokenPrice = (decimals: number, amount: bigint) => readableAccountingAmount(formatFixed(amount, USD_DECIMALS - decimals))

const UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte', 'petabyte']
const BYTES_PER_KB = 1000

export function readableFileSize(sizeBytes: number | bigint): string {
  let size = Math.abs(Number(sizeBytes))

  let u = 0
  while(size >= BYTES_PER_KB && u < UNITS.length-1) {
    size /= BYTES_PER_KB
    ++u
  }

  return new Intl.NumberFormat([], {
    style: 'unit',
    unit: UNITS[u],
    unitDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(size)
}

export const readableDate = (timestamp: number) => new Date(timestamp * 1000).toLocaleDateString(undefined, intlOptions)



export function shortenTxAddress(address: string) {
  return shortenAddress(address, 8, 6)
}

export function getTokenDenominator(tokenDEsc: ITokenDescription) {
  return 10n ** BigInt(tokenDEsc.decimals)
}

export function getDenominator(decimals: number) {
  return 10n ** BigInt(decimals)
}

export function expandDecimals(n: bigint, decimals: number) {
  return n * getDenominator(decimals)
}

function getMultiplier(decimals: number): string {
  if (decimals >= 0 && decimals <= 256 && !(decimals % 1)) {
    return ("1" + zeros.substring(0, decimals))
  }

  throw new Error("invalid decimal size")
}

export function formatFixed(value: bigint, decimals: number): number {
  const multiplier = getMultiplier(decimals)
  const multiplierBn = BigInt(multiplier)
  let parsedValue = ''

  const negative = value < 0n
  if (negative) {
    value *= -1n
  }

  let fraction = (value % multiplierBn).toString()

  while (fraction.length < multiplier.length - 1) {
    fraction = "0" + fraction
  }

  const matchFractions = fraction.match(/^([0-9]*[1-9]|0)(0*)/)!
  fraction = matchFractions[1]

  const whole = (value / multiplierBn).toString()

  parsedValue = whole + "." + fraction

  if (negative) {
    parsedValue = "-" + parsedValue
  }

  return Number(parsedValue)
}

export function parseFixed(input: string | number, decimals = 18) {
  let value = typeof input === 'number' ? String(input) : input

  const multiplier = getMultiplier(decimals)
  const multiplierLength = multiplier.length

  if (!VALID_FRACTIONAL_NUMBER_REGEXP.test(value)) {
    throw new Error('invalid fractional value')
  }

  if (multiplier.length - 1 === 0) {
    return BigInt(value)
  }

  const negative = (value.substring(0, 1) === "-")
  if (negative) {
    value = value.substring(1)
  }
  const comps = value.split(".")

  let whole = comps[0]
  let fraction = comps[1]

  if (!whole) { whole = "0" }
  if (!fraction) { fraction = "0" }

  // Prevent underflow
  if (fraction.length > multiplierLength - 1) {
    throw new Error('fractional component exceeds decimals')
  }

  // Fully pad the string with zeros to get to wei
  while (fraction.length < multiplierLength - 1) { fraction += "0" }

  const wholeValue = BigInt(whole)
  const fractionValue = BigInt(fraction)

  const wei = (wholeValue * BigInt(multiplier)) + fractionValue

  return negative ? -wei : wei
}


export declare type Nominal<T, Name extends string> = T & {
  [Symbol.species]: Name
}

export type UTCTimestamp = Nominal<number, "UTCTimestamp">

export const tzOffset = new Date().getTimezoneOffset() * 60000

export function timeTzOffset(ms: number): UTCTimestamp {
  return Math.floor((ms - tzOffset)) as UTCTimestamp
}

export function unixTimeTzOffset(ms: number): UTCTimestamp {
  return ms as UTCTimestamp
}


export type TimelineTime = {
  time: number
}

export interface IFillGap<T, R, RTime extends R & TimelineTime = R & TimelineTime> {
  interval?: number
  getTime: (t: T) => number
  seed: R
  source: T[]

  seedMap: (acc: RTime, next: T, intervalSlot: number) => R
  gapMap?: (acc: RTime, next: T, intervalSlot: number) => R
  squashMap?: (acc: RTime, next: T, intervalSlot: number) => R
}



export function createTimeline<T, R, RTime extends R & TimelineTime = R & TimelineTime>(config: IFillGap<T, R, RTime>) {
  const {
    source, getTime, seed,
    seedMap,
    gapMap = prev => prev,
    squashMap = seedMap,
  } = config

  if (source.length === 0) {
    return []
  }

  const sortedSource = [...source].sort((a, b) => getTime(a) - getTime(b))
  const interval = config.interval ?? Math.floor((getTime(sortedSource[sortedSource.length - 1]) - getTime(sortedSource[0])) / sortedSource.length)
  const fstSrc = sortedSource[0]
  const seedSlot = Math.floor(getTime(fstSrc) / interval)
  const normalizedSeed = { ...seed, time: seedSlot * interval } as RTime

  const timeslotMap: { [k: number]: RTime } = {
    [seedSlot]: normalizedSeed
  }

  return sortedSource.reduce((timeline: RTime[], next: T) => {
    const lastIdx = timeline.length - 1
    const intervalSlot = Math.floor(getTime(next) / interval)
    const squashPrev = timeslotMap[intervalSlot]

    if (squashPrev) {
      const newSqush = { ...squashMap(squashPrev, next, intervalSlot), time: squashPrev.time } as RTime
      timeslotMap[intervalSlot] = newSqush
      timeline.splice(lastIdx, 1, newSqush)
    } else {
      const prev = timeline[timeline.length - 1]

      const time = intervalSlot * interval
      const barSpan = (time - prev.time) / interval
      const barSpanCeil = barSpan - 1

      for (let index = 1; index <= barSpanCeil; index++) {
        const gapTime = interval * index
        const newTime = prev.time + gapTime
        const newSlot = Math.floor(newTime / interval)
        const fillNext = gapMap(timeline[timeline.length - 1], next, newSlot)
        const newTick = { ...fillNext, time: newTime } as RTime

        timeslotMap[newSlot] ??= newTick
        timeline.push(newTick)
      }

      const lastTick = seedMap(timeline[timeline.length - 1], next, intervalSlot)
      const item = { ...lastTick, time: time } as RTime

      timeslotMap[intervalSlot] = item
      timeline.push(item)
    }

    return timeline
  }, [normalizedSeed])
}


function defaultComperator<T>(queryParams: IRequestSortApi<T>) {
  return function (a: T, b: T) {
    return queryParams.direction === 'desc'
      ? Number(b[queryParams.selector]) - Number(a[queryParams.selector])
      : Number(a[queryParams.selector]) - Number(b[queryParams.selector])
  }
}

export function pagingQuery<T, ReqParams extends IRequestPagePositionApi & (IRequestSortApi<T> | object)>(
  queryParams: ReqParams,
  res: T[],
  customComperator?: (a: T, b: T) => number
): IResponsePageApi<T> {
  let list = res
  if ('selector' in queryParams) {
    const comperator = typeof customComperator === 'function'
      ? customComperator
      : defaultComperator(queryParams)

    list = res.sort(comperator)
  }

  const { pageSize, offset } = queryParams
  const page = list.slice(queryParams.offset, offset + pageSize)
  return { offset, page, pageSize }
}



export const unixTimestampNow = () => Math.floor(Date.now() / 1000)


export const getExplorerUrl = (chain: viem.Chain) => {
  return chain.blockExplorers?.default.url || chain.blockExplorers?.etherscan?.url
}
export const getTxExplorerUrl = (chain: viem.Chain, hash: string) => {
  return getExplorerUrl(chain) + '/tx/' + hash
}

export function getAccountExplorerUrl(chain: viem.Chain, account: viem.Address) {
  return getExplorerUrl(chain) + "/address/" + account
}

export function getDebankProfileUrl(account: viem.Address) {
  return `https://debank.com/profile/` + account
}










export const timespanPassedSinceInvoke = (timespan: number) => {
  let lastTimePasses = unixTimestampNow()

  return () => {
    const nowTime = unixTimestampNow()
    const delta = nowTime - lastTimePasses
    if (delta > timespan) {
      lastTimePasses = nowTime
      return true
    }

    return false
  }
}

interface ICacheItem<T> {
  item: Promise<T>
  lifespanFn: () => boolean
}


export const cacheMap = (cacheMap: { [k: string]: ICacheItem<any> }) => <T>(key: string, lifespan: number, cacheFn: () => Promise<T>): Promise<T> => {
  const cacheEntry = cacheMap[key]

  if (cacheEntry && !cacheMap[key].lifespanFn()) {
    return cacheEntry.item
  } else {
    const lifespanFn = cacheMap[key]?.lifespanFn ?? timespanPassedSinceInvoke(lifespan)
    const newLocal = { item: cacheFn(), lifespanFn }
    cacheMap[key] = newLocal
    return cacheMap[key].item
  }
}


export function groupArrayManyMap<A, B extends string | symbol | number, R>(list: A[], getKey: (v: A) => B, mapFn: (v: A, key: B) => R): Record<B, R[]> {
  const gmap = {} as { [P in B]: R[] }

  list.forEach(item => {
    const key = getKey(item)

    if (key === undefined) {
      throw new Error(`key is undefined`)
    }

    gmap[key] ??= []
    const mappedValue = mapFn(item, key)
    gmap[key].push(mappedValue)
  })

  return gmap
}

export function groupArrayMany<A, B extends string | symbol | number>(list: A[], getKey: (v: A) => B): Record<B, A[]> {
  return groupArrayManyMap(list, getKey, (x) => x)
}


export function groupArrayByKey<A, B extends string | symbol | number>(list: A[], getKey: (v: A) => B): Record<B, A> {
  return groupArrayByKeyMap(list, getKey, (x) => x)
}


export function groupArrayByKeyMap<A, B extends string | symbol | number, R>(list: A[], getKey: (v: A) => B, mapFn: (v: A, key: B) => R) {
  const gmap = {} as { [P in B]: R }

  for (const item of list) {
    const key = getKey(item)

    if (key === undefined) {
      throw new Error(`key is undefined`)
    }

    gmap[key] = mapFn(item, key)
  }

  return gmap
}

export function getSafeMappedValue<T extends object>(contractMap: T, prop: any, fallbackProp: keyof T): T[keyof T] {
  return prop in contractMap
    ? contractMap[prop as keyof T]
    : contractMap[fallbackProp]
}

export function getMappedValue<TMap extends object, TMapkey extends keyof TMap>(contractMap: TMap, prop: unknown): TMap[TMapkey] {
  if (contractMap[prop as TMapkey]) {
    return contractMap[prop as TMapkey]
  }

  throw new Error(`prop ${String(prop)} does not exist in object`)
}

export function easeInExpo(x: number) {
  return x === 0 ? 0 : Math.pow(2, 10 * x - 10)
}



const intervals = [
  { label: 'year', seconds: IntervalTime.MONTH * 12 },
  { label: 'month', seconds: IntervalTime.MONTH },
  { label: 'day', seconds: IntervalTime.HR24 },
  { label: 'hr', seconds: IntervalTime.MIN * 60 },
  { label: 'min', seconds: IntervalTime.MIN },
  { label: 'sec', seconds: IntervalTime.SEC }
] as const

export function getTimeSince(time: number, suffix = 'ago') {
  const timeDelta = unixTimestampNow() - time
  const interval = intervals.find(i => i.seconds < timeDelta)

  if (!interval) {
    return 'now'
  }

  const count = Math.floor(timeDelta / interval.seconds)
  return `${count} ${interval.label}${count !== 1 ? 's' : ''} ${suffix}`
}


export const displayDate = (unixTime: number | bigint) => {
  return `${new Date(Number(unixTime) * 1000).toDateString()} ${new Date(Number(unixTime) * 1000).toLocaleTimeString()}`
}


export function countdownFn(targetDate: number | bigint, now: number | bigint) {
  const distance = Number(targetDate) - Number(now)

  const days = Math.floor(distance / (60 * 60 * 24))
  const hours = Math.floor((distance % (60 * 60 * 24)) / (60 * 60))
  const minutes = Math.floor((distance % (60 * 60)) / 60)
  const seconds = Math.floor(distance % 60)

  return `${days ? days + "d " : ''} ${hours ? hours + "h " : ''} ${minutes ? minutes + "m " : ''} ${seconds ? seconds + "s " : ''}`
}

export function getIntervalBasedOnTimeframe(maxColumns: number, from: number, to: number) {
  const delta = to - from

  const interval = maxColumns < delta / IntervalTime.DAY7
    ? IntervalTime.DAY7 : maxColumns < delta / IntervalTime.HR24
      ? IntervalTime.HR24 : maxColumns < delta / IntervalTime.HR4
        ? IntervalTime.HR4 : maxColumns < delta / IntervalTime.MIN60
          ? IntervalTime.MIN60 : maxColumns < delta / IntervalTime.MIN15
            ? IntervalTime.MIN15 : IntervalTime.MIN5

  return interval
}

function padZero(str: string | number, len = 2) {
  const zeros = new Array(len).join('0')
  return (zeros + str).slice(-len)
}

export function invertColor(hex: string, bw = true) {
  if (hex.indexOf('#') === 0) {
    hex = hex.slice(1)
  }
  // convert 3-digit hex to 6-digits.
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
  }
  if (hex.length !== 6) {
    throw new Error('Invalid HEX color.')
  }
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)

  if (bw) {
    // https://stackoverflow.com/a/3943023/112731
    return (r * 0.299 + g * 0.587 + b * 0.114) > 186
      ? '#000000'
      : '#FFFFFF'
  }


  // pad each with zeros and return
  return "#" + padZero((255 - r).toString(16)) + padZero((255 - g).toString(16)) + padZero((255 - b).toString(16))
}

export function getClosestNumber<T extends readonly number[]> (arr: T, chosen: number): T[number] {
  return arr.reduce((a, b) => b - chosen < chosen - a ? b : a)
}




export function lst<T>(a: readonly T[]): T {
  if (a.length === 0) throw new Error('empty array')
  return a[a.length - 1]
}

export function div(a: bigint, b: bigint): bigint {
  if (b === 0n) return 0n

  return a * BASIS_POINTS_DIVISOR / b
}

export function formatDiv(a: bigint, b: bigint): number {
  return formatFixed(a * BASIS_POINTS_DIVISOR / b, 4)
}

export function parseBps(a: number | string): bigint {
  return parseFixed(a, 4)
}

export function getAdjustedDelta(size: bigint, sizeDeltaUsd: bigint, pnl: bigint) {
  if (size === 0n) {
    return 0n
  }

  return sizeDeltaUsd * pnl / size
}

export function getPriceDeltaPercentage(positionPrice: bigint, price: bigint) {
  const priceDelta = price - positionPrice

  return priceDelta / positionPrice
}

export function getPriceDelta(isLong: boolean, entryPrice: bigint, priceChange: bigint) {
  return isLong ? priceChange - entryPrice : entryPrice - priceChange
}

export function getShortHash(name: string, obj: any) {
  const str = JSON.stringify(obj)
  let hash = 0

  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0 // Convert to 32bit integer
  }
    
  return `${name}-${hash.toString(16)}`
}


