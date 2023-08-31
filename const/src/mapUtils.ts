import * as viem from "viem"

export function getRouteTypeKey(collateralToken: viem.Address, indexToken: viem.Address, isLong: boolean): viem.Hex {
  return viem.keccak256(viem.encodePacked(
    ["address", "address", "bool"],
    [collateralToken, indexToken, isLong]
  ))
}

export function getRouteKey(trader: viem.Address, collateralToken: viem.Address, indexToken: viem.Address, isLong: boolean): viem.Hex {
  return viem.keccak256(viem.encodePacked(
    ["address", "address", "address", "bool"],
    [trader, collateralToken, indexToken, isLong]
  ))
}

export function getPuppetSubscriptionKey(puppet: viem.Address, trader: viem.Address, routeTypeKey: viem.Hex): viem.Hex {
  return viem.keccak256(viem.encodePacked(
    ["address", "address", "bytes32"],
    [puppet, trader, routeTypeKey]
  ))
}


