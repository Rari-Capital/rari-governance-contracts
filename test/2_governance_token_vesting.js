// SPDX-License-Identifier: MIT
const RariGovernanceToken = artifacts.require("RariGovernanceToken");
const RariGovernanceTokenVesting = artifacts.require("RariGovernanceTokenVesting");
const IERC20 = artifacts.require("IERC20");

const PRIVATE_VESTING_PERIOD = 2 * 365 * 86400;

function getPrivateRgtClaimFee(timestamp) {
  var initialClaimFee = web3.utils.toBN(1e18);
  if (timestamp <= parseInt(process.env.PRIVATE_VESTING_START_TIMESTAMP)) return initialClaimFee;
  var privateVestingEndTimestamp = parseInt(process.env.PRIVATE_VESTING_START_TIMESTAMP) + PRIVATE_VESTING_PERIOD;
  if (timestamp >= privateVestingEndTimestamp) return web3.utils.toBN(0);
  return initialClaimFee.muln(privateVestingEndTimestamp - timestamp).divn(PRIVATE_VESTING_PERIOD);
}

contract("RariGovernanceTokenVesting", accounts => {
  it("should vest private token distributions", async () => {
    let governanceTokenInstance = await (parseInt(process.env.UPGRADE_FROM_LAST_VERSION) > 0 ? RariGovernanceToken.at(process.env.UPGRADE_GOVERNANCE_TOKEN_ADDRESS) : RariGovernanceToken.deployed());
    let governanceTokenVestingInstance = await (parseInt(process.env.UPGRADE_FROM_LAST_VERSION) > 0 ? RariGovernanceTokenVesting.at(process.env.UPGRADE_GOVERNANCE_TOKEN_VESTING_ADDRESS) : RariGovernanceTokenVesting.deployed());

    // Set private RGT allocations
    var rgtAllocation = web3.utils.toBN(1e18);
    await governanceTokenVestingInstance.setPrivateRgtAllocation(process.env.DEVELOPMENT_ADDRESS, rgtAllocation);
    var myUnclaimedRgt = await governanceTokenVestingInstance.getUnclaimedPrivateRgt.call(process.env.DEVELOPMENT_ADDRESS);
    assert(rgtAllocation.eq(myUnclaimedRgt));

    // Claim one third of all RGT
    var initialRgt = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS);
    await governanceTokenVestingInstance.claimPrivateRgt(rgtAllocation.divn(3), { from: process.env.DEVELOPMENT_ADDRESS });
    var rgtAfterClaim = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS);
    var myClaimedRgt = rgtAfterClaim.sub(initialRgt);
    var myEstimatedRgt = rgtAllocation.divn(3);
    var blockTimestamp = (await web3.eth.getBlock(await web3.eth.getBlockNumber())).timestamp;
    myEstimatedRgt.isub(myEstimatedRgt.mul(getPrivateRgtClaimFee(blockTimestamp)).div(web3.utils.toBN(1e18)));
    assert(myClaimedRgt.gte(myEstimatedRgt.muln(999999).divn(1000000)) && myClaimedRgt.lte(myEstimatedRgt.muln(1000001).divn(1000000)));

    // Check unclaimed RGT
    var myUnclaimedRgt = await governanceTokenVestingInstance.getUnclaimedPrivateRgt.call(process.env.DEVELOPMENT_ADDRESS);
    var myEstimatedRgt = rgtAllocation.sub(rgtAllocation.divn(3));
    assert(myUnclaimedRgt.eq(myEstimatedRgt));

    // Claim all RGT
    var initialRgt = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS);
    await governanceTokenVestingInstance.claimAllPrivateRgt({ from: process.env.DEVELOPMENT_ADDRESS });
    var rgtAfterClaim = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS);
    var myClaimedRgt = rgtAfterClaim.sub(initialRgt);
    var blockTimestamp = (await web3.eth.getBlock(await web3.eth.getBlockNumber())).timestamp;
    myEstimatedRgt.isub(myEstimatedRgt.mul(getPrivateRgtClaimFee(blockTimestamp)).div(web3.utils.toBN(1e18)));
    assert(myClaimedRgt.gte(myEstimatedRgt.muln(999999).divn(1000000)) && myClaimedRgt.lte(myEstimatedRgt.muln(1000001).divn(1000000)));
  });
});
