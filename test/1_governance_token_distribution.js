/**
 * COPYRIGHT © 2020 RARI CAPITAL, INC. ALL RIGHTS RESERVED.
 * Anyone is free to integrate the public (i.e., non-administrative) application programming interfaces (APIs) of the official Ethereum smart contract instances deployed by Rari Capital, Inc. in any application (commercial or noncommercial and under any license), provided that the application does not abuse the APIs or act against the interests of Rari Capital, Inc.
 * Anyone is free to study, review, and analyze the source code contained in this package.
 * Reuse (including deployment of smart contracts other than private testing on a private network), modification, redistribution, or sublicensing of any source code contained in this package is not permitted without the explicit permission of David Lucid of Rari Capital, Inc.
 * No one is permitted to use the software for any purpose other than those allowed by this license.
 * This license is liable to change at any time at the sole discretion of David Lucid of Rari Capital, Inc.
 */

const RariGovernanceToken = artifacts.require("RariGovernanceToken");
const RariGovernanceTokenDistributor = artifacts.require("RariGovernanceTokenDistributor");
const IRariFundManager = artifacts.require("IRariFundManager");
const IRariFundToken = artifacts.require("IRariFundToken");
const IERC20 = artifacts.require("IERC20");

function getRgtDistributed(blockNumber) {
  var startBlock = parseInt(process.env.DISTRIBUTION_START_BLOCK);
  if (blockNumber <= startBlock) return web3.utils.toBN(0);
  if (blockNumber >= startBlock + 390000) return web3.utils.toBN(8750000).mul(web3.utils.toBN(1e18));
  var blocks = blockNumber - startBlock;
  if (blocks < 6500 * 15)
    return web3.utils.toBN(1e18).mul(web3.utils.toBN(blocks).pow(web3.utils.toBN(2))).divn(2730)
      .add(web3.utils.toBN("1450000000000000000000").muln(blocks).divn(273));
  if (blocks < 6500 * 30)
    return web3.utils.toBN("14600000000000000000000").muln(blocks).divn(273)
      .sub(web3.utils.toBN("2000000000000000000").mul(web3.utils.toBN(blocks).pow(web3.utils.toBN(2))).divn(17745))
      .sub(web3.utils.toBN("1000000000000000000000000").divn(7));
  if (blocks < 6500 * 45)
    return web3.utils.toBN(1e18).mul(web3.utils.toBN(blocks).pow(web3.utils.toBN(2))).divn(35490)
      .add(web3.utils.toBN("39250000000000000000000000").divn(7))
      .sub(web3.utils.toBN("950000000000000000000").muln(blocks).divn(273));
  return web3.utils.toBN(1e18).mul(web3.utils.toBN(blocks).pow(web3.utils.toBN(2))).divn(35490)
    .add(web3.utils.toBN("34750000000000000000000000").divn(7))
    .sub(web3.utils.toBN("50000000000000000000").muln(blocks).divn(39));
}

