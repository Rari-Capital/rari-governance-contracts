// SPDX-License-Identifier: MIT
pragma solidity 0.5.17;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Burnable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Pausable.sol";

/**
 * @title RariGovernanceToken
 * @author David Lucid <david@rari.capital> (https://github.com/davidlucid)
 * @notice RariGovernanceToken is the contract behind the Rari Governance Token (RGT), an ERC20 token accounting for the ownership of Rari Stable Pool, Yield Pool, and Ethereum Pool.
 */
contract RariGovernanceToken is Initializable, ERC20, ERC20Detailed, ERC20Burnable, ERC20Pausable {
    /**
     * @dev Initializer that reserves 8.75 million RGT for liquidity mining and 1.25 million RGT to the team/advisors/etc.
     */
    function initialize(address distributor, address vesting) public initializer {
        ERC20Detailed.initialize("Rari Governance Token", "RGT", 18);
        ERC20Pausable.initialize(msg.sender);
        _mint(distributor, 8750000 * (10 ** uint256(decimals())));
        _mint(vesting, 1250000 * (10 ** uint256(decimals())));
    }

    /**
     * @dev Sweep transfers the current RGT token balance of the token contract to the configured recipient.
     */
    function sweep() public onlyPauser {
        _transfer(address(this), msg.sender, balanceOf(address(this)));
    }
}
