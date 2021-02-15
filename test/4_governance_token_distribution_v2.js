/**
 * COPYRIGHT © 2020 RARI CAPITAL, INC. ALL RIGHTS RESERVED.
 * Anyone is free to integrate the public (i.e., non-administrative) application programming interfaces (APIs) of the official Ethereum smart contract instances deployed by Rari Capital, Inc. in any application (commercial or noncommercial and under any license), provided that the application does not abuse the APIs or act against the interests of Rari Capital, Inc.
 * Anyone is free to study, review, and analyze the source code contained in this package.
 * Reuse (including deployment of smart contracts other than private testing on a private network), modification, redistribution, or sublicensing of any source code contained in this package is not permitted without the explicit permission of David Lucid of Rari Capital, Inc.
 * No one is permitted to use the software for any purpose other than those allowed by this license.
 * This license is liable to change at any time at the sole discretion of David Lucid of Rari Capital, Inc.
 */

const RariGovernanceToken = artifacts.require("RariGovernanceToken");
const RariGovernanceTokenDistributorV2 = artifacts.require("RariGovernanceTokenDistributorV2");
const IRariFundManager = artifacts.require("IRariFundManager");
const IRariFundToken = artifacts.require("IRariFundToken");
const IERC20 = artifacts.require("IERC20");

const DISTRIBUTION_PERIOD = 6500 * 365;
const FINAL_RGT_DISTRIBUTION = web3.utils.toBN(750000).mul(web3.utils.toBN(1e18));

function getRgtDistributed(blockNumber) {
  var startBlock = parseInt(process.env.DISTRIBUTION_V2_START_BLOCK);
  if (blockNumber <= startBlock) return web3.utils.toBN(0);
  if (blockNumber >= startBlock + DISTRIBUTION_PERIOD) return FINAL_RGT_DISTRIBUTION;
  var blocks = blockNumber - startBlock;
  return FINAL_RGT_DISTRIBUTION.muln(blocks).divn(DISTRIBUTION_PERIOD);
}

