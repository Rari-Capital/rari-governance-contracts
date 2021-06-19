// SPDX-License-Identifier: MIT
pragma solidity 0.5.17;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";

/**
 * @title IRariFundToken
 * @author David Lucid <david@rari.capital> (https://github.com/davidlucid)
 * @notice IRariFundToken is a simple interface for IRariFundToken used by Rari Governance.
 */
contract IRariFundToken is IERC20 {
    /*
     * @notice Destroys `amount` tokens from the caller, reducing the total supply.
     * @dev Claims RGT earned by `account` beforehand (so RariGovernanceTokenDistributor can continue distributing RGT considering the new RSPT balance of the caller).
     */
    function burn(uint256 amount) external;

    /**
     * @dev Sets or upgrades the RariGovernanceTokenDistributor of the RariFundToken. Caller must have the {MinterRole}.
     * @param newContract The address of the new RariGovernanceTokenDistributor contract.
     * @param force Boolean indicating if we should not revert on validation error.
     */
    function setGovernanceTokenDistributor(address payable newContract, bool force) external;
}
