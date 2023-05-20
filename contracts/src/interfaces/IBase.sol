// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IBase {

    struct GMXInfo {
        address gmxRouter;
        address gmxReader;
        address gmxVault;
        address gmxPositionRouter;
        address gmxCallbackCaller;
        address gmxReferralRebatesSender;
    }

    // ============================================================================================
    // Events
    // ============================================================================================

    event SetOwner(address _owner);
    event StuckTokensRescued(address token, address to);

    // ============================================================================================
    // Errors
    // ============================================================================================

    error NotOwner();
}