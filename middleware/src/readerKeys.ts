import { hashData } from "gmx-middleware-utils"
import * as viem from "viem"




export function getTradeRouteKey(trader: viem.Address, collateralToken: viem.Address, indexToken: viem.Address, isLong: boolean): viem.Hex {
  const tradeRouteKey = hashData(
    ["address", "address", "address", "bool"],
    [trader, collateralToken, indexToken, isLong]
  )
  const routeAddressKey = hashData(
    ["string", "bytes32"],
    ["ROUTE_ADDRESS", tradeRouteKey]
  )

  return routeAddressKey
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

