/**
 * COPYRIGHT © 2020 RARI CAPITAL, INC. ALL RIGHTS RESERVED.
 * Anyone is free to integrate the public (i.e., non-administrative) application programming interfaces (APIs) of the official Ethereum smart contract instances deployed by Rari Capital, Inc. in any application (commercial or noncommercial and under any license), provided that the application does not abuse the APIs or act against the interests of Rari Capital, Inc.
 * Anyone is free to study, review, and analyze the source code contained in this package.
 * Reuse (including deployment of smart contracts other than private testing on a private network), modification, redistribution, or sublicensing of any source code contained in this package is not permitted without the explicit permission of David Lucid of Rari Capital, Inc.
 * No one is permitted to use the software for any purpose other than those allowed by this license.
 * This license is liable to change at any time at the sole discretion of David Lucid of Rari Capital, Inc.
 */

pragma solidity 0.5.17;

import "./RariGovernanceTokenDistributor.sol";

/**
 * @title RariGovernanceTokenDistributorV2
 * @author David Lucid <david@rari.capital> (https://github.com/davidlucid)
 * @notice RariGovernanceTokenDistributorV2 distributes RGT (Rari Governance Token) to Rari Stable Pool, Yield Pool, and Ethereum Pool holders.
 */
contract RariGovernanceTokenDistributorV2 is RariGovernanceTokenDistributor {
    /**
     * @notice Length in blocks of the distribution period.
     */
    uint256 public constant DISTRIBUTION_PERIOD = 6500 * 365;

    /**
     * @notice Total and final quantity of all RGT to be distributed by the end of the period.
     */
    uint256 public constant FINAL_RGT_DISTRIBUTION = 750000e18;

    /**
     * @notice Returns the amount of RGT earned via liquidity mining at the given `blockNumber`.
     * @param blockNumber The block number to check.
     */
    function getRgtDistributed(uint256 blockNumber) public view returns (uint256) {
        if (blockNumber <= distributionStartBlock) return 0;
        if (blockNumber >= distributionEndBlock) return FINAL_RGT_DISTRIBUTION;
        uint256 blocks = blockNumber.sub(distributionStartBlock);
        return FINAL_RGT_DISTRIBUTION.mul(blocks).div(DISTRIBUTION_PERIOD);
    }

    /**
     * @notice Returns the public RGT claim fee for users during liquidity mining (scaled by 1e18) at `blockNumber`.
     */
    function getPublicRgtClaimFee(uint256 blockNumber) public view returns (uint256) {
        return 0;
    }
}