contract("RariGovernanceTokenDistributorV2", accounts => {
  it("should have distributed the correct amount of tokens at each checkpoint", async () => {
    let governanceTokenUniswapDistributorInstance = await RariGovernanceTokenDistributorV2.deployed();

    // Test Solidity and JS
    for (const [blocks, expected] of [
      [0, "0"],
      [6500, "2054794520547945205479"],
      [6500 * 30, "61643835616438356164383"],
      [6500 * 365, "750000000000000000000000"],
    ]) {
      var rgtExpected = web3.utils.toBN(expected);
      var rgtDistributedSolidity = await governanceTokenUniswapDistributorInstance.getRgtDistributed.call(parseInt(process.env.UNISWAP_DISTRIBUTION_START_BLOCK) + blocks);
      assert(rgtDistributedSolidity.eq(rgtExpected));
      var rgtDistributedJs = getRgtDistributed(parseInt(process.env.UNISWAP_DISTRIBUTION_START_BLOCK) + blocks);
      assert(rgtDistributedJs.eq(rgtExpected));
    }
  });

  it("should distribute tokens evenly across pools", async () => {
    let governanceTokenInstance = await (parseInt(process.env.UPGRADE_FROM_LAST_VERSION) > 0 ? RariGovernanceToken.at(process.env.UPGRADE_GOVERNANCE_TOKEN_ADDRESS) : RariGovernanceToken.deployed());
    let governanceTokenDistributorInstance = await RariGovernanceTokenDistributorV2.deployed();
    let stablePoolManagerInstance = await IRariFundManager.at(process.env.POOL_STABLE_MANAGER_ADDRESS);
    let stablePoolTokenInstance = await IRariFundToken.at(process.env.POOL_STABLE_TOKEN_ADDRESS);
    let yieldPoolManagerInstance = await IRariFundManager.at(process.env.POOL_YIELD_MANAGER_ADDRESS);
    let yieldPoolTokenInstance = await IRariFundToken.at(process.env.POOL_YIELD_TOKEN_ADDRESS);
    let ethereumPoolManagerInstance = await IRariFundManager.at(process.env.POOL_ETHEREUM_MANAGER_ADDRESS);
    let ethereumPoolTokenInstance = await IRariFundToken.at(process.env.POOL_ETHEREUM_TOKEN_ADDRESS);

    // Connect RariGovernanceTokenDistributor to pool managers and tokens
    await connectGovernanceTokenDistributorV2();

    // Burn all RSPT, RYPT, and REPT
    await stablePoolTokenInstance.burn(await stablePoolTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS), { from: process.env.DEVELOPMENT_ADDRESS });
    await yieldPoolTokenInstance.burn(await yieldPoolTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS), { from: process.env.DEVELOPMENT_ADDRESS });
    await ethereumPoolTokenInstance.burn(await ethereumPoolTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS), { from: process.env.DEVELOPMENT_ADDRESS });
    await stablePoolTokenInstance.burn(await stablePoolTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS_SECONDARY), { from: process.env.DEVELOPMENT_ADDRESS_SECONDARY });
    await yieldPoolTokenInstance.burn(await yieldPoolTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS_SECONDARY), { from: process.env.DEVELOPMENT_ADDRESS_SECONDARY });
    await ethereumPoolTokenInstance.burn(await ethereumPoolTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS_SECONDARY), { from: process.env.DEVELOPMENT_ADDRESS_SECONDARY });

    // Claim all RGT
    try {
      await governanceTokenDistributorInstance.claimAllRgt({ from: process.env.DEVELOPMENT_ADDRESS });
    } catch (error) { }

    try {
      await governanceTokenDistributorInstance.claimAllRgt({ from: process.env.DEVELOPMENT_ADDRESS_SECONDARY });
    } catch (error) { }

    // Pre-approve tokens for deposit later (so we don't accrue extra RGT and screw up assertions)
    var usdcInstance = await IERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
    await usdcInstance.approve(process.env.POOL_STABLE_MANAGER_ADDRESS, web3.utils.toBN(2).pow(web3.utils.toBN(256)).subn(1), { from: process.env.DEVELOPMENT_ADDRESS });
    await usdcInstance.approve(process.env.POOL_STABLE_MANAGER_ADDRESS, web3.utils.toBN(2).pow(web3.utils.toBN(256)).subn(1), { from: process.env.DEVELOPMENT_ADDRESS_SECONDARY });

    // Deposit 1 USDC to Rari Stable Pool
    await stablePoolManagerInstance.deposit("USDC", web3.utils.toBN(1e5), { from: process.env.DEVELOPMENT_ADDRESS });

    // Make 100 transactions to simulate 100 blocks passing; calculate RGT distributed per RSPT during the 100-block period
    var stablePoolRgtPerRspt = await pass100BlocksAndGetRgtPerRspt(stablePoolManagerInstance, yieldPoolManagerInstance, ethereumPoolManagerInstance, stablePoolTokenInstance, governanceTokenDistributorInstance);

    // Check unclaimed RGT against estimate
    var rsptBalance = await stablePoolTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS);
    var myEstimatedRgt = stablePoolRgtPerRspt.mul(rsptBalance).div(web3.utils.toBN(1e18));
    var myUnclaimedRgt = await governanceTokenDistributorInstance.getUnclaimedRgt.call(process.env.DEVELOPMENT_ADDRESS);
    assert(myUnclaimedRgt.gte(myEstimatedRgt.muln(99).divn(100)) && myUnclaimedRgt.lte(myEstimatedRgt.muln(102).divn(100)));

    // Claim all RGT
    var initialRgt = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS);
    await governanceTokenDistributorInstance.claimAllRgt({ from: process.env.DEVELOPMENT_ADDRESS });
    var rgtAfterClaim = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS);
    var myClaimedRgt = rgtAfterClaim.sub(initialRgt);
    assert(myClaimedRgt.gte(myEstimatedRgt.muln(99).divn(100)) && myClaimedRgt.lte(myEstimatedRgt.muln(102).divn(100)));

    // Make 100 transactions to simulate 100 blocks passing; calculate RGT distributed per RSPT during the 100-block period
    var stablePoolRgtPerRspt = await pass100BlocksAndGetRgtPerRspt(stablePoolManagerInstance, yieldPoolManagerInstance, ethereumPoolManagerInstance, stablePoolTokenInstance, governanceTokenDistributorInstance);

    // Check unclaimed RGT against estimate
    var myEstimatedRgt = stablePoolRgtPerRspt.mul(rsptBalance).div(web3.utils.toBN(1e18));
    var myUnclaimedRgt = await governanceTokenDistributorInstance.getUnclaimedRgt.call(process.env.DEVELOPMENT_ADDRESS);
    assert(myUnclaimedRgt.gte(myEstimatedRgt.muln(99).divn(100)) && myUnclaimedRgt.lte(myEstimatedRgt.muln(102).divn(100)));

    // Transfer RSPT (distributing RGT in the process)
    await stablePoolTokenInstance.transfer(process.env.DEVELOPMENT_ADDRESS_SECONDARY, rsptBalance, { from: process.env.DEVELOPMENT_ADDRESS });

    // Claim all RGT
    var initialRgt = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS);
    await governanceTokenDistributorInstance.claimAllRgt({ from: process.env.DEVELOPMENT_ADDRESS });
    var rgtAfterClaim = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS);
    var myClaimedRgt = rgtAfterClaim.sub(initialRgt);
    assert(myClaimedRgt.gte(myEstimatedRgt.muln(99).divn(100)) && myClaimedRgt.lte(myEstimatedRgt.muln(102).divn(100)));

    // Make 100 transactions to simulate 100 blocks passing; calculate RGT distributed per RSPT during the 100-block period
    var stablePoolRgtPerRspt = await pass100BlocksAndGetRgtPerRspt(stablePoolManagerInstance, yieldPoolManagerInstance, ethereumPoolManagerInstance, stablePoolTokenInstance, governanceTokenDistributorInstance);

    // Check unclaimed RGT against estimate
    var myEstimatedRgt = stablePoolRgtPerRspt.mul(rsptBalance).div(web3.utils.toBN(1e18));
    var myUnclaimedRgt = await governanceTokenDistributorInstance.getUnclaimedRgt.call(process.env.DEVELOPMENT_ADDRESS_SECONDARY);
    assert(myUnclaimedRgt.gte(myEstimatedRgt.muln(99).divn(100)) && myUnclaimedRgt.lte(myEstimatedRgt.muln(102).divn(100)));

    // Deposit (distributing RGT in the process)
    await stablePoolManagerInstance.deposit("USDC", web3.utils.toBN(1e5), { from: process.env.DEVELOPMENT_ADDRESS_SECONDARY });
  
    // Claim all RGT
    var initialRgt = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS_SECONDARY);
    await governanceTokenDistributorInstance.claimAllRgt({ from: process.env.DEVELOPMENT_ADDRESS_SECONDARY });
    var rgtAfterClaim = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS_SECONDARY);
    var myClaimedRgt = rgtAfterClaim.sub(initialRgt);
    assert(myClaimedRgt.gte(myEstimatedRgt.muln(99).divn(100)) && myClaimedRgt.lte(myEstimatedRgt.muln(105).divn(100)));

    // Make 100 transactions to simulate 100 blocks passing; calculate RGT distributed per RSPT during the 100-block period
    var stablePoolRgtPerRspt = await pass100BlocksAndGetRgtPerRspt(stablePoolManagerInstance, yieldPoolManagerInstance, ethereumPoolManagerInstance, stablePoolTokenInstance, governanceTokenDistributorInstance);

    // Check unclaimed RGT against estimate
    var rsptBalance = await stablePoolTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS_SECONDARY);
    var myEstimatedRgt = stablePoolRgtPerRspt.mul(rsptBalance).div(web3.utils.toBN(1e18));
    var myUnclaimedRgt = await governanceTokenDistributorInstance.getUnclaimedRgt.call(process.env.DEVELOPMENT_ADDRESS_SECONDARY);
    assert(myUnclaimedRgt.gte(myEstimatedRgt.muln(99).divn(100)) && myUnclaimedRgt.lte(myEstimatedRgt.muln(102).divn(100)));

    // Withdraw (distributing RGT in the process)
    await stablePoolManagerInstance.withdraw("USDC", web3.utils.toBN(1e5), { from: process.env.DEVELOPMENT_ADDRESS_SECONDARY });

    // Claim all RGT
    var initialRgt = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS_SECONDARY);
    await governanceTokenDistributorInstance.claimAllRgt({ from: process.env.DEVELOPMENT_ADDRESS_SECONDARY });
    var rgtAfterClaim = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS_SECONDARY);
    var myClaimedRgt = rgtAfterClaim.sub(initialRgt);
    assert(myClaimedRgt.gte(myEstimatedRgt.muln(99).divn(100)) && myClaimedRgt.lte(myEstimatedRgt.muln(102).divn(100)));
  });
});

async function pass100BlocksAndGetRgtPerRspt(stablePoolManagerInstance, yieldPoolManagerInstance, ethereumPoolManagerInstance, stablePoolTokenInstance, governanceTokenDistributorInstance) {
  // Make 100 transactions to simulate 100 blocks passing
  var initialBlockNumber = await web3.eth.getBlockNumber();
  for (var i = 0; i < 100; i++) await web3.eth.sendTransaction({ from: process.env.DEVELOPMENT_ADDRESS, to: "0x0000000000000000000000000000000000000000", value: 0 });
  var finalBlockNumber = await web3.eth.getBlockNumber();

  // Calculate RGT distributed per RSPT during the 100-block period
  var stablePoolFundBalance = await stablePoolManagerInstance.getFundBalance.call();
  var yieldPoolFundBalance = await yieldPoolManagerInstance.getFundBalance.call();
  var ethereumPoolFundBalance = (await ethereumPoolManagerInstance.getFundBalance.call()).mul(await governanceTokenDistributorInstance.getEthUsdPrice.call()).div(web3.utils.toBN(1e8));
  var poolFundBalanceSum = stablePoolFundBalance.add(yieldPoolFundBalance).add(ethereumPoolFundBalance);
  var rgtDistributed = getRgtDistributed(finalBlockNumber).sub(getRgtDistributed(initialBlockNumber));
  var rsptTotalSupply = await stablePoolTokenInstance.totalSupply.call();
  var stablePoolRgtPerRspt = rgtDistributed.mul(stablePoolFundBalance).div(poolFundBalanceSum).mul(web3.utils.toBN(1e18)).div(rsptTotalSupply);
  return stablePoolRgtPerRspt;
}

async function connectGovernanceTokenDistributorV2() {
  // Connect RariGovernanceTokenDistributor to pool managers and tokens
  var rariStablePoolToken = await IRariFundToken.at(process.env.POOL_STABLE_TOKEN_ADDRESS);

  try {
    await rariStablePoolToken.setGovernanceTokenDistributor(RariGovernanceTokenDistributorV2.address, true, { from: process.env.POOL_OWNER });
  } catch (error) {
    if (error.message.indexOf("MinterRole: caller does not have the Minter role") >= 0) await rariStablePoolToken.setGovernanceTokenDistributor(rariGovernanceTokenDistributorV2.address, true);
    else throw error;
  }
  
  var rariYieldPoolToken = await IRariFundToken.at(process.env.POOL_YIELD_TOKEN_ADDRESS);

  try {
    await rariYieldPoolToken.setGovernanceTokenDistributor(RariGovernanceTokenDistributorV2.address, true, { from: process.env.POOL_OWNER });
  } catch (error) {
    if (error.message.indexOf("MinterRole: caller does not have the Minter role") >= 0) await rariYieldPoolToken.setGovernanceTokenDistributor(rariGovernanceTokenDistributorV2.address, true);
    else throw error;
  }
  
  var rariEthereumPoolToken = await IRariFundToken.at(process.env.POOL_ETHEREUM_TOKEN_ADDRESS);
  
  try {
    await rariEthereumPoolToken.setGovernanceTokenDistributor(RariGovernanceTokenDistributorV2.address, true, { from: process.env.POOL_OWNER });
  } catch (error) {
    if (error.message.indexOf("MinterRole: caller does not have the Minter role") >= 0) await rariEthereumPoolToken.setGovernanceTokenDistributor(rariGovernanceTokenDistributorV2.address, true);
    else throw error;
  }
}
