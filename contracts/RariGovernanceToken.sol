/**
 * COPYRIGHT © 2020 RARI CAPITAL, INC. ALL RIGHTS RESERVED.
 * Anyone is free to integrate the public (i.e., non-administrative) application programming interfaces (APIs) of the official Ethereum smart contract instances deployed by Rari Capital, Inc. in any application (commercial or noncommercial and under any license), provided that the application does not abuse the APIs or act against the interests of Rari Capital, Inc.
 * Anyone is free to study, review, and analyze the source code contained in this package.
 * Reuse (including deployment of smart contracts other than private testing on a private network), modification, redistribution, or sublicensing of any source code contained in this package is not permitted without the explicit permission of David Lucid of Rari Capital, Inc.
 * No one is permitted to use the software for any purpose other than those allowed by this license.
 * This license is liable to change at any time at the sole discretion of David Lucid of Rari Capital, Inc.
 */

pragma solidity 0.5.17;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Burnable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Pausable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/SafeERC20.sol";

/**
 * @title RariGovernanceToken
 * @author David Lucid <david@rari.capital> (https://github.com/davidlucid)
 * @notice RariGovernanceToken is the contract behind the Rari Governance Token (RGT), an ERC20 token accounting for the ownership of Rari Stable Pool, Yield Pool, and Ethereum Pool.
 */
contract RariGovernanceToken is Initializable, ERC20, ERC20Detailed, ERC20Burnable, ERC20Pausable {
    using SafeERC20 for IERC20;

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
     * @dev Boolean indicating if this RariFundToken contract has been deployed at least `v1.4.0` or upgraded to at least `v1.4.0`.
     */
    bool private upgraded1;

    /**
     * @dev Boolean indicating if this RariFundToken contract has been deployed at least `v1.4.0` or upgraded to at least `v1.4.0`.
     */
    bool private upgraded2;

    /**
     * @dev Upgrades RariGovernanceToken from `v1.3.0` to `v1.4.0`.
     */
    function upgrade1(address uniswapDistributor, address loopringDistributor) external onlyPauser {
        require(!upgraded1, "Already upgraded.");
        uint256 exchangeLiquidityRewards = 568717819057309757517546;
        uint256 uniswapRewards = exchangeLiquidityRewards.mul(80).div(100);
        _mint(uniswapDistributor, uniswapRewards);
        _mint(loopringDistributor, exchangeLiquidityRewards.sub(uniswapRewards));
        upgraded1 = true;
    }

    /**
     * @dev Upgrades RariGovernanceToken from `v1.3.0` to `v1.4.0`.
     */
    function upgrade2(address distributorV2, address vestingV2) external onlyPauser {
        require(!upgraded2, "Already upgraded.");
        _mint(distributorV2, 3000000 * (10 ** uint256(decimals())));
        _mint(vestingV2, 7000000 * (10 ** uint256(decimals())));
        upgraded2 = true;
    }

    /**
     * @dev Forwards tokens accidentally sent to this contract to the specified address.
     * At no point in time should this contract hold any tokens.
     * @param erc20Contract The ERC20 contract address of the token to forward.
     * @param to The destination address to which the funds will be forwarded.
     * @param amount Amount of tokens to forward.
     */
    function sweepLostFunds(address erc20Contract, address to, uint256 amount) external onlyPauser {
        IERC20(erc20Contract).safeTransfer(to, amount);
    }
}
