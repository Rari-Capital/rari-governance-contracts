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
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/SafeERC20.sol";

import "./RariGovernanceToken.sol";

/**
 * @title RariGovernanceToken
 * @author David Lucid <david@rari.capital> (https://github.com/davidlucid)
 * @notice RariGovernanceTokenLoopringDistributor distributes RGT (Rari Governance Token) to Loopring liquidity providers.
 */
contract RariGovernanceTokenLoopringDistributor is Initializable, Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /**
     * @dev Initializer that sets the distribution start block, distribution end block, and internal Loopring distributor address.
     */
    function initialize(uint256 startBlock, address _internalDistributor) public initializer {
        Ownable.initialize(msg.sender);
        distributionStartBlock = startBlock;
        distributionEndBlock = distributionStartBlock + DISTRIBUTION_PERIOD;
        internalDistributor = _internalDistributor;
    }

    /**
     * @notice Boolean indicating if this contract is disabled.
     */
    address internalDistributor;

    /**
     * @dev Sets the internal Loopring distributor address.
     */
    function setInternalDistributor(address _internalDistributor) external onlyOwner {
        internalDistributor = _internalDistributor;
    }

    /**
     * @notice Boolean indicating if this contract is disabled.
     */
    bool public disabled;

    /**
     * @dev Emitted when the primary functionality of this RariGovernanceTokenDistributor contract has been disabled.
     */
    event Disabled();

    /**
     * @dev Emitted when the primary functionality of this RariGovernanceTokenDistributor contract has been enabled.
     */
    event Enabled();

    /**
     * @dev Disables/enables primary functionality of this RariGovernanceTokenDistributor so contract(s) can be upgraded.
     */
    function setDisabled(bool _disabled) external onlyOwner {
        require(_disabled != disabled, "No change to enabled/disabled status.");
        disabled = _disabled;
        if (_disabled) emit Disabled(); else emit Enabled();
    }

    /**
     * @dev Throws if fund is disabled.
     */
    modifier enabled() {
        require(!disabled, "This governance token distributor contract is disabled. This may be due to an upgrade.");
        _;
    }

    /**
     * @dev The RariGovernanceToken contract.
     */
    RariGovernanceToken rariGovernanceToken;

    /**
     * @dev Sets the RariGovernanceToken distributed by ths RariGovernanceTokenDistributor.
     * @param governanceToken The new RariGovernanceToken contract.
     */
    function setGovernanceToken(RariGovernanceToken governanceToken) external onlyOwner {
        if (address(rariGovernanceToken) != address(0)) require(disabled, "This governance token distributor contract must be disabled before changing the governance token contract.");
        require(address(governanceToken) != address(0), "New governance token contract cannot be the zero address.");
        rariGovernanceToken = governanceToken;
    }

    /**
     * @notice Starting block number of the distribution.
     */
    uint256 public distributionStartBlock;

    /**
     * @notice Ending block number of the distribution.
     */
    uint256 public distributionEndBlock;

    /**
     * @notice Length in blocks of the distribution period.
     */
    uint256 public constant DISTRIBUTION_PERIOD = 6500 * 365 * 3;

    /**
     * @notice Total and final quantity of all RGT to be distributed by the end of the period.
     */
    uint256 public constant FINAL_RGT_DISTRIBUTION = 556798834975625333367546 - (uint256(556798834975625333367546) * 80 / 100);

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
     * @dev Total quantity of RGT withdrawn by the internal distributor.
     */
    uint256 private _totalRgtWithdrawn;

    /**
     * @dev Withdraws the quantity of RGT available at the current block number to the internal distributor.
     * @return The quantity of RGT withdrawn.
     */
    function distributeRgt() external enabled returns (uint256) {
        uint256 undistributedRgt = getRgtDistributed(block.number).sub(_totalRgtWithdrawn);
        require(undistributedRgt > 0, "No RGT available to withdraw.");
        _totalRgtWithdrawn = _totalRgtWithdrawn.add(undistributedRgt);
        require(rariGovernanceToken.transfer(internalDistributor, undistributedRgt), "Failed to transfer RGT from liquidity mining reserve.");
        emit Distribution(internalDistributor, undistributedRgt);
    }

    /**
     * @dev Event emitted when `withdrawn` RGT is withdrawn by `internalDistributor`.
     */
    event Distribution(address internalDistributor, uint256 withdrawn);

    /**
     * @dev Forwards all RGT to a new RariGovernanceTokenUniswapDistributor contract.
     * @param newContract The new RariGovernanceTokenUniswapDistributor contract.
     */
    function upgrade(address newContract) external onlyOwner {
        require(disabled, "This governance token distributor contract must be disabled before it can be upgraded.");
        rariGovernanceToken.transfer(newContract, rariGovernanceToken.balanceOf(address(this)));
    }
}
