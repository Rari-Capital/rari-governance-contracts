// SPDX-License-Identifier: MIT
pragma solidity 0.5.17;

import "./IRariFundToken.sol";

/**
 * @title IRariFundManager
 * @author David Lucid <david@rari.capital> (https://github.com/davidlucid)
 * @notice IRariFundManager is a simple interface for RariFundManager used by RariGovernanceTokenDistributor.
 */
interface IRariFundManager {
    /**
     * @dev Contract of the RariFundToken.
     */
    function rariFundToken() external returns (IRariFundToken);

    /**
     * @notice Returns the fund's total investor balance (all RFT holders' funds but not unclaimed fees) of all currencies in USD (scaled by 1e18).
     * @dev Ideally, we can add the `view` modifier, but Compound's `getUnderlyingBalance` function (called by `getRawFundBalance`) potentially modifies the state.
     */
    function getFundBalance() external returns (uint256);

    /**
     * @notice Deposits funds to the Rari Stable Pool in exchange for RFT.
     * You may only deposit currencies accepted by the fund (see `isCurrencyAccepted(string currencyCode)`).
     * Please note that you must approve RariFundManager to transfer at least `amount`.
     * @param currencyCode The currency code of the token to be deposited.
     * @param amount The amount of tokens to be deposited.
     */
    function deposit(string calldata currencyCode, uint256 amount) external;

    /**
     * @notice Withdraws funds from the Rari Stable Pool in exchange for RFT.
     * You may only withdraw currencies held by the fund (see `getRawFundBalance(string currencyCode)`).
     * Please note that you must approve RariFundManager to burn of the necessary amount of RFT.
     * @param currencyCode The currency code of the token to be withdrawn.
     * @param amount The amount of tokens to be withdrawn.
     */
    function withdraw(string calldata currencyCode, uint256 amount) external;
}
