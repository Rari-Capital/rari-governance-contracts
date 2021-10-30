// SPDX-License-Identifier: MIT
pragma solidity 0.5.17;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";

import "./RariGovernanceToken.sol";
import "./RariGovernanceTokenVestingSatellite.sol";

/**
 * @title RariGovernanceTokenVesting
 * @author David Lucid <david@rari.capital> (https://github.com/davidlucid)
 * @notice RariGovernanceTokenVesting distributes private RGT (Rari Governance Token) allocations to team/advisors/etc. with a vesting schedule.
 */
contract RariGovernanceTokenVesting is Initializable, Ownable {
    using SafeMath for uint256;

    /**
     * @dev Initializer that configures private vesting start and end timestamps.
     */
    function initialize(uint256 _privateVestingStartTimestamp) public initializer {
        Ownable.initialize(msg.sender);
        privateVestingStartTimestamp = _privateVestingStartTimestamp;
        privateVestingEndTimestamp = _privateVestingStartTimestamp.add(PRIVATE_VESTING_PERIOD);
    }

    /**
     * @dev The RariGovernanceToken contract.
     */
    RariGovernanceToken public rariGovernanceToken;

    /**
     * @dev Sets the RariGovernanceToken distributed by ths RariGovernanceTokenDistributor.
     * @param governanceToken The new RariGovernanceToken contract.
     */
    function setGovernanceToken(RariGovernanceToken governanceToken) external onlyOwner {
        require(address(governanceToken) != address(0), "New governance token contract cannot be the zero address.");
        rariGovernanceToken = governanceToken;
    }

    /**
     * @notice Length in seconds of the distribution period.
     */
    uint256 public privateVestingStartTimestamp;

    /**
     * @notice Length in seconds of the distribution period.
     */
    uint256 public constant PRIVATE_VESTING_PERIOD = 2 * 365 * 86400;

    /**
     * @notice Length in seconds of the distribution period.
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
        require(_privateRgtAllocated <= FINAL_PRIVATE_RGT_ALLOCATION, "Total RGT privately allocated cannot exceed the final private RGT allocation.");
        privateRgtAllocations[holder] = amount;

        // Transfer RGT to/from satellite if user has satellite
        address satellite = address(satellites[msg.sender]);

        if (satellite != address(0)) {
            uint256 satelliteBalance = rariGovernanceToken.balanceOf(satellite);

            if (amount > satelliteBalance) {
                require(rariGovernanceToken.transfer(satellite, amount.sub(satelliteBalance)), "Failed to transfer RGT to satellite.");
            } else if (amount < satelliteBalance) {
                require(rariGovernanceToken.transferFrom(satellite, address(this), satelliteBalance.sub(amount)), "Failed to transfer RGT from satellite.");
            }
        }
    }

    /**
     * @notice Returns the RGT transfer fee for team/advisors/etc. (scaled by 1e18).
     */
    function getPrivateRgtClaimFee(uint256 timestamp) public view returns (uint256) {
        if (timestamp <= privateVestingStartTimestamp) return 1e18;
        if (timestamp >= privateVestingEndTimestamp) return 0;
        return uint256(1e18).mul(privateVestingEndTimestamp.sub(timestamp)).div(PRIVATE_VESTING_PERIOD);
    }

    /**
     * @notice Total and final quantity of all RGT to be privately allocated.
     */
    uint256 public constant FINAL_PRIVATE_RGT_ALLOCATION = 1250000e18;

    /**
     * @notice Current quantity of RGT that has been privately allocated.
     */
    uint256 private _privateRgtAllocated;

    /**
     * @dev Maps team/advisor/etc. addresses to private RGT distribution quantities.
     */
    mapping(address => uint256) public privateRgtAllocations;

    /**
     * @dev Maps team/advisor/etc. addresses to claimed quantities of private RGT allocations.
     */
    mapping(address => uint256) private _privateRgtClaimed;

    /**
     * @dev Event emitted when `claimed` RGT is claimed by `holder`.
     */
    event PrivateClaim(address holder, uint256 claimed, uint256 transferred, uint256 burned);

    /**
     * @notice Returns the quantity of unclaimed RGT allocated privately to `holder`.
     * @param holder The holder of the unclaimed RGT allocated privately.
     * @return The quantity of unclaimed RGT.
     */
    function getUnclaimedPrivateRgt(address holder) public view returns (uint256) {
        return privateRgtAllocations[holder].sub(_privateRgtClaimed[holder]);
    }

    /**
     * @notice Internal function to claim `amount` unclaimed RGT allocated privately to `holder` (without validating `amount`).
     * @param holder The holder of the unclaimed RGT allocated privately.
     * @param amount The amount of RGT to claim.
     */
    function _claimPrivateRgt(address holder, uint256 amount) internal {
        uint256 burnRgt = amount.mul(getPrivateRgtClaimFee(block.timestamp)).div(1e18);
        uint256 transferRgt = amount.sub(burnRgt);
        _privateRgtClaimed[holder] = _privateRgtClaimed[holder].add(amount);
        address satellite = address(satellites[msg.sender]);
        if (satellite != address(0)) require(rariGovernanceToken.transferFrom(satellite, holder, transferRgt), "Failed to transfer RGT from vesting reserve satellite.");
        else require(rariGovernanceToken.transfer(holder, transferRgt), "Failed to transfer RGT from vesting reserve.");
        rariGovernanceToken.burn(burnRgt);
        emit PrivateClaim(holder, amount, transferRgt, burnRgt);
    }

    /**
     * @notice Claims `amount` unclaimed RGT allocated privately to `msg.sender`.
     * @param amount The amount of RGT to claim.
     */
    function claimPrivateRgt(uint256 amount) external {
        uint256 unclaimedRgt = getUnclaimedPrivateRgt(msg.sender);
        require(amount <= unclaimedRgt, "This amount is greater than the unclaimed RGT allocated privately.");
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

    /**
     * @notice Admin call to delegate the sender's RGT votes.
     * @param delegatee The address to delegate votes to.
     */
    function delegate(address delegatee) external {
        uint256 allocation = privateRgtAllocations[msg.sender];
        require(allocation > 0, "No private RGT allocation to delegate.");
        RariGovernanceTokenVestingSatellite satellite = satellites[msg.sender];

        // Deploy satellite if it doesn't already exist
        if (address(satellite) == address(0)) {
            bytes memory creationCode = type(RariGovernanceTokenVestingSatellite).creationCode;
            bytes32 salt = bytes32(bytes20(msg.sender));

            assembly {
                satellite := create2(0, add(creationCode, 32), mload(creationCode), salt)
                if iszero(extcodesize(satellite)) {
                    revert(0, "Failed to deploy satellite.")
                }
            }

            satellites[msg.sender] = satellite;
            require(rariGovernanceToken.transfer(address(satellite), allocation), "Failed to transfer RGT to satellite.");
        }

        // Delegate!
        satellite.delegate(delegatee);
    }

    /**
     * @dev Satellite addresses for each holder holding vested RGT for voting delegation.
     */
    mapping(address => RariGovernanceTokenVestingSatellite) public satellites;
}
