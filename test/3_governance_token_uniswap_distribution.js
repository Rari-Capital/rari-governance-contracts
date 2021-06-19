// SPDX-License-Identifier: MIT
const RariGovernanceToken = artifacts.require("RariGovernanceToken");
const RariGovernanceTokenUniswapDistributor = artifacts.require("RariGovernanceTokenUniswapDistributor");
const IERC20 = artifacts.require("IERC20");

const DISTRIBUTION_PERIOD = 6500 * 365 * 3;
const FINAL_RGT_DISTRIBUTION = web3.utils.toBN("568717819057309757517546").muln(80).divn(100);

function getRgtDistributed(blockNumber) {
  var startBlock = parseInt(process.env.UNISWAP_DISTRIBUTION_START_BLOCK);
  if (blockNumber <= startBlock) return web3.utils.toBN(0);
  if (blockNumber >= startBlock + DISTRIBUTION_PERIOD) return FINAL_RGT_DISTRIBUTION;
  var blocks = blockNumber - startBlock;
  return FINAL_RGT_DISTRIBUTION.muln(blocks).divn(DISTRIBUTION_PERIOD);
}

contract("RariGovernanceTokenUniswapDistributor", accounts => {
  it("should have distributed the correct amount of tokens at each checkpoint", async () => {
    let governanceTokenUniswapDistributorInstance = await RariGovernanceTokenUniswapDistributor.deployed();

    // Test Solidity and JS
    for (const [blocks, expected] of [
      [0, "0"],
      [6500, "415501602964244571702"],
      [6500 * 30, "12465048088927337151069"],
      [6500 * 365, "151658085081949268671345"],
      [6500 * 365 * 3, "454974255245847806014036"]
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
    let governanceTokenUniswapDistributorInstance = await RariGovernanceTokenUniswapDistributor.deployed();

    // Pretend that USDC is the RGT/ETH Uniswap LP token
    await governanceTokenUniswapDistributorInstance.setRgtEthUniswapV2Pair("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");

    // Pre-approve tokens for deposit later (so we don't accrue extra RGT and screw up assertions)
    var lpTokenInstance = await IERC20.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
    await lpTokenInstance.approve(governanceTokenUniswapDistributorInstance.address, web3.utils.toBN(2).pow(web3.utils.toBN(256)).subn(1), { from: process.env.DEVELOPMENT_ADDRESS });
    await lpTokenInstance.approve(governanceTokenUniswapDistributorInstance.address, web3.utils.toBN(2).pow(web3.utils.toBN(256)).subn(1), { from: process.env.DEVELOPMENT_ADDRESS_SECONDARY });

    // Deposit 0.1 USDC to the staking contract (on the 1st dev account)
    await governanceTokenUniswapDistributorInstance.deposit(web3.utils.toBN(1e5), { from: process.env.DEVELOPMENT_ADDRESS });

    // Make 100 transactions to simulate 100 blocks passing; calculate RGT distributed per LP token during the 100-block period
    var rgtPerLpToken = await pass100BlocksAndGetRgtPerLpToken(governanceTokenUniswapDistributorInstance);

    // Check unclaimed RGT against estimate
    var stakingBalance = await governanceTokenUniswapDistributorInstance.stakingBalances.call(process.env.DEVELOPMENT_ADDRESS);
    var myEstimatedRgt = rgtPerLpToken.mul(stakingBalance).div(web3.utils.toBN(1e18));
    var myUnclaimedRgt = await governanceTokenUniswapDistributorInstance.getUnclaimedRgt.call(process.env.DEVELOPMENT_ADDRESS);
    assert(myUnclaimedRgt.gte(myEstimatedRgt.muln(99).divn(100)) && myUnclaimedRgt.lte(myEstimatedRgt.muln(102).divn(100)));

    // Claim all RGT
    var initialRgt = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS);
    await governanceTokenUniswapDistributorInstance.claimAllRgt({ from: process.env.DEVELOPMENT_ADDRESS });
    var rgtAfterClaim = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS);
    var myClaimedRgt = rgtAfterClaim.sub(initialRgt);
    assert(myClaimedRgt.gte(myEstimatedRgt.muln(99).divn(100)) && myClaimedRgt.lte(myEstimatedRgt.muln(102).divn(100)));

    // Make 100 transactions to simulate 100 blocks passing; calculate RGT distributed per LP token during the 100-block period
    var rgtPerLpToken = await pass100BlocksAndGetRgtPerLpToken(governanceTokenUniswapDistributorInstance);

    // Check unclaimed RGT against estimate
    var myEstimatedRgt = rgtPerLpToken.mul(stakingBalance).div(web3.utils.toBN(1e18));
    var myUnclaimedRgt = await governanceTokenUniswapDistributorInstance.getUnclaimedRgt.call(process.env.DEVELOPMENT_ADDRESS);
    assert(myUnclaimedRgt.gte(myEstimatedRgt.muln(99).divn(100)) && myUnclaimedRgt.lte(myEstimatedRgt.muln(102).divn(100)));

    // Deposit 0.1 USDC to the staking contract (on the 2nd dev account)
    await governanceTokenUniswapDistributorInstance.deposit(web3.utils.toBN(1e5), { from: process.env.DEVELOPMENT_ADDRESS_SECONDARY });

    // Make 100 transactions to simulate 100 blocks passing; calculate RGT distributed per LP token during the 100-block period
    var rgtPerLpToken = await pass100BlocksAndGetRgtPerLpToken(governanceTokenUniswapDistributorInstance);

    // Check unclaimed RGT against estimate
    var myEstimatedRgt = rgtPerLpToken.mul(stakingBalance).div(web3.utils.toBN(1e18));
    var myUnclaimedRgt = await governanceTokenUniswapDistributorInstance.getUnclaimedRgt.call(process.env.DEVELOPMENT_ADDRESS_SECONDARY);
    assert(myUnclaimedRgt.gte(myEstimatedRgt.muln(99).divn(100)) && myUnclaimedRgt.lte(myEstimatedRgt.muln(102).divn(100)));

    // Deposit again (distributing RGT in the process)
    await governanceTokenUniswapDistributorInstance.deposit(web3.utils.toBN(1e5), { from: process.env.DEVELOPMENT_ADDRESS_SECONDARY });
  
    // Claim all RGT
    var initialRgt = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS_SECONDARY);
    await governanceTokenUniswapDistributorInstance.claimAllRgt({ from: process.env.DEVELOPMENT_ADDRESS_SECONDARY });
    var rgtAfterClaim = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS_SECONDARY);
    var myClaimedRgt = rgtAfterClaim.sub(initialRgt);
    assert(myClaimedRgt.gte(myEstimatedRgt.muln(99).divn(100)) && myClaimedRgt.lte(myEstimatedRgt.muln(105).divn(100)));

    // Make 100 transactions to simulate 100 blocks passing; calculate RGT distributed per LP token during the 100-block period
    var rgtPerLpToken = await pass100BlocksAndGetRgtPerLpToken(governanceTokenUniswapDistributorInstance);

    // Check unclaimed RGT against estimate
    var stakingBalance = await governanceTokenUniswapDistributorInstance.stakingBalances.call(process.env.DEVELOPMENT_ADDRESS_SECONDARY);
    var myEstimatedRgt = rgtPerLpToken.mul(stakingBalance).div(web3.utils.toBN(1e18));
    var myUnclaimedRgt = await governanceTokenUniswapDistributorInstance.getUnclaimedRgt.call(process.env.DEVELOPMENT_ADDRESS_SECONDARY);
    assert(myUnclaimedRgt.gte(myEstimatedRgt.muln(99).divn(100)) && myUnclaimedRgt.lte(myEstimatedRgt.muln(102).divn(100)));

    // Withdraw (distributing RGT in the process)
    await governanceTokenUniswapDistributorInstance.withdraw(web3.utils.toBN(1e5), { from: process.env.DEVELOPMENT_ADDRESS_SECONDARY });

    // Claim all RGT
    var initialRgt = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS_SECONDARY);
    await governanceTokenUniswapDistributorInstance.claimAllRgt({ from: process.env.DEVELOPMENT_ADDRESS_SECONDARY });
    var rgtAfterClaim = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS_SECONDARY);
    var myClaimedRgt = rgtAfterClaim.sub(initialRgt);
    assert(myClaimedRgt.gte(myEstimatedRgt.muln(99).divn(100)) && myClaimedRgt.lte(myEstimatedRgt.muln(102).divn(100)));
  });
});

async function pass100BlocksAndGetRgtPerLpToken(governanceTokenUniswapDistributorInstance) {
  // Make 100 transactions to simulate 100 blocks passing
  var initialBlockNumber = await web3.eth.getBlockNumber();
  for (var i = 0; i < 100; i++) await web3.eth.sendTransaction({ from: process.env.DEVELOPMENT_ADDRESS, to: "0x0000000000000000000000000000000000000000", value: 0 });
  var finalBlockNumber = await web3.eth.getBlockNumber();

  // Calculate RGT distributed per RSPT during the 100-block period
  var rgtDistributed = getRgtDistributed(finalBlockNumber).sub(getRgtDistributed(initialBlockNumber));
  var totalStaked = await governanceTokenUniswapDistributorInstance.totalStaked.call();
  var rgtPerLpToken = rgtDistributed.mul(web3.utils.toBN(1e18)).div(totalStaked);
  return rgtPerLpToken;
}
