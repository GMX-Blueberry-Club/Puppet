import { hashData } from "gmx-middleware-utils"
import * as viem from "viem"



export function getPuppetAllowancesKey(puppet: viem.Address): viem.Hex {
  return hashData(
    ["string", "address"],
    ["PUPPET_ALLOWANCES", puppet]
  )
}

export function getPuppetSubscriptionExpiryKey(puppet: viem.Address, routeKey: viem.Hex): viem.Hex {
  return hashData(
    ["string", "address", "bytes32"],
    ["PUPPET_SUBSCRIPTION_EXPIRY", puppet, routeKey]
  )
}

export function getTradeRouteKey(trader: viem.Address, collateralToken: viem.Address, indexToken: viem.Address, isLong: boolean) {
  return hashData(
    ["address", "address", "address", "bool"],
    [trader, collateralToken, indexToken, isLong]
  )
}

export function getRouteAddressKey(routeKey: viem.Hex): viem.Hex {
  return hashData(
    ["string", "bytes32"],
    ["ROUTE_ADDRESS", routeKey]
  )
}

export function getRouteTypeKey(collateralToken: viem.Address, indexToken: viem.Address, isLong: boolean, data: viem.Hex): viem.Hex {
  return hashData(
    ["address", "address", "bool", "bytes"],
    [collateralToken, indexToken, isLong, data ]
  )
}

export function getPuppetSubscriptionKey(puppet: viem.Address, trader: viem.Address, routeTypeKey: viem.Hex): viem.Hex {
  return hashData(
    ["address", "address", "bytes32"],
    [puppet, trader, routeTypeKey]
  )
}


export function getPuppetDepositAccountKey(puppet: viem.Address, asset: viem.Address): viem.Hex {
  return hashData(
    ["string", "address", "address"],
    ["PUPPET_DEPOSIT_ACCOUNT", puppet, asset]
  )
}

export function getRouteTraderKey(address: viem.Address): viem.Hex {
  return hashData(
    ["string", "address"],
    ["ROUTE_ADDRESS", address]
  )
}

