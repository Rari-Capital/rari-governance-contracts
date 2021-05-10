// SPDX-License-Identifier: MIT
const RariGovernanceToken = artifacts.require("RariGovernanceToken");
const RariGovernanceTokenDistributor = artifacts.require("RariGovernanceTokenDistributor");
const IRariFundManager = artifacts.require("IRariFundManager");
const IRariFundToken = artifacts.require("IRariFundToken");
const IERC20 = artifacts.require("IERC20");

const DISTRIBUTION_PERIOD = 390000;

function getRgtDistributed(blockNumber) {
  var startBlock = parseInt(process.env.DISTRIBUTION_START_BLOCK);
  if (blockNumber <= startBlock) return web3.utils.toBN(0);
  if (blockNumber >= startBlock + DISTRIBUTION_PERIOD) return web3.utils.toBN(8750000).mul(web3.utils.toBN(1e18));
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

function getPublicRgtClaimFee(blockNumber) {
  var initialClaimFee = web3.utils.toBN(0.33e18);
  if (blockNumber <= parseInt(process.env.DISTRIBUTION_START_BLOCK)) return initialClaimFee;
  var distributionEndBlock = parseInt(process.env.DISTRIBUTION_START_BLOCK) + DISTRIBUTION_PERIOD;
  if (blockNumber >= distributionEndBlock) return web3.utils.toBN(0);
  return initialClaimFee.muln(distributionEndBlock - blockNumber).divn(DISTRIBUTION_PERIOD);
}

contract("RariGovernanceTokenDistributor", accounts => {
  it("should have distributed the correct amount of tokens at each checkpoint", async () => {
    let governanceTokenDistributorInstance = await (parseInt(process.env.UPGRADE_FROM_LAST_VERSION) > 0 ? RariGovernanceTokenDistributor.at(process.env.UPGRADE_GOVERNANCE_TOKEN_DISTRIBUTOR_ADDRESS) : RariGovernanceTokenDistributor.deployed());

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
    let governanceTokenInstance = await (parseInt(process.env.UPGRADE_FROM_LAST_VERSION) > 0 ? RariGovernanceToken.at(process.env.UPGRADE_GOVERNANCE_TOKEN_ADDRESS) : RariGovernanceToken.deployed());
    let governanceTokenDistributorInstance = await (parseInt(process.env.UPGRADE_FROM_LAST_VERSION) > 0 ? RariGovernanceTokenDistributor.at(process.env.UPGRADE_GOVERNANCE_TOKEN_DISTRIBUTOR_ADDRESS) : RariGovernanceTokenDistributor.deployed());
    let stablePoolManagerInstance = await IRariFundManager.at(process.env.POOL_STABLE_MANAGER_ADDRESS);
    let stablePoolTokenInstance = await IRariFundToken.at(process.env.POOL_STABLE_TOKEN_ADDRESS);
    let yieldPoolManagerInstance = await IRariFundManager.at(process.env.POOL_YIELD_MANAGER_ADDRESS);
    let yieldPoolTokenInstance = await IRariFundToken.at(process.env.POOL_YIELD_TOKEN_ADDRESS);
    let ethereumPoolManagerInstance = await IRariFundManager.at(process.env.POOL_ETHEREUM_MANAGER_ADDRESS);
    let ethereumPoolTokenInstance = await IRariFundToken.at(process.env.POOL_ETHEREUM_TOKEN_ADDRESS);

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
    myEstimatedRgt.isub(myEstimatedRgt.mul(getPublicRgtClaimFee(await web3.eth.getBlockNumber())).div(web3.utils.toBN(1e18)));
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
    myEstimatedRgt.isub(myEstimatedRgt.mul(getPublicRgtClaimFee(await web3.eth.getBlockNumber())).div(web3.utils.toBN(1e18)));
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
    myEstimatedRgt.isub(myEstimatedRgt.mul(getPublicRgtClaimFee(await web3.eth.getBlockNumber())).div(web3.utils.toBN(1e18)));
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
    myEstimatedRgt.isub(myEstimatedRgt.mul(getPublicRgtClaimFee(await web3.eth.getBlockNumber())).div(web3.utils.toBN(1e18)));
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
