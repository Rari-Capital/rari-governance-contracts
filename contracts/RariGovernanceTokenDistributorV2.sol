// SPDX-License-Identifier: MIT
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
