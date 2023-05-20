// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {Route} from "./Route.sol";

import "./Base.sol";

contract Orchestrator is Base, IOrchestrator {

    using SafeERC20 for IERC20;
    using Address for address payable;

    struct RouteInfo {
        address route;
        address collateralToken;
        address indexToken;
        bool isLong;
        bool isRegistered;
        EnumerableSet.AddressSet puppets;
    }

    // pause info
    bool public paused; // used to pause all routes on update of gmx/global utils

    // routes info
    address[] private routes;
    mapping(bytes32 => RouteInfo) private routeInfo; // routeKey => RouteInfo
    mapping(address => bool) public isRoute; // Route => isRoute
    mapping(address => mapping(address => uint256)) public lastPositionOpenedTimestamp; // Route => puppet => timestamp

    // puppets info
    mapping(address => uint256) public throttleLimits; // puppet => throttle limit (in seconds)
    mapping(address => mapping(address => uint256)) public puppetDepositAccount; // puppet => asset => balance
    mapping(address => EnumerableMap.AddressToUintMap) private puppetAllowances; // puppet => Route => allowance percentage

    // ============================================================================================
    // Constructor
    // ============================================================================================

    constructor(
        address _owner,
        address _revenueDistributor,
        address _keeper,
        address _gmxRouter,
        address _gmxReader,
        address _gmxVault,
        address _gmxPositionRouter,
        address _gmxCallbackCaller,
        address _gmxReferralRebatesSender,
        bytes32 _referralCode
    ) {
        owner = _owner;
        revenueDistributor = _revenueDistributor;
        keeper = _keeper;

        GMXInfo storage _gmxInfo = gmxInfo;

        _gmxInfo.gmxRouter = _gmxRouter;
        _gmxInfo.gmxReader = _gmxReader;
        _gmxInfo.gmxVault = _gmxVault;
        _gmxInfo.gmxPositionRouter = _gmxPositionRouter;
        _gmxInfo.gmxCallbackCaller = _gmxCallbackCaller;
        _gmxInfo.gmxReferralRebatesSender = _gmxReferralRebatesSender;

        referralCode = _referralCode;
    }

    // ============================================================================================
    // Modifiers
    // ============================================================================================

    modifier onlyRoute() {
        if (msg.sender != owner && !isRoute[msg.sender]) revert NotRoute();
        _;
    }

    // ============================================================================================
    // View Functions
    // ============================================================================================

    // global

    function getGlobalInfo() external view returns (bytes32, uint256, address, address) {
        return (referralCode, performanceFeePercentage, keeper, revenueDistributor);
    }

    function getRoutes() external view returns (address[] memory) {
        return routes;
    }

    function getIsPaused() external view returns (bool) {
        return paused;
    }

    // route

    function getRouteKey(address _trader, address _collateralToken, address _indexToken, bool _isLong) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_trader, _collateralToken, _indexToken, _isLong));
    }

    function getPuppetsForRoute(bytes32 _routeKey) external view returns (address[] memory _puppets) {
        EnumerableSet.AddressSet storage _puppetsSet = routeInfo[_routeKey].puppets;
        _puppets = new address[](EnumerableSet.length(_puppetsSet));

        for (uint256 i = 0; i < EnumerableSet.length(_puppetsSet); i++) {
            _puppets[i] = EnumerableSet.at(_puppetsSet, i);
        }
    }

    // puppet

    function canOpenNewPosition(address _route, address _puppet) public view returns (bool) {
        return (block.timestamp - lastPositionOpenedTimestamp[_route][_puppet]) >= throttleLimits[_puppet];
    }

    function getPuppetAllowancePercentage(address _puppet, address _route) external view returns (uint256 _allowance) {
        return EnumerableMap.get(puppetAllowances[_puppet], _route);
    }

    function getPuppetAccountBalance(address _asset, address _puppet) external view returns (uint256) {
        return puppetDepositAccount[_asset][_puppet];
    }

    // gmx

    function getGMXInfo() external view returns (GMXInfo memory) {
        return gmxInfo;
    }

    // ============================================================================================
    // Trader Function
    // ============================================================================================

    // slither-disable-next-line reentrancy-no-eth
    function registerRoute(address _collateralToken, address _indexToken, bool _isLong) external nonReentrant returns (bytes32 _routeKey) {
        if (_collateralToken == address(0) || _indexToken == address(0)) revert InvalidTokenAddress();

        address _trader = msg.sender;
        _routeKey = getRouteKey(_trader, _collateralToken, _indexToken, _isLong);
        if (routeInfo[_routeKey].isRegistered) revert RouteAlreadyRegistered();

        address _route = address(new Route(address(this), owner, _trader, _collateralToken, _indexToken, _isLong));

        RouteInfo storage _routeInfo = routeInfo[_routeKey];
        
        _routeInfo.route = _route;
        _routeInfo.collateralToken = _collateralToken;
        _routeInfo.indexToken = _indexToken;
        _routeInfo.isLong = _isLong;
        _routeInfo.isRegistered = true;

        isRoute[_route] = true;
        routes.push(_route);

        emit RegisterRoute(_trader, _route, _collateralToken, _indexToken, _isLong);
    }

    // ============================================================================================
    // Puppet Functions
    // ============================================================================================

    function depositToAccount(uint256 _amount, address _asset, address _puppet) external payable nonReentrant {
        if (_amount == 0) revert ZeroAmountWETH();

        if (msg.value > 0) {
            if (_amount != msg.value) revert InvalidAmount();
            if (_asset != WETH) revert InvalidAsset();
            payable(_asset).functionCallWithValue(abi.encodeWithSignature("deposit()"), _amount);
        } else {
            if (msg.value != 0) revert InvalidAmount();
            IERC20(_asset).safeTransferFrom(msg.sender, address(this), _amount);
        }

        puppetDepositAccount[_asset][_puppet] += _amount;

        emit DepositToAccount(_amount, _asset, msg.sender, _puppet);
    }

    function withdrawFromAccount(uint256 _amount, address _asset, address _receiver, bool _isETH) external nonReentrant {
        if (_amount == 0) revert ZeroAmount();

        address _puppet = msg.sender;
        puppetDepositAccount[_asset][_puppet] -= _amount;

        if (_isETH) {
            if (_asset != WETH) revert InvalidAsset();
            IWETH(_asset).withdraw(_amount);
            payable(_receiver).sendValue(_amount);
        } else {
            IERC20(_asset).safeTransfer(_receiver, _amount);
        }

        emit WithdrawFromAccount(_amount, _asset, _receiver, _puppet);
    }

    function updateRoutesSubscription(address[] memory _traders, uint256[] memory _allowances, address _collateralToken, address _indexToken, bool _isLong, bool _sign) external nonReentrant {
        if (_traders.length != _allowances.length) revert MismatchedInputArrays();

        address _puppet = msg.sender;
        for (uint256 i = 0; i < _traders.length; i++) {
            bytes32 _routeKey = getRouteKey(_traders[i], _collateralToken, _indexToken, _isLong);
            RouteInfo storage _routeInfo = routeInfo[_routeKey];

            Route _route = Route(payable(_routeInfo.route));
            if (!_routeInfo.isRegistered) revert RouteNotRegistered();
            if (_route.isPositionOpen()) revert PositionIsOpen();

            if (_sign) {
                if (_allowances[i] > 100 || _allowances[i] == 0) revert InvalidAllowancePercentage();

                EnumerableMap.set(puppetAllowances[_puppet], _routeInfo.route, _allowances[i]);

                if (!EnumerableSet.contains(_routeInfo.puppets, _puppet)) {
                    EnumerableSet.add(_routeInfo.puppets, _puppet);
                }
            } else {
                EnumerableMap.set(puppetAllowances[_puppet], _routeInfo.route, 0);

                if (EnumerableSet.contains(_routeInfo.puppets, _puppet)) {
                    EnumerableSet.remove(_routeInfo.puppets, _puppet);
                }
            }
        }

        emit UpdateRoutesSubscription(_traders, _allowances, _puppet, _collateralToken, _indexToken, _isLong, _sign);
    }

    function setThrottleLimit(uint256 _throttleLimit) external {
        address puppet = msg.sender;
        throttleLimits[puppet] = _throttleLimit;

        emit SetThrottleLimit(puppet, _throttleLimit);
    }

    // ============================================================================================
    // Route Functions
    // ============================================================================================

    function debitPuppetAccount(uint256 _amount, address _asset, address _puppet) external onlyRoute {
        puppetDepositAccount[_asset][_puppet] -= _amount;

        emit DebitPuppetAccount(_amount, _puppet, msg.sender);
    }

    function creditPuppetAccount(uint256 _amount, address _asset, address _puppet) external onlyRoute {
        puppetDepositAccount[_asset][_puppet] += _amount;

        emit CreditPuppetAccount(_amount, _puppet, msg.sender);
    }

    function liquidatePuppet(address _puppet, bytes32 _routeKey) external onlyRoute {
        RouteInfo storage _routeInfo = routeInfo[_routeKey];
        
        EnumerableSet.remove(_routeInfo.puppets, _puppet);
        EnumerableMap.set(puppetAllowances[_puppet], _routeInfo.route, 0);

        emit LiquidatePuppet(_puppet, _routeKey, msg.sender);
    }

    function updateLastPositionOpenedTimestamp(address _route, address _puppet) external onlyRoute {
        lastPositionOpenedTimestamp[_route][_puppet] = block.timestamp;

        emit UpdateLastPositionOpenedTimestamp(_route, _puppet, block.timestamp);
    }

    function sendFunds(uint256 _amount, address _asset, address _receiver) external onlyRoute {
        IERC20(_asset).safeTransfer(_receiver, _amount);

        emit SendFunds(_amount, _asset, _receiver);
    }

    // ============================================================================================
    // Owner Functions
    // ============================================================================================

    function setGMXUtils(address _gmxRouter, address _gmxReader, address _gmxVault, address _gmxPositionRouter, address _gmxReferralRebatesSender) external onlyOwner {
        GMXInfo storage _gmxInfo = gmxInfo;

        _gmxInfo.gmxRouter = _gmxRouter;
        _gmxInfo.gmxReader = _gmxReader;
        _gmxInfo.gmxVault = _gmxVault;
        _gmxInfo.gmxPositionRouter = _gmxPositionRouter;
        _gmxInfo.gmxReferralRebatesSender = _gmxReferralRebatesSender;

        emit SetGMXUtils(_gmxRouter, _gmxReader, _gmxVault, _gmxPositionRouter, _gmxReferralRebatesSender);
    }

    function setPuppetUtils(address _revenueDistributor, address _keeper, bytes32 _referralCode) external onlyOwner {
        revenueDistributor = _revenueDistributor;
        keeper = _keeper;
        referralCode = _referralCode;

        emit SetPuppetUtils(_revenueDistributor, _keeper, _referralCode);
    }

    function setPerformanceFeePercentage(uint256 _performanceFeePercentage) external onlyOwner {
        if (_performanceFeePercentage > 500) revert InvalidPercentage(); // up to 5% allowed

        performanceFeePercentage = _performanceFeePercentage;

        emit SetPerformanceFeePercentage(_performanceFeePercentage);
    }

    function pause(bool _pause) external onlyOwner {
        paused = _pause;

        emit Paused(_pause);
    }

    // ============================================================================================
    // Receive Function
    // ============================================================================================

    receive() external payable {}
}