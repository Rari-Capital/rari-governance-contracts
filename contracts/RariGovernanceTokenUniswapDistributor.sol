// SPDX-License-Identifier: MIT
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
 * @notice RariGovernanceTokenUniswapDistributor distributes RGT (Rari Governance Token) to Uniswap LP token holders.
 */
contract RariGovernanceTokenUniswapDistributor is Initializable, Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /**
     * @dev Initializer that sets the distribution start block, distribution end block, and RGT/ETH Uniswap V2 pair.
     */
    function initialize(uint256 startBlock, IERC20 _rgtEthUniswapV2Pair) public initializer {
        Ownable.initialize(msg.sender);
        distributionStartBlock = startBlock;
        distributionEndBlock = distributionStartBlock + DISTRIBUTION_PERIOD;
        rgtEthUniswapV2Pair = _rgtEthUniswapV2Pair;
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
    uint256 public constant FINAL_RGT_DISTRIBUTION = uint256(568717819057309757517546) * 80 / 100;

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
     * @dev Total supply of Uniswap LP tokens staked.
     */
    uint256 public totalStaked;

    /**
     * @dev Balances per address of staked Uniswap LP tokens.
     */
    mapping(address => uint256) public stakingBalances;

    /**
     * @dev Deposits `amount` Uniswap LP tokens from the sender to this staking contract.
     * @param amount The amount of Uniswap LP tokens to deposit.
     */
    function deposit(uint256 amount) external enabled beforeDistributionPeriodEnded {
        // Transfer RGT in from sender
        rgtEthUniswapV2Pair.safeTransferFrom(msg.sender, address(this), amount);

        if (block.number > distributionStartBlock) if (stakingBalances[msg.sender] > 0) {
            // Distribute RGT to sender and update _rgtPerLpTokenAtLastDistribution
            distributeRgt(msg.sender);
        } else {
            // Update _rgtPerLpTokenAtLastDistribution since this is their first deposit 
            storeRgtDistributedToUniswap();
            _rgtPerLpTokenAtLastDistribution[msg.sender] = _rgtPerLpTokenAtLastSpeedUpdate;
        }

        // Add to staking balance
        stakingBalances[msg.sender] = stakingBalances[msg.sender].add(amount);
        totalStaked = totalStaked.add(amount);
    }

    /**
     * @dev Deposits `amount` Uniswap LP tokens from the sender to this staking contract.
     * @param amount The amount of Uniswap LP tokens to deposit.
     */
    function withdraw(uint256 amount) external enabled {
        // Distribute RGT to sender
        if (block.number > distributionStartBlock) distributeRgt(msg.sender);

        // Subtract from staking balance
        stakingBalances[msg.sender] = stakingBalances[msg.sender].sub(amount);
        totalStaked = totalStaked.sub(amount);

        // Transfer RGT out to sender
        rgtEthUniswapV2Pair.safeTransfer(msg.sender, amount);
    }

    /**
     * @dev Quantity of RGT distributed per staked Uniswap LP token at the last speed update.
     */
    uint256 _rgtPerLpTokenAtLastSpeedUpdate;

    /**
     * @dev The total amount of RGT distributed at the last speed update.
     */
    uint256 _rgtDistributedAtLastSpeedUpdate;

    /**
     * @dev Maps holder addresses to the quantity of RGT distributed per staked Uniswap LP token at their last claim.
     */
    mapping (address => uint256) _rgtPerLpTokenAtLastDistribution;

    /**
     * @dev Throws if the distribution period has ended.
     */
    modifier beforeDistributionPeriodEnded() {
        require(block.number < distributionEndBlock, "The governance token distribution period has already ended.");
        _;
    }

    /**
     * @dev Stores the latest quantity of RGT distributed per staked Uniswap LP token.
     */
    function storeRgtDistributedToUniswap() internal {
        // Calculate RGT to distribute since last update and validate
        uint256 rgtDistributed = getRgtDistributed(block.number);
        uint256 rgtToDistribute = rgtDistributed.sub(_rgtDistributedAtLastSpeedUpdate);
        if (rgtToDistribute <= 0) return;

        // Update total distributed
        _rgtDistributedAtLastSpeedUpdate = rgtDistributed;

        // Distribute to Uniswap V2 RGT/ETH pair liquidity providers
        if (totalStaked > 0) _rgtPerLpTokenAtLastSpeedUpdate = _rgtPerLpTokenAtLastSpeedUpdate.add(rgtToDistribute.mul(1e18).div(totalStaked));
    }

    /**
     * @dev Gets RGT distributed per staked Uniswap LP token.
     */
    function getRgtDistributedPerLpToken() internal view returns (uint256) {
        // Calculate RGT to distribute since last update and validate
        uint256 rgtDistributed = getRgtDistributed(block.number);
        uint256 rgtToDistribute = rgtDistributed.sub(_rgtDistributedAtLastSpeedUpdate);
        if (rgtToDistribute <= 0) return _rgtPerLpTokenAtLastSpeedUpdate;

        // Return amount distributed to Uniswap V2 RGT/ETH pair liquidity providers
        if (totalStaked <= 0) return _rgtPerLpTokenAtLastSpeedUpdate;
        return _rgtPerLpTokenAtLastSpeedUpdate.add(rgtToDistribute.mul(1e18).div(totalStaked));
    }

    /**
     * @dev Maps holder addresses to the quantity of RGT distributed to each.
     */
    mapping (address => uint256) _rgtDistributedByHolder;

    /**
     * @dev Maps holder addresses to the quantity of RGT claimed by each.
     */
    mapping (address => uint256) _rgtClaimedByHolder;

    /**
     * @dev Distributes all undistributed RGT earned by `holder` (without reverting if no RGT is available to distribute).
     * @param holder The holder of staked Uniswap LP tokens whose RGT is to be distributed.
     * @return The quantity of RGT distributed.
     */
    function distributeRgt(address holder) public enabled returns (uint256) {
        // Get LP token balance of this holder
        uint256 stakingBalance = stakingBalances[holder];
        if (stakingBalance <= 0) return 0;

        // Store RGT distributed per LP token
        storeRgtDistributedToUniswap();

        // Get undistributed RGT
        uint256 undistributedRgt = _rgtPerLpTokenAtLastSpeedUpdate.sub(_rgtPerLpTokenAtLastDistribution[holder]).mul(stakingBalance).div(1e18);
        if (undistributedRgt <= 0) return 0;

        // Distribute RGT
        _rgtPerLpTokenAtLastDistribution[holder] = _rgtPerLpTokenAtLastSpeedUpdate;
        _rgtDistributedByHolder[holder] = _rgtDistributedByHolder[holder].add(undistributedRgt);
        return undistributedRgt;
    }

    /**
     * @dev Returns the quantity of undistributed RGT earned by `holder` via liquidity mining.
     * @param holder The holder of staked Uniswap LP tokens.
     * @return The quantity of unclaimed RGT.
     */
    function getUndistributedRgt(address holder) internal view returns (uint256) {
        // Get RGT distributed per staked LP token
        uint256 rgtPerLpToken = getRgtDistributedPerLpToken();

        // Get staked LP token balance of this holder in this pool
        uint256 stakingBalance = stakingBalances[holder];
        if (stakingBalance <= 0) return 0;

        // Get undistributed RGT
        return rgtPerLpToken.sub(_rgtPerLpTokenAtLastDistribution[holder]).mul(stakingBalance).div(1e18);
    }

    /**
     * @notice Returns the quantity of unclaimed RGT earned by `holder` via liquidity mining.
     * @param holder The holder of staked Uniswap LP tokens.
     * @return The quantity of unclaimed RGT.
     */
    function getUnclaimedRgt(address holder) external view returns (uint256) {
        return _rgtDistributedByHolder[holder].sub(_rgtClaimedByHolder[holder]).add(getUndistributedRgt(holder));
    }

    /**
     * @dev Event emitted when `claimed` RGT is claimed by `holder`.
     */
    event Claim(address holder, uint256 claimed);

    /**
     * @notice Claims `amount` unclaimed RGT earned by `msg.sender` in all pools.
     * @param amount The amount of RGT to claim.
     */
    function claimRgt(uint256 amount) public enabled {
        // Distribute RGT to holder
        distributeRgt(msg.sender);

        // Get unclaimed RGT
        uint256 unclaimedRgt = _rgtDistributedByHolder[msg.sender].sub(_rgtClaimedByHolder[msg.sender]);
        require(amount <= unclaimedRgt, "Claim amount cannot be greater than unclaimed RGT.");

        // Claim RGT
        _rgtClaimedByHolder[msg.sender] = _rgtClaimedByHolder[msg.sender].add(amount);
        require(rariGovernanceToken.transfer(msg.sender, amount), "Failed to transfer RGT from liquidity mining reserve.");
        emit Claim(msg.sender, amount);
    }

    /**
     * @notice Claims all unclaimed RGT earned by `msg.sender` in all pools.
     * @return The quantity of RGT claimed.
     */
    function claimAllRgt() public enabled returns (uint256) {
        // Distribute RGT to holder
        distributeRgt(msg.sender);

        // Get unclaimed RGT
        uint256 unclaimedRgt = _rgtDistributedByHolder[msg.sender].sub(_rgtClaimedByHolder[msg.sender]);
        require(unclaimedRgt > 0, "Unclaimed RGT not greater than 0.");

        // Claim RGT
        _rgtClaimedByHolder[msg.sender] = _rgtClaimedByHolder[msg.sender].add(unclaimedRgt);
        require(rariGovernanceToken.transfer(msg.sender, unclaimedRgt), "Failed to transfer RGT from liquidity mining reserve.");
        emit Claim(msg.sender, unclaimedRgt);
        return unclaimedRgt;
    }

    /**
     * @dev Forwards all RGT to a new RariGovernanceTokenUniswapDistributor contract.
     * @param newContract The new RariGovernanceTokenUniswapDistributor contract.
     */
    function upgrade(address newContract) external onlyOwner {
        require(disabled, "This governance token distributor contract must be disabled before it can be upgraded.");
        rariGovernanceToken.transfer(newContract, rariGovernanceToken.balanceOf(address(this)));
    }

    /**
     * @dev The IUniswapV2Pair contract for the RGT/ETH Uniswap V2 pair.
     */
    IERC20 public rgtEthUniswapV2Pair;

    /**
     * @dev Sets the IUniswapV2Pair contract for the RGT/ETH Uniswap V2 pair.
     */
    function setRgtEthUniswapV2Pair(IERC20 _rgtEthUniswapV2Pair) external onlyOwner {
        require(address(_rgtEthUniswapV2Pair) != address(0), "LP token contract cannot be the zero address.");
        require(totalStaked == 0, "Users have staked LP tokens already, so the LP token contract cannot be changed.");
        rgtEthUniswapV2Pair = _rgtEthUniswapV2Pair;
    }
}
