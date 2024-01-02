
import { replayLatest } from "@aelea/core"
import { http, observer } from "@aelea/ui-components"
import { empty, fromPromise, map, mergeArray, multicast, now, scan, skip } from "@most/core"
import { Stream } from "@most/types"
import { fetchBalance, readContract } from "@wagmi/core"
import { erc20Abi } from "abitype/abis"
import * as GMX from "gmx-middleware-const"
import {
  IPriceCandleDto, IRequestPricefeedApi, ITokenDescription, ITokenSymbol,
  filterNull, getDenominator, getMappedValue, getTokenDescription, parseFixed, periodicRun, resolveAddress
} from "gmx-middleware-utils"
import * as viem from "viem"
import { } from "viem"
import { ISupportedChain } from "../wallet/walletLink.js"