contract("RariGovernanceTokenDistributor", accounts => {
  it("should have distributed the correct amount of tokens at each checkpoint", async () => {
    let governanceTokenDistributorInstance = await RariGovernanceTokenDistributor.deployed();

    // Test Solidity and JS
    assert((await governanceTokenDistributorInstance.getRgtDistributed.call(parseInt(process.env.DISTRIBUTION_START_BLOCK))).isZero());
    assert(getRgtDistributed(parseInt(process.env.DISTRIBUTION_START_BLOCK)).isZero());

    for (const [blocks, expected] of [
      [6500, "50000"],
      [6500 * 15, "4000000"],
      [6500 * (15 + 1), "4200000"],
      [6500 * 30, "6000000"],
      [6500 * (30 + 1), "6050000"],
      [6500 * 45, "7000000"],
      [6500 * (45 + 1), "7100000"]
    ]) {
      var rgtExpected = web3.utils.toBN(expected).mul(web3.utils.toBN(1e18));
      var rgtDistributedSolidity = await governanceTokenDistributorInstance.getRgtDistributed.call(parseInt(process.env.DISTRIBUTION_START_BLOCK) + blocks);
      assert(rgtDistributedSolidity.gte(rgtExpected.muln(999999).divn(1000000)) && rgtDistributedSolidity.lte(rgtExpected.muln(1000001).divn(1000000)));
      var rgtDistributedJs = getRgtDistributed(parseInt(process.env.DISTRIBUTION_START_BLOCK) + blocks);
      assert(rgtDistributedJs.gte(rgtExpected.muln(999999).divn(1000000)) && rgtDistributedJs.lte(rgtExpected.muln(1000001).divn(1000000)));
    }

    assert((await governanceTokenDistributorInstance.getRgtDistributed.call(parseInt(process.env.DISTRIBUTION_START_BLOCK) + (6500 * 60))).eq(web3.utils.toBN("8750000").mul(web3.utils.toBN(1e18))));
    assert(getRgtDistributed(parseInt(process.env.DISTRIBUTION_START_BLOCK) + (6500 * 60)).eq(web3.utils.toBN("8750000").mul(web3.utils.toBN(1e18))));
  });

  it("should distribute tokens evenly across pools", async () => {
    let governanceTokenInstance = await RariGovernanceToken.deployed();
    let governanceTokenDistributorInstance = await RariGovernanceTokenDistributor.deployed();
    let stablePoolManagerInstance = await IRariFundManager.at(process.env.POOL_STABLE_MANAGER_ADDRESS);
    let stablePoolTokenInstance = await IRariFundToken.at(process.env.POOL_STABLE_TOKEN_ADDRESS);
    let yieldPoolManagerInstance = await IRariFundManager.at(process.env.POOL_YIELD_MANAGER_ADDRESS);
    let yieldPoolTokenInstance = await IRariFundToken.at(process.env.POOL_YIELD_TOKEN_ADDRESS);
    let ethereumPoolManagerInstance = await IRariFundManager.at(process.env.POOL_ETHEREUM_MANAGER_ADDRESS);
    let ethereumPoolTokenInstance = await IRariFundToken.at(process.env.POOL_ETHEREUM_TOKEN_ADDRESS);

    // Pre-approve tokens for deposit later (so we don't accrue extra RGT and screw up assertions)
    var daiInstance = await IERC20.at("0x6B175474E89094C44Da98b954EedeAC495271d0F");
    await daiInstance.approve(process.env.POOL_STABLE_MANAGER_ADDRESS, web3.utils.toBN(2).pow(web3.utils.toBN(256)).subn(1), { from: process.env.DEVELOPMENT_ADDRESS });
    await daiInstance.approve(process.env.POOL_STABLE_MANAGER_ADDRESS, web3.utils.toBN(2).pow(web3.utils.toBN(256)).subn(1), { from: process.env.DEVELOPMENT_ADDRESS_SECONDARY });

    // Deposit 1 DAI to Rari Stable Pool
    await stablePoolManagerInstance.deposit("DAI", web3.utils.toBN(1e18), { from: process.env.DEVELOPMENT_ADDRESS });

    // Burn all RSPT, RYPT, and REPT, claiming all RGT in the process
    await stablePoolTokenInstance.burn(await stablePoolTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS), { from: process.env.DEVELOPMENT_ADDRESS });
    await yieldPoolTokenInstance.burn(await yieldPoolTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS), { from: process.env.DEVELOPMENT_ADDRESS });
    await ethereumPoolTokenInstance.burn(await ethereumPoolTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS), { from: process.env.DEVELOPMENT_ADDRESS });
    await stablePoolTokenInstance.burn(await stablePoolTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS_SECONDARY), { from: process.env.DEVELOPMENT_ADDRESS_SECONDARY });
    await yieldPoolTokenInstance.burn(await yieldPoolTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS_SECONDARY), { from: process.env.DEVELOPMENT_ADDRESS_SECONDARY });
    await ethereumPoolTokenInstance.burn(await ethereumPoolTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS_SECONDARY), { from: process.env.DEVELOPMENT_ADDRESS_SECONDARY });

    // Deposit 1 DAI to Rari Stable Pool
    await stablePoolManagerInstance.deposit("DAI", web3.utils.toBN(1e18), { from: process.env.DEVELOPMENT_ADDRESS });

    // Make 100 transactions to simulate 100 blocks passing; calculate RGT distributed per RSPT during the 100-block period
    var stablePoolRgtPerRspt = await pass100BlocksAndGetRgtPerRspt(stablePoolManagerInstance, yieldPoolManagerInstance, ethereumPoolManagerInstance, stablePoolTokenInstance);

    // Check unclaimed RGT against estimate
    var rsptBalance = await stablePoolTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS);
    var myEstimatedRgt = stablePoolRgtPerRspt.mul(rsptBalance).div(web3.utils.toBN(1e18));
    var myUnclaimedRgt = await governanceTokenDistributorInstance.getUnclaimedRgt.call(process.env.DEVELOPMENT_ADDRESS);
    assert(myUnclaimedRgt.gte(myEstimatedRgt.muln(99).divn(100)) && myUnclaimedRgt.lte(myEstimatedRgt.muln(102).divn(100)));

    // Claim RGT
    var initialRgt = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS);
    await governanceTokenDistributorInstance.claimRgt(process.env.DEVELOPMENT_ADDRESS, 0, { from: process.env.DEVELOPMENT_ADDRESS });
    var rgtAfterClaim = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS);
    var myClaimedRgt = rgtAfterClaim.sub(initialRgt);
    assert(myClaimedRgt.gte(myEstimatedRgt.muln(99).divn(100)) && myClaimedRgt.lte(myEstimatedRgt.muln(102).divn(100)));

    // Make 100 transactions to simulate 100 blocks passing; calculate RGT distributed per RSPT during the 100-block period
    var stablePoolRgtPerRspt = await pass100BlocksAndGetRgtPerRspt(stablePoolManagerInstance, yieldPoolManagerInstance, ethereumPoolManagerInstance, stablePoolTokenInstance);

    // Check unclaimed RGT against estimate
    var myEstimatedRgt = stablePoolRgtPerRspt.mul(rsptBalance).div(web3.utils.toBN(1e18));
    var myUnclaimedRgt = await governanceTokenDistributorInstance.getUnclaimedRgt.call(process.env.DEVELOPMENT_ADDRESS);
    assert(myUnclaimedRgt.gte(myEstimatedRgt.muln(99).divn(100)) && myUnclaimedRgt.lte(myEstimatedRgt.muln(102).divn(100)));

    // Transfer RSPT (claiming RGT in the process)
    var initialRgt = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS);
    await stablePoolTokenInstance.transfer(process.env.DEVELOPMENT_ADDRESS_SECONDARY, rsptBalance, { from: process.env.DEVELOPMENT_ADDRESS });
    var rgtAfterClaim = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS);
    var myClaimedRgt = rgtAfterClaim.sub(initialRgt);
    assert(myClaimedRgt.gte(myEstimatedRgt.muln(99).divn(100)) && myClaimedRgt.lte(myEstimatedRgt.muln(102).divn(100)));

    // Make 100 transactions to simulate 100 blocks passing; calculate RGT distributed per RSPT during the 100-block period
    var stablePoolRgtPerRspt = await pass100BlocksAndGetRgtPerRspt(stablePoolManagerInstance, yieldPoolManagerInstance, ethereumPoolManagerInstance, stablePoolTokenInstance);

    // Check unclaimed RGT against estimate
    var myEstimatedRgt = stablePoolRgtPerRspt.mul(rsptBalance).div(web3.utils.toBN(1e18));
    var myUnclaimedRgt = await governanceTokenDistributorInstance.getUnclaimedRgt.call(process.env.DEVELOPMENT_ADDRESS_SECONDARY);
    assert(myUnclaimedRgt.gte(myEstimatedRgt.muln(99).divn(100)) && myUnclaimedRgt.lte(myEstimatedRgt.muln(102).divn(100)));

    // Deposit (claiming RGT in the process)
    var initialRgt = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS_SECONDARY);
    await stablePoolManagerInstance.deposit("DAI", web3.utils.toBN(1e18), { from: process.env.DEVELOPMENT_ADDRESS_SECONDARY });
    var rgtAfterClaim = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS_SECONDARY);
    var myClaimedRgt = rgtAfterClaim.sub(initialRgt);
    assert(myClaimedRgt.gte(myEstimatedRgt.muln(99).divn(100)) && myClaimedRgt.lte(myEstimatedRgt.muln(102).divn(100)));

    // Make 100 transactions to simulate 100 blocks passing; calculate RGT distributed per RSPT during the 100-block period
    var stablePoolRgtPerRspt = await pass100BlocksAndGetRgtPerRspt(stablePoolManagerInstance, yieldPoolManagerInstance, ethereumPoolManagerInstance, stablePoolTokenInstance);

    // Check unclaimed RGT against estimate
    var rsptBalance = await stablePoolTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS_SECONDARY);
    var myEstimatedRgt = stablePoolRgtPerRspt.mul(rsptBalance).div(web3.utils.toBN(1e18));
    var myUnclaimedRgt = await governanceTokenDistributorInstance.getUnclaimedRgt.call(process.env.DEVELOPMENT_ADDRESS_SECONDARY);
    assert(myUnclaimedRgt.gte(myEstimatedRgt.muln(99).divn(100)) && myUnclaimedRgt.lte(myEstimatedRgt.muln(102).divn(100)));

    // Withdraw (claiming RGT in the process)
    var initialRgt = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS_SECONDARY);
    await stablePoolManagerInstance.withdraw("DAI", web3.utils.toBN(1e18), { from: process.env.DEVELOPMENT_ADDRESS_SECONDARY });
    var rgtAfterClaim = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS_SECONDARY);
    var myClaimedRgt = rgtAfterClaim.sub(initialRgt);
    assert(myClaimedRgt.gte(myEstimatedRgt.muln(99).divn(100)) && myClaimedRgt.lte(myEstimatedRgt.muln(102).divn(100)));
  });
});

async function pass100BlocksAndGetRgtPerRspt(stablePoolManagerInstance, yieldPoolManagerInstance, ethereumPoolManagerInstance, stablePoolTokenInstance) {
  // Make 100 transactions to simulate 100 blocks passing
  var initialBlockNumber = await web3.eth.getBlockNumber();
  for (var i = 0; i < 100; i++) await web3.eth.sendTransaction({ from: process.env.DEVELOPMENT_ADDRESS, to: "0x0000000000000000000000000000000000000000", value: 0 });
  var finalBlockNumber = await web3.eth.getBlockNumber();

  // Calculate RGT distributed per RSPT during the 100-block period
  var stablePoolFundBalance = await stablePoolManagerInstance.getFundBalance.call();
  var yieldPoolFundBalance = await yieldPoolManagerInstance.getFundBalance.call();
  var ethereumPoolFundBalance = await ethereumPoolManagerInstance.getFundBalance.call();
  var poolFundBalanceSum = stablePoolFundBalance.add(yieldPoolFundBalance).add(ethereumPoolFundBalance);
  var rgtDistributed = getRgtDistributed(finalBlockNumber).sub(getRgtDistributed(initialBlockNumber));
  var rsptTotalSupply = await stablePoolTokenInstance.totalSupply.call();
  var stablePoolRgtPerRspt = rgtDistributed.mul(stablePoolFundBalance).div(poolFundBalanceSum).mul(web3.utils.toBN(1e18)).div(rsptTotalSupply);
  return stablePoolRgtPerRspt;
}
