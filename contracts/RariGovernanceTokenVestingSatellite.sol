// SPDX-License-Identifier: MIT
pragma solidity 0.5.17;

import "./RariGovernanceToken.sol";
import "./RariGovernanceTokenVesting.sol";

/**
 * @title RariGovernanceTokenVestingSatellite
 * @author David Lucid <david@rari.capital> (https://github.com/davidlucid)
 * @notice RariGovernanceTokenVestingSatellite holds and delegates private RGT (Rari Governance Token) allocations for `RariGovernanceTokenVesting`.
 */
contract RariGovernanceTokenVestingSatellite {
    /**
     * @dev The root RariGovernanceTokenVesting contract.
     */
    address public vesting;

    /**
     * @dev The RariGovernanceToken contract.
     */
    RariGovernanceToken public rgt;

    /**
     * @dev Constructor that sets the `RariGovernanceToken` and `RariGovernanceTokenVesting`.
     */
    constructor() public {
        vesting = msg.sender;
        rgt = RariGovernanceTokenVesting(msg.sender).rariGovernanceToken();
        rgt.approve(msg.sender, uint256(-1));
    }

    /**
     * @notice Admin call to delegate this contract's RGT votes.
     * @param delegatee The address to delegate votes to.
     */
    function delegate(address delegatee) external {
        require(msg.sender == vesting, "Sender is not vesting contract.");
        rgt.delegate(delegatee);
    }
}
