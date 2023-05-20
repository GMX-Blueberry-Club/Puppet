// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {AggregatorV3Interface} from "@chainlink/src/v0.8/interfaces/AggregatorV3Interface.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

import {IOrchestrator} from "./interfaces/IOrchestrator.sol";

contract RevenueDistributor is ReentrancyGuard {

    using Address for address payable;

    uint256 totalCRPNL; // CRPNL - Cumulative Realised PnL
    uint256 nonce;
    uint256 prizePoolAmountInUSD;
    uint256 startDistributionTime;

    address public owner;

    mapping(uint256 => mapping(address => uint256)) public routeCRPNL; // nonce => Route => CRPNL

    IOrchestrator orchestrator;
    AggregatorV3Interface priceFeed = AggregatorV3Interface(address(0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612));

    // ============================================================================================
    // Constructor
    // ============================================================================================

    constructor(address _orchestrator, address _owner) {
        orchestrator = IOrchestrator(_orchestrator);
        owner = _owner;
    }

    // ============================================================================================
    // External Functions
    // ============================================================================================

    function distribute() external nonReentrant {
        if (block.timestamp - startDistributionTime < 26 days) revert NotEnoughTimePassed();

        (, int256 _price,,,) = priceFeed.latestRoundData();

        totalCRPNL = 0;
        nonce += 1;
        startDistributionTime = block.timestamp;
        prizePoolAmountInUSD = address(this).balance * uint256(_price) / 1e8;
        
        uint256 _totalCRPNL;
        address[] memory _routes = orchestrator.getRoutes();
        for (uint256 i = 0; i < _routes.length; i++) {
            address _route = _routes[i];
            uint256 _routeCRPNL = _getRouteCRPNL(_route);
            
            _totalCRPNL += _routeCRPNL;
            routeCRPNL[nonce][_route] = _routeCRPNL;
        }

        totalCRPNL = _totalCRPNL;

        emit PrizePoolDistributed(totalCRPNL, prizePoolAmountInUSD, startDistributionTime);
    }

    // ============================================================================================
    // Route Functions
    // ============================================================================================

    function claim(address _receiver) external nonReentrant {
        uint256 _nonce = nonce;
        address _route = msg.sender;
        uint256 _routeCRPNL = routeCRPNL[_nonce][_route];
        if (_routeCRPNL == 0) revert ZeroCRPNL();

        uint256 _prizePoolShare = prizePoolAmountInUSD * _routeCRPNL / totalCRPNL;

        routeCRPNL[_nonce][_route] = 0;

        payable(_receiver).sendValue(_prizePoolShare);

        emit Claimed(_route, _receiver, _prizePoolShare);
    }

    // ============================================================================================
    // Internal Functions
    // ============================================================================================

    function _getRouteCRPNL(address _route) internal returns (uint256 _routeCRPNL) {
        // TODO
        // fetch realized PnL at the end of last distribution, and the start of this distribution, delta is the CRPNL
    }

    // ============================================================================================
    // Receive Function
    // ============================================================================================
 
    receive() external payable {}

    // ============================================================================================
    // Events
    // ============================================================================================

    event PrizePoolDistributed(uint256 totalCRPNL, uint256 prizePoolAmountInUSD, uint256 startDistributionTime);
    event Claimed(address route, address receiver, uint256 prizePoolShare);

    // ============================================================================================
    // Errors
    // ============================================================================================

    error NotEnoughTimePassed();
    error ZeroCRPNL();
}