import { Address, encodePacked, keccak256 } from "viem";


export function getRouteTypeKey(collateralToken: Address, indexToken: Address, isLong: boolean) {
    return keccak256(encodePacked(
        ["address", "address", "bool"],
        [collateralToken, indexToken, isLong]
    ))
}

export function getRouteKey(trader: Address, collateralToken: Address, indexToken: Address, isLong: boolean) {
    return keccak256(encodePacked(
        ["address", "address", "address", "bool"],
        [trader, collateralToken, indexToken, isLong]
    ))
}