// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {IVault} from "./IVault.sol";

interface IGMXReader {

    function getPositions(address _vault, address _account, address[] memory _collateralTokens, address[] memory _indexTokens, bool[] memory _isLong) external view returns(uint256[] memory);

    function getMaxAmountIn(IVault _vault, address _tokenIn, address _tokenOut) external view returns (uint256);
}