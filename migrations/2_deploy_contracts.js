/**
 * COPYRIGHT © 2020 RARI CAPITAL, INC. ALL RIGHTS RESERVED.
 * Anyone is free to integrate the public (i.e., non-administrative) application programming interfaces (APIs) of the official Ethereum smart contract instances deployed by Rari Capital, Inc. in any application (commercial or noncommercial and under any license), provided that the application does not abuse the APIs or act against the interests of Rari Capital, Inc.
 * Anyone is free to study, review, and analyze the source code contained in this package.
 * Reuse (including deployment of smart contracts other than private testing on a private network), modification, redistribution, or sublicensing of any source code contained in this package is not permitted without the explicit permission of David Lucid of Rari Capital, Inc.
 * No one is permitted to use the software for any purpose other than those allowed by this license.
 * This license is liable to change at any time at the sole discretion of David Lucid of Rari Capital, Inc.
 */

const { deployProxy, admin } = require('@openzeppelin/truffle-upgrades');
require('dotenv').config();

var RariGovernanceToken = artifacts.require("RariGovernanceToken");
var RariGovernanceTokenDistributor = artifacts.require("RariGovernanceTokenDistributor");
var IRariFundManager = artifacts.require("IRariFundManager");
var IRariFundToken = artifacts.require("IRariFundToken");

module.exports = async function(deployer, network, accounts) {
  if (["live", "live-fork"].indexOf(network) >= 0) {
    if (!process.env.LIVE_GAS_PRICE) return console.error("LIVE_GAS_PRICE is missing for live deployment");
    if (!process.env.LIVE_GOVERNANCE_OWNER) return console.error("LIVE_GOVERNANCE_OWNER is missing for live deployment");
  }

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
  var rariGovernanceTokenDistributor = await deployProxy(RariGovernanceTokenDistributor, [process.env.DISTRIBUTION_START_BLOCK, [process.env.POOL_STABLE_MANAGER_ADDRESS, process.env.POOL_YIELD_MANAGER_ADDRESS, process.env.POOL_ETHEREUM_MANAGER_ADDRESS], [process.env.POOL_STABLE_TOKEN_ADDRESS, process.env.POOL_YIELD_TOKEN_ADDRESS, process.env.POOL_ETHEREUM_TOKEN_ADDRESS]], { deployer, unsafeAllowCustomTypes: true });

  // Deploy rariGovernanceToken (passing in the address of RariGovernanceTokenDistributor)
  var rariGovernanceToken = await deployProxy(RariGovernanceToken, [RariGovernanceTokenDistributor.address, ["live", "live-fork"].indexOf(network) >= 0 ? process.env.LIVE_GOVERNANCE_OWNER : process.env.DEVELOPMENT_ADDRESS], { deployer });

  // Connect RariGovernanceToken to RariGovernanceTokenDistributor
  await rariGovernanceTokenDistributor.setGovernanceToken(RariGovernanceToken.address);

  // Connect RariGovernanceTokenDistributor to pool managers and tokens
  var rariStablePoolToken = await IRariFundToken.at(process.env.POOL_STABLE_TOKEN_ADDRESS);
  
  try {
    await rariStablePoolToken.setGovernanceTokenDistributor(RariGovernanceTokenDistributor.address, ["live", "live-fork"].indexOf(network) < 0, { from: process.env.POOL_OWNER });
  } catch (error) {
    if (["live", "live-fork"].indexOf(network) < 0 && error.message.indexOf("MinterRole: caller does not have the Minter role") >= 0) await rariStablePoolToken.setGovernanceTokenDistributor(RariGovernanceTokenDistributor.address, ["live", "live-fork"].indexOf(network) < 0);
    else return console.error(error);
  }
  
  var rariYieldPoolToken = await IRariFundToken.at(process.env.POOL_YIELD_TOKEN_ADDRESS);
 
  try {
    await rariYieldPoolToken.setGovernanceTokenDistributor(RariGovernanceTokenDistributor.address, ["live", "live-fork"].indexOf(network) < 0, { from: process.env.POOL_OWNER });
  } catch (error) {
    if (["live", "live-fork"].indexOf(network) < 0 && error.message.indexOf("MinterRole: caller does not have the Minter role") >= 0) await rariYieldPoolToken.setGovernanceTokenDistributor(RariGovernanceTokenDistributor.address, ["live", "live-fork"].indexOf(network) < 0);
    else return console.error(error);
  }
  
  var rariEthereumPoolToken = await IRariFundToken.at(process.env.POOL_ETHEREUM_TOKEN_ADDRESS);
  
  try {
    await rariEthereumPoolToken.setGovernanceTokenDistributor(RariGovernanceTokenDistributor.address, ["live", "live-fork"].indexOf(network) < 0, { from: process.env.POOL_OWNER });
  } catch (error) {
    if (["live", "live-fork"].indexOf(network) < 0 && error.message.indexOf("MinterRole: caller does not have the Minter role") >= 0) await rariEthereumPoolToken.setGovernanceTokenDistributor(RariGovernanceTokenDistributor.address, ["live", "live-fork"].indexOf(network) < 0);
    else return console.error(error);
  }

  if (["live", "live-fork"].indexOf(network) >= 0) {
    // Live network: transfer ownership of deployed contracts from the deployer to the owner and send RGT to owner
    await rariGovernanceToken.addPauser(process.env.LIVE_GOVERNANCE_OWNER);
    await rariGovernanceToken.renouncePauser();
    await rariGovernanceTokenDistributor.transferOwnership(process.env.LIVE_GOVERNANCE_OWNER);
    await admin.transferProxyAdminOwnership(process.env.LIVE_GOVERNANCE_OWNER);
  }
};
