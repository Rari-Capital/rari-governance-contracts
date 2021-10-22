// SPDX-License-Identifier: MIT
pragma solidity 0.5.17;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";

import "./RariGovernanceToken.sol";

/**
 * @title RariGovernanceTokenVestingV3
 * @author David Lucid <david@rari.capital> (https://github.com/davidlucid)
 * @notice RariGovernanceTokenVestingV3 distributes private RGT (Rari Governance Token) allocations to accounts with a vesting schedule.
 */
contract RariGovernanceTokenVestingV3 is Initializable, Ownable {
    using SafeMath for uint256;

    /**
     * @dev Initializer that configures private vesting start and end timestamps.
     */
    function initialize(uint256 _privateVestingStartTimestamp, uint256 _finalPrivateRgtAllocation) public initializer {
        Ownable.initialize(msg.sender);
        privateVestingStartTimestamp = _privateVestingStartTimestamp;
        privateVestingCliffTimestamp = _privateVestingStartTimestamp.add(PRIVATE_VESTING_CLIFF_DELAY);
        privateVestingEndTimestamp = _privateVestingStartTimestamp.add(PRIVATE_VESTING_PERIOD);
        finalPrivateRgtAllocation = _finalPrivateRgtAllocation;
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
        require(address(governanceToken) != address(0), "New governance token contract cannot be the zero address.");
        rariGovernanceToken = governanceToken;
    }

    /**
     * @notice Start timestamp of the distribution period.
     */
    uint256 public privateVestingStartTimestamp;

    /**
     * @notice Length in seconds of the period before the cliff.
     */
    uint256 public constant PRIVATE_VESTING_CLIFF_DELAY = 365 * 86400;

    /**
     * @notice Length in seconds of the distribution period (including the cliff delay).
     */
    uint256 public constant PRIVATE_VESTING_PERIOD = 4 * 365 * 86400;

    /**
     * @notice Timestamp of the cliff of the distribution period.
     */
    uint256 public privateVestingCliffTimestamp;

    /**
     * @notice End timestamp of the distribution period.
     */
    uint256 public privateVestingEndTimestamp;

    /**
     * @dev Sets the `amount` of RGT privately allocated to `holder`.
     * @param holder The new RariGovernanceToken contract.
     */
    function setPrivateRgtAllocation(address holder, uint256 amount) external onlyOwner {
        require(holder != address(0), "Holder cannot be the zero address.");
        require(amount >= _privateRgtClaimed[holder], "Allocation amount must be greater than or equal to the amount claimed by this holder.");
        _privateRgtAllocated = _privateRgtAllocated.sub(privateRgtAllocations[holder]).add(amount);
        require(_privateRgtAllocated <= finalPrivateRgtAllocation, "Total RGT privately allocated cannot exceed the final private RGT allocation.");
        privateRgtAllocations[holder] = amount;
    }

    /**
     * @notice Total and final quantity of all RGT to be privately allocated.
     */
    uint256 public finalPrivateRgtAllocation;

    /**
     * @notice Current quantity of RGT that has been privately allocated.
     */
    uint256 private _privateRgtAllocated;

    /**
     * @dev Maps addresses to private RGT distribution quantities.
     */
    mapping(address => uint256) public privateRgtAllocations;

    /**
     * @dev Maps addresses to claimed quantities of private RGT allocations.
     */
    mapping(address => uint256) private _privateRgtClaimed;

    /**
     * @dev Event emitted when `claimed` RGT is claimed by `holder`.
     */
    event PrivateClaim(address holder, uint256 claimed);

    /**
     * @notice Returns the amount of RGT currently distributed to a given `holder`.
     * @param timestamp The timestamp at which to check data.
     * @param holder The holder of the unclaimed RGT allocated privately.
     * @return The quantity of distributed RGT.
     */
    function getDistributedPrivateRgt(uint256 timestamp, address holder) public view returns (uint256) {
        if (timestamp <= privateVestingCliffTimestamp) return 0;
        if (timestamp >= privateVestingEndTimestamp) return privateRgtAllocations[holder];
        return privateRgtAllocations[holder].mul(timestamp.sub(privateVestingStartTimestamp)).div(PRIVATE_VESTING_PERIOD);
    }

    /**
     * @notice Returns the quantity of unclaimed RGT allocated privately to `holder`.
     * @param holder The holder of the unclaimed RGT allocated privately.
     * @return The quantity of unclaimed RGT.
     */
    function getUnclaimedPrivateRgt(address holder) public view returns (uint256) {
        return getDistributedPrivateRgt(block.timestamp, holder).sub(_privateRgtClaimed[holder]);
    }

    /**
     * @notice Internal function to claim `amount` unclaimed RGT allocated privately to `holder` (without validating `amount`).
     * @param holder The holder of the unclaimed RGT allocated privately.
     * @param amount The amount of RGT to claim.
     */
    function _claimPrivateRgt(address holder, uint256 amount) internal {
        _privateRgtClaimed[holder] = _privateRgtClaimed[holder].add(amount);
        require(rariGovernanceToken.transfer(holder, amount), "Failed to transfer RGT from vesting reserve.");
        emit PrivateClaim(holder, amount);
    }

    /**
     * @notice Claims `amount` unclaimed RGT allocated privately to `msg.sender`.
     * @param amount The amount of RGT to claim.
     */
    function claimPrivateRgt(uint256 amount) external {
        uint256 unclaimedRgt = getUnclaimedPrivateRgt(msg.sender);
        require(amount <= unclaimedRgt, "You cannot claim this much RGT (yet).");
        _claimPrivateRgt(msg.sender, amount);
    }

    /**
     * @notice Claims all unclaimed RGT allocated privately to `msg.sender`.
     */
    function claimAllPrivateRgt() external {
        uint256 unclaimedRgt = getUnclaimedPrivateRgt(msg.sender);
        require(unclaimedRgt > 0, "Unclaimed RGT allocated privately not greater than 0.");
        _claimPrivateRgt(msg.sender, unclaimedRgt);
    }

    /**
     * @dev Forwards RGT to a new RariGovernanceTokenVesting contract.
     * @param newContract The new RariGovernanceTokenVesting contract.
     * @param amount Amount of RGT to forward to the new contract.
     */
    function upgrade(address newContract, uint256 amount) external onlyOwner {
        rariGovernanceToken.transfer(newContract, amount);
    }
}
