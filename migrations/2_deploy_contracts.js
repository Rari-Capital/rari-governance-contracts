// SPDX-License-Identifier: MIT
const { deployProxy, upgradeProxy, admin, prepareUpgrade } = require('@openzeppelin/truffle-upgrades');
require('dotenv').config();

var RariGovernanceToken = artifacts.require("RariGovernanceToken");
var RariGovernanceTokenDistributor = artifacts.require("RariGovernanceTokenDistributor");
var RariGovernanceTokenUniswapDistributor = artifacts.require("RariGovernanceTokenUniswapDistributor");
var RariGovernanceTokenVesting = artifacts.require("RariGovernanceTokenVesting");
var RariGovernanceTokenDistributorV2 = artifacts.require("RariGovernanceTokenDistributorV2");
var RariGovernanceTokenVestingV2 = artifacts.require("RariGovernanceTokenVestingV2");
var RariGovernanceTokenVestingV3 = artifacts.require("RariGovernanceTokenVestingV3");
var IRariFundManager = artifacts.require("IRariFundManager");
var IRariFundToken = artifacts.require("IRariFundToken");

module.exports = async function(deployer, network, accounts) {
  if (!process.env.UNISWAP_DISTRIBUTION_START_BLOCK) return console.error("UNISWAP_DISTRIBUTION_START_BLOCK missing for deployment");
  if (!process.env.DISTRIBUTION_V2_START_BLOCK) return console.error("DISTRIBUTION_V2_START_BLOCK missing for deployment");
  if (!process.env.PRIVATE_VESTING_V2_START_TIMESTAMP) return console.error("PRIVATE_VESTING_V2_START_TIMESTAMP missing for deployment");
  if (!process.env.LOOPRING_INTERNAL_DISTRIBUTOR) return console.error("LOOPRING_INTERNAL_DISTRIBUTOR missing for deployment");

  if (["live", "live-fork"].indexOf(network) >= 0) {
    if (!process.env.LIVE_GAS_PRICE) return console.error("LIVE_GAS_PRICE is missing for live deployment");
    if (!process.env.LIVE_GOVERNANCE_OWNER) return console.error("LIVE_GOVERNANCE_OWNER is missing for live deployment");
  }

  if (parseInt(process.env.UPGRADE_FROM_LAST_VERSION) > 0) {
    // Upgrade RariGovernanceTokenUniswapDistributor
    await prepareUpgrade(process.env.UPGRADE_GOVERNANCE_TOKEN_SUSHISWAP_DISTRIBUTOR_ADDRESS, RariGovernanceTokenUniswapDistributor, { deployer });
    // Need on-chain gov to call:
    // ProxyAdmin.upgrade(RariGovernanceTokenUniswapDistributor, implementation)
    // RariGovernanceTokenUniswapDistributor.setDisabled(true)
    // RariGovernanceTokenUniswapDistributor.upgrade(Timelock, 568717819057309757517546 - (568717819057309757517546 * 80 / 100 / 3))
    // RariGovernanceTokenUniswapDistributor.setDisabled(false)
  } else {
    if (!process.env.POOL_OWNER) return console.error("POOL_OWNER is missing for deployment");
    if (!process.env.POOL_STABLE_MANAGER_ADDRESS || process.env.POOL_STABLE_MANAGER_ADDRESS == "0x0000000000000000000000000000000000000000") return console.error("POOL_STABLE_MANAGER_ADDRESS missing for deployment");
    if (!process.env.POOL_STABLE_TOKEN_ADDRESS || process.env.POOL_STABLE_TOKEN_ADDRESS == "0x0000000000000000000000000000000000000000") return console.error("POOL_STABLE_TOKEN_ADDRESS missing for deployment");
    if (!process.env.POOL_YIELD_MANAGER_ADDRESS || process.env.POOL_YIELD_MANAGER_ADDRESS == "0x0000000000000000000000000000000000000000") return console.error("POOL_YIELD_MANAGER_ADDRESS missing for deployment");
    if (!process.env.POOL_YIELD_TOKEN_ADDRESS || process.env.POOL_YIELD_TOKEN_ADDRESS == "0x0000000000000000000000000000000000000000") return console.error("POOL_YIELD_TOKEN_ADDRESS missing for deployment");
    if (!process.env.POOL_ETHEREUM_MANAGER_ADDRESS || process.env.POOL_ETHEREUM_MANAGER_ADDRESS == "0x0000000000000000000000000000000000000000") return console.error("POOL_ETHEREUM_MANAGER_ADDRESS missing for deployment");
    if (!process.env.POOL_ETHEREUM_TOKEN_ADDRESS || process.env.POOL_ETHEREUM_TOKEN_ADDRESS == "0x0000000000000000000000000000000000000000") return console.error("POOL_ETHEREUM_TOKEN_ADDRESS missing for deployment");
    if (!process.env.DISTRIBUTION_START_BLOCK) return console.error("DISTRIBUTION_START_BLOCK missing for deployment");

    var rariStablePoolManager = await IRariFundManager.at(process.env.POOL_STABLE_MANAGER_ADDRESS);
    if (await rariStablePoolManager.rariFundToken.call() !== process.env.POOL_STABLE_TOKEN_ADDRESS) return console.error("Mismatch between POOL_STABLE_TOKEN_ADDRESS and RariFundToken set on POOL_STABLE_MANAGER_ADDRESS");
    var rariYieldPoolManager = await IRariFundManager.at(process.env.POOL_YIELD_MANAGER_ADDRESS);
    if (await rariYieldPoolManager.rariFundToken.call() !== process.env.POOL_YIELD_TOKEN_ADDRESS) return console.error("Mismatch between POOL_YIELD_TOKEN_ADDRESS and RariFundToken set on POOL_YIELD_MANAGER_ADDRESS");
    var rariEthereumPoolManager = await IRariFundManager.at(process.env.POOL_ETHEREUM_MANAGER_ADDRESS);
    if (await rariEthereumPoolManager.rariFundToken.call() !== process.env.POOL_ETHEREUM_TOKEN_ADDRESS) return console.error("Mismatch between POOL_ETHEREUM_TOKEN_ADDRESS and RariFundToken set on POOL_ETHEREUM_MANAGER_ADDRESS");
    
    // Deploy RariGovernanceTokenDistributor (passing in pool managers and tokens)
    var rariGovernanceTokenDistributor = await deployProxy(RariGovernanceTokenDistributor, [process.env.DISTRIBUTION_START_BLOCK, [process.env.POOL_STABLE_MANAGER_ADDRESS, process.env.POOL_YIELD_MANAGER_ADDRESS, process.env.POOL_ETHEREUM_MANAGER_ADDRESS], [process.env.POOL_STABLE_TOKEN_ADDRESS, process.env.POOL_YIELD_TOKEN_ADDRESS, process.env.POOL_ETHEREUM_TOKEN_ADDRESS]], { deployer });
    
    // Deploy RariGovernanceTokenDistributorV2 (passing in pool managers and tokens)
    var rariGovernanceTokenDistributorV2 = await deployProxy(RariGovernanceTokenDistributorV2, [process.env.DISTRIBUTION_V2_START_BLOCK, [process.env.POOL_STABLE_MANAGER_ADDRESS, process.env.POOL_YIELD_MANAGER_ADDRESS, process.env.POOL_ETHEREUM_MANAGER_ADDRESS], [process.env.POOL_STABLE_TOKEN_ADDRESS, process.env.POOL_YIELD_TOKEN_ADDRESS, process.env.POOL_ETHEREUM_TOKEN_ADDRESS]], { deployer });

    // Deploy RariGovernanceTokenUniswapDistributor
    var rariGovernanceTokenUniswapDistributor = await deployProxy(RariGovernanceTokenUniswapDistributor, [process.env.UNISWAP_DISTRIBUTION_START_BLOCK, "0x0000000000000000000000000000000000000000"], { deployer });

    // Deploy RariGovernanceTokenVesting
    var rariGovernanceTokenVesting = await deployProxy(RariGovernanceTokenVesting, [process.env.PRIVATE_VESTING_START_TIMESTAMP], { deployer });

    // Deploy RariGovernanceTokenVestingV2
    var rariGovernanceTokenVestingV2 = await deployProxy(RariGovernanceTokenVestingV2, [process.env.PRIVATE_VESTING_V2_START_TIMESTAMP], { deployer });

    // Deploy RariGovernanceTokenVestingV3
    var rariGovernanceTokenVestingV3 = await deployProxy(RariGovernanceTokenVestingV3, [1635724800, web3.utils.toBN(100000).mul(web3.utils.toBN(1e18)).toString()], { deployer });

    // Deploy RariGovernanceToken (passing in the addresses of RariGovernanceTokenDistributor and RariGovernanceTokenVesting)
    var rariGovernanceToken = await deployProxy(RariGovernanceToken, [RariGovernanceTokenDistributor.address, RariGovernanceTokenVesting.address], { deployer });

    // Upgrade RariGovernanceToken
    await rariGovernanceToken.upgrade2(RariGovernanceTokenDistributorV2.address, RariGovernanceTokenVestingV2.address);

    // Connect RariGovernanceToken to distributors and vesting contracts
    await rariGovernanceTokenDistributor.setGovernanceToken(RariGovernanceToken.address);
    await rariGovernanceTokenDistributorV2.setGovernanceToken(RariGovernanceToken.address);
    await rariGovernanceTokenUniswapDistributor.setGovernanceToken(RariGovernanceToken.address);
    await rariGovernanceTokenVesting.setGovernanceToken(RariGovernanceToken.address);
    await rariGovernanceTokenVestingV2.setGovernanceToken(RariGovernanceToken.address);
    await rariGovernanceTokenVestingV3.setGovernanceToken(RariGovernanceToken.address);

    // Connect RariGovernanceTokenDistributor to pool managers and tokens
    var activeDistributor = (await web3.eth.getBlockNumber()) >= parseInt(process.env.DISTRIBUTION_START_BLOCK) + 390000 ? RariGovernanceTokenDistributorV2.address : RariGovernanceTokenDistributor.address;

    var rariStablePoolToken = await IRariFundToken.at(process.env.POOL_STABLE_TOKEN_ADDRESS);
    
    try {
      await rariStablePoolToken.setGovernanceTokenDistributor(activeDistributor, ["live", "live-fork"].indexOf(network) < 0, { from: process.env.POOL_OWNER });
    } catch (error) {
      if (["live", "live-fork"].indexOf(network) < 0 && error.message.indexOf("MinterRole: caller does not have the Minter role") >= 0) await rariStablePoolToken.setGovernanceTokenDistributor(activeDistributor, ["live", "live-fork"].indexOf(network) < 0);
      else return console.error(error);
    }
    
    var rariYieldPoolToken = await IRariFundToken.at(process.env.POOL_YIELD_TOKEN_ADDRESS);
  
    try {
      await rariYieldPoolToken.setGovernanceTokenDistributor(activeDistributor, ["live", "live-fork"].indexOf(network) < 0, { from: process.env.POOL_OWNER });
    } catch (error) {
      if (["live", "live-fork"].indexOf(network) < 0 && error.message.indexOf("MinterRole: caller does not have the Minter role") >= 0) await rariYieldPoolToken.setGovernanceTokenDistributor(activeDistributor, ["live", "live-fork"].indexOf(network) < 0);
      else return console.error(error);
    }
    
    var rariEthereumPoolToken = await IRariFundToken.at(process.env.POOL_ETHEREUM_TOKEN_ADDRESS);
    
    try {
      await rariEthereumPoolToken.setGovernanceTokenDistributor(activeDistributor, ["live", "live-fork"].indexOf(network) < 0, { from: process.env.POOL_OWNER });
    } catch (error) {
      if (["live", "live-fork"].indexOf(network) < 0 && error.message.indexOf("MinterRole: caller does not have the Minter role") >= 0) await rariEthereumPoolToken.setGovernanceTokenDistributor(activeDistributor, ["live", "live-fork"].indexOf(network) < 0);
      else return console.error(error);
    }

    if (["live", "live-fork"].indexOf(network) >= 0) {
      // Live network: transfer ownership of deployed contracts from the deployer to the owner
      await rariGovernanceToken.addPauser(process.env.LIVE_GOVERNANCE_OWNER);
      await rariGovernanceToken.renouncePauser();
      await rariGovernanceTokenDistributor.transferOwnership(process.env.LIVE_GOVERNANCE_OWNER);
      await rariGovernanceTokenDistributorV2.transferOwnership(process.env.LIVE_GOVERNANCE_OWNER);
      await rariGovernanceTokenUniswapDistributor.transferOwnership(process.env.LIVE_GOVERNANCE_OWNER);
      await rariGovernanceTokenVesting.transferOwnership(process.env.LIVE_GOVERNANCE_OWNER);
      await rariGovernanceTokenVestingV2.transferOwnership(process.env.LIVE_GOVERNANCE_OWNER);
      await rariGovernanceTokenVestingV3.transferOwnership(process.env.LIVE_GOVERNANCE_OWNER);
      await admin.transferProxyAdminOwnership(process.env.LIVE_GOVERNANCE_OWNER);
    }
  }
};
