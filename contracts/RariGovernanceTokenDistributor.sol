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

import "@chainlink/contracts/src/v0.5/interfaces/AggregatorV3Interface.sol";

import "./RariGovernanceToken.sol";
import "./interfaces/IRariFundManager.sol";

/**
 * @title RariGovernanceToken
 * @author David Lucid <david@rari.capital> (https://github.com/davidlucid)
 * @notice RariGovernanceTokenDistributor distributes RGT (Rari Governance Token) to Rari Stable Pool, Yield Pool, and Ethereum Pool holders.
 */
contract RariGovernanceTokenDistributor is Initializable, Ownable {
    using SafeMath for uint256;

    /**
     * @dev Initializer that reserves 8.75 million RGT for liquidity mining and 1.25 million RGT to the team.
     */
    function initialize(uint256 startBlock, IRariFundManager[3] memory fundManagers, IERC20[3] memory fundTokens) public initializer {
        Ownable.initialize(msg.sender);
        require(fundManagers.length == 3 && fundTokens.length == 3, "Fund manager and fund token array lengths must be equal to 3.");
        distributionStartBlock = startBlock;
        distributionEndBlock = distributionStartBlock + DISTRIBUTION_PERIOD;
        rariFundManagers = fundManagers;
        rariFundTokens = fundTokens;
        _ethUsdPriceFeed = AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419);
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
     * @notice Enum for the Rari pools to which distributions are rewarded.
     */
    enum RariPool {
        Stable,
        Yield,
        Ethereum
    }

    /**
     * @dev The RariFundManager contracts for each RariPool.
     */
    IRariFundManager[3] rariFundManagers;

    /**
     * @dev The RariFundToken contracts for each RariPool.
     */
    IERC20[3] rariFundTokens;

    /**
     * @dev Sets the RariFundManager for `pool`.
     * @param pool The pool associated with this RariFundManager.
     * @param fundManager The RariFundManager associated with this pool.
     */
    function setFundManager(RariPool pool, IRariFundManager fundManager) external onlyOwner {
        require(disabled, "This governance token distributor contract must be disabled before changing fund manager contracts.");
        require(address(fundManager) != address(0), "New fund manager contract cannot be the zero address.");
        rariFundManagers[uint8(pool)] = fundManager;
    }

    /**
     * @dev Sets the RariFundToken for `pool`.
     * @param pool The pool associated with this RariFundToken.
     * @param fundToken The RariFundToken associated with this pool.
     */
    function setFundToken(RariPool pool, IERC20 fundToken) external onlyOwner {
        require(disabled, "This governance token distributor contract must be disabled before changing fund token contracts.");
        require(address(fundToken) != address(0), "New fund token contract cannot be the zero address.");
        rariFundTokens[uint8(pool)] = fundToken;
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
    uint256 public constant DISTRIBUTION_PERIOD = 390000;

    /**
     * @notice Total and final quantity of all RGT to be distributed by the end of the period.
     */
    uint256 public constant FINAL_RGT_DISTRIBUTION = 8750000e18;

    /**
     * @notice Returns the amount of RGT earned via liquidity mining at the given `blockNumber`.
     * See the following graph for a visualization of RGT distributed via liquidity mining vs. blocks since distribution started: https://www.desmos.com/calculator/2yvnflg4ir
     * @param blockNumber The block number to check.
     */
    function getRgtDistributed(uint256 blockNumber) public view returns (uint256) {
        if (blockNumber <= distributionStartBlock) return 0;
        if (blockNumber >= distributionEndBlock) return FINAL_RGT_DISTRIBUTION;
        uint256 blocks = blockNumber.sub(distributionStartBlock);
        if (blocks < 97500) return uint256(1e18).mul(blocks ** 2).div(2730).add(uint256(1450e18).mul(blocks).div(273));
        if (blocks < 195000) return uint256(14600e18).mul(blocks).div(273).sub(uint256(2e18).mul(blocks ** 2).div(17745)).sub(uint256(1000000e18).div(7));
        if (blocks < 292500) return uint256(1e18).mul(blocks ** 2).div(35490).add(uint256(39250000e18).div(7)).sub(uint256(950e18).mul(blocks).div(273));
        return uint256(1e18).mul(blocks ** 2).div(35490).add(uint256(34750000e18).div(7)).sub(uint256(50e18).mul(blocks).div(39));
    }

    /**
     * @dev Caches fund balances (to calculate distribution speeds).
     */
    uint256[3] _fundBalancesCache;

    /**
     * @dev Maps RariPool indexes to the quantity of RGT distributed per RSPT/RYPT/REPT at the last speed update.
     */
    uint256[3] _rgtPerRftAtLastSpeedUpdate;

    /**
     * @dev The total amount of RGT distributed at the last speed update.
     */
    uint256 _rgtDistributedAtLastSpeedUpdate;

    /**
     * @dev Maps RariPool indexes to holder addresses to the quantity of RGT distributed per RSPT/RYPT/REPT at their last claim.
     */
    mapping (address => uint256)[3] _rgtPerRftAtLastDistribution;

    /**
     * @dev Throws if the distribution period has ended.
     */
    modifier beforeDistributionPeriodEnded() {
        require(block.number < distributionEndBlock, "The governance token distribution period has already ended.");
        _;
    }

    /**
     * @dev Updates RGT distribution speeds for each pool given one `pool` and its `newBalance` (only accessible by the RariFundManager corresponding to `pool`).
     * @param pool The pool whose balance should be refreshed.
     * @param newBalance The new balance of the pool to be refreshed.
     */
    function refreshDistributionSpeeds(RariPool pool, uint256 newBalance) external enabled {
        require(msg.sender == address(rariFundManagers[uint8(pool)]), "Caller is not the fund manager corresponding to this pool.");
        if (block.number >= distributionEndBlock) return;
        storeRgtDistributedPerRft();
        _fundBalancesCache[uint8(pool)] = newBalance;
    }

    /**
     * @notice Updates RGT distribution speeds for each pool given one `pool` whose balance should be refreshed.
     * @param pool The pool whose balance should be refreshed.
     */
    function refreshDistributionSpeeds(RariPool pool) external enabled beforeDistributionPeriodEnded {
        storeRgtDistributedPerRft();
        _fundBalancesCache[uint8(pool)] = rariFundManagers[uint8(pool)].getFundBalance();
    }

    /**
     * @notice Updates RGT distribution speeds for each pool.
     */
    function refreshDistributionSpeeds() external enabled beforeDistributionPeriodEnded {
        storeRgtDistributedPerRft();
        for (uint256 i = 0; i < 3; i++) _fundBalancesCache[i] = rariFundManagers[i].getFundBalance();
    }
    
    /**
     * @dev Chainlink price feed for ETH/USD.
     */
    AggregatorV3Interface private _ethUsdPriceFeed;

    /**
     * @dev Retrives the latest ETH/USD price.
     */
    function getEthUsdPrice() public view returns (uint256) {
        (, int256 price, , , ) = _ethUsdPriceFeed.latestRoundData();
        return price >= 0 ? uint256(price) : 0;
    }

    /**
     * @dev Stores the latest quantity of RGT distributed per RFT for all pools (so speeds can be updated immediately afterwards).
     */
    function storeRgtDistributedPerRft() internal {
        uint256 rgtDistributed = getRgtDistributed(block.number);
        uint256 rgtToDistribute = rgtDistributed.sub(_rgtDistributedAtLastSpeedUpdate);
        if (rgtToDistribute <= 0) return;
        uint256 ethFundBalanceUsd = _fundBalancesCache[2] > 0 ? _fundBalancesCache[2].mul(getEthUsdPrice()).div(1e8) : 0;
        uint256 fundBalanceSum = 0;
        for (uint256 i = 0; i < 3; i++) fundBalanceSum = fundBalanceSum.add(i == 2 ? ethFundBalanceUsd : _fundBalancesCache[i]);
        if (fundBalanceSum <= 0) return;
        _rgtDistributedAtLastSpeedUpdate = rgtDistributed;

        for (uint256 i = 0; i < 3; i++) {
            uint256 totalSupply = rariFundTokens[i].totalSupply();
            if (totalSupply > 0) _rgtPerRftAtLastSpeedUpdate[i] = _rgtPerRftAtLastSpeedUpdate[i].add(rgtToDistribute.mul(i == 2 ? ethFundBalanceUsd : _fundBalancesCache[i]).div(fundBalanceSum).mul(1e18).div(totalSupply));
        }
    }

    /**
     * @dev Gets RGT distributed per RFT for all pools.
     */
    function getRgtDistributedPerRft() internal view returns (uint256[3] memory rgtPerRftByPool) {
        uint256 rgtDistributed = getRgtDistributed(block.number);
        uint256 rgtToDistribute = rgtDistributed.sub(_rgtDistributedAtLastSpeedUpdate);
        if (rgtToDistribute <= 0) return _rgtPerRftAtLastSpeedUpdate;
        uint256 ethFundBalanceUsd = _fundBalancesCache[2] > 0 ? _fundBalancesCache[2].mul(getEthUsdPrice()).div(1e8) : 0;
        uint256 fundBalanceSum = 0;
        for (uint256 i = 0; i < 3; i++) fundBalanceSum = fundBalanceSum.add(i == 2 ? ethFundBalanceUsd : _fundBalancesCache[i]);
        if (fundBalanceSum <= 0) return _rgtPerRftAtLastSpeedUpdate;

        for (uint256 i = 0; i < 3; i++) {
            uint256 totalSupply = rariFundTokens[i].totalSupply();
            rgtPerRftByPool[i] = totalSupply > 0 ? _rgtPerRftAtLastSpeedUpdate[i].add(rgtToDistribute.mul(i == 2 ? ethFundBalanceUsd : _fundBalancesCache[i]).div(fundBalanceSum).mul(1e18).div(totalSupply)) : _rgtPerRftAtLastSpeedUpdate[i];
        }
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
     * @dev Distributes all undistributed RGT earned by `holder` in `pool` (without reverting if no RGT is available to distribute).
     * @param holder The holder of RSPT, RYPT, or REPT whose RGT is to be distributed.
     * @param pool The Rari pool for which to distribute RGT.
     * @return The quantity of RGT distributed.
     */
    function distributeRgt(address holder, RariPool pool) external enabled returns (uint256) {
        // Get RFT balance of this holder
        uint256 rftBalance = rariFundTokens[uint8(pool)].balanceOf(holder);
        if (rftBalance <= 0) return 0;

        // Store RGT distributed per RFT
        storeRgtDistributedPerRft();

        // Get undistributed RGT
        uint256 undistributedRgt = _rgtPerRftAtLastSpeedUpdate[uint8(pool)].sub(_rgtPerRftAtLastDistribution[uint8(pool)][holder]).mul(rftBalance).div(1e18);
        if (undistributedRgt <= 0) return 0;

        // Distribute RGT
        _rgtPerRftAtLastDistribution[uint8(pool)][holder] = _rgtPerRftAtLastSpeedUpdate[uint8(pool)];
        _rgtDistributedByHolder[holder] = _rgtDistributedByHolder[holder].add(undistributedRgt);
        return undistributedRgt;
    }

    /**
     * @dev Distributes all undistributed RGT earned by `holder` in all pools (without reverting if no RGT is available to distribute).
     * @param holder The holder of RSPT, RYPT, and/or REPT whose RGT is to be distributed.
     * @return The quantity of RGT distributed.
     */
    function distributeRgt(address holder) internal enabled returns (uint256) {
        // Store RGT distributed per RFT
        storeRgtDistributedPerRft();

        // Get undistributed RGT
        uint256 undistributedRgt = 0;

        for (uint256 i = 0; i < 3; i++) {
            // Get RFT balance of this holder in this pool
            uint256 rftBalance = rariFundTokens[i].balanceOf(holder);
            if (rftBalance <= 0) continue;

            // Add undistributed RGT
            undistributedRgt += _rgtPerRftAtLastSpeedUpdate[i].sub(_rgtPerRftAtLastDistribution[i][holder]).mul(rftBalance).div(1e18);
        }

        if (undistributedRgt <= 0) return 0;

        // Add undistributed to distributed
        for (uint256 i = 0; i < 3; i++) if (rariFundTokens[i].balanceOf(holder) > 0) _rgtPerRftAtLastDistribution[i][holder] = _rgtPerRftAtLastSpeedUpdate[i];
        _rgtDistributedByHolder[holder] = _rgtDistributedByHolder[holder].add(undistributedRgt);
        return undistributedRgt;
    }

    /**
     * @dev Stores the RGT distributed per RSPT/RYPT/REPT right before `holder`'s first incoming RSPT/RYPT/REPT transfer since having a zero balance.
     * @param holder The holder of RSPT, RYPT, and/or REPT.
     * @param pool The Rari pool of the pool token.
     */
    function beforeFirstPoolTokenTransferIn(address holder, RariPool pool) external enabled {
        require(rariFundTokens[uint8(pool)].balanceOf(holder) == 0, "Pool token balance is not equal to 0.");
        storeRgtDistributedPerRft();
        _rgtPerRftAtLastDistribution[uint8(pool)][holder] = _rgtPerRftAtLastSpeedUpdate[uint8(pool)];
    }

    /**
     * @dev Returns the quantity of undistributed RGT earned by `holder` via liquidity mining across all pools.
     * @param holder The holder of RSPT, RYPT, or REPT.
     * @return The quantity of unclaimed RGT.
     */
    function getUndistributedRgt(address holder) internal view returns (uint256) {
        // Get RGT distributed per RFT
        uint256[3] memory rgtPerRftByPool = getRgtDistributedPerRft();

        // Get undistributed RGT
        uint256 undistributedRgt = 0;

        for (uint256 i = 0; i < 3; i++) {
            // Get RFT balance of this holder in this pool
            uint256 rftBalance = rariFundTokens[i].balanceOf(holder);
            if (rftBalance <= 0) continue;

            // Add undistributed RGT
            undistributedRgt += rgtPerRftByPool[i].sub(_rgtPerRftAtLastDistribution[i][holder]).mul(rftBalance).div(1e18);
        }

        return undistributedRgt;
    }

    /**
     * @notice Returns the quantity of unclaimed RGT earned by `holder` via liquidity mining across all pools.
     * @param holder The holder of RSPT, RYPT, or REPT.
     * @return The quantity of unclaimed RGT.
     */
    function getUnclaimedRgt(address holder) external view returns (uint256) {
        return _rgtDistributedByHolder[holder].sub(_rgtClaimedByHolder[holder]).add(getUndistributedRgt(holder));
    }

    /**
     * @notice Returns the public RGT claim fee for users during liquidity mining (scaled by 1e18) at `blockNumber`.
     */
    function getPublicRgtClaimFee(uint256 blockNumber) public view returns (uint256) {
        if (blockNumber <= distributionStartBlock) return 0.33e18;
        if (blockNumber >= distributionEndBlock) return 0;
        return uint256(0.33e18).mul(distributionEndBlock.sub(blockNumber)).div(DISTRIBUTION_PERIOD);
    }

    /**
     * @dev Event emitted when `claimed` RGT is claimed by `holder`.
     */
    event Claim(address holder, uint256 claimed, uint256 transferred, uint256 burned);

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
        uint256 burnRgt = amount.mul(getPublicRgtClaimFee(block.number)).div(1e18);
        uint256 transferRgt = amount.sub(burnRgt);
        _rgtClaimedByHolder[msg.sender] = _rgtClaimedByHolder[msg.sender].add(amount);
        require(rariGovernanceToken.transfer(msg.sender, transferRgt), "Failed to transfer RGT from liquidity mining reserve.");
        rariGovernanceToken.burn(burnRgt);
        emit Claim(msg.sender, amount, transferRgt, burnRgt);
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
        uint256 burnRgt = unclaimedRgt.mul(getPublicRgtClaimFee(block.number)).div(1e18);
        uint256 transferRgt = unclaimedRgt.sub(burnRgt);
        _rgtClaimedByHolder[msg.sender] = _rgtClaimedByHolder[msg.sender].add(unclaimedRgt);
        require(rariGovernanceToken.transfer(msg.sender, transferRgt), "Failed to transfer RGT from liquidity mining reserve.");
        rariGovernanceToken.burn(burnRgt);
        emit Claim(msg.sender, unclaimedRgt, transferRgt, burnRgt);
        return unclaimedRgt;
    }

    /**
     * @dev Forwards all RGT to a new RariGovernanceTokenDistributor contract.
     * @param newContract The new RariGovernanceTokenDistributor contract.
     */
    function upgrade(address newContract) external onlyOwner {
        require(disabled, "This governance token distributor contract must be disabled before it can be upgraded.");
        rariGovernanceToken.transfer(newContract, rariGovernanceToken.balanceOf(address(this)));
    }

    /**
     * @dev Sets the ETH/USD price feed if not initialized due to upgrade.
     */
    function setEthUsdPriceFeed() external onlyOwner {
        _ethUsdPriceFeed = AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419);
    }
}
