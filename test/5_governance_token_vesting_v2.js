// SPDX-License-Identifier: MIT
const RariGovernanceToken = artifacts.require("RariGovernanceToken");
const RariGovernanceTokenVestingV2 = artifacts.require("RariGovernanceTokenVestingV2");
const IERC20 = artifacts.require("IERC20");

const DISTRIBUTION_PERIOD = 86400 * 365 * 2.5;

function getRgtDistributed(timestamp, allocation) {
  var startTimestamp = parseInt(process.env.PRIVATE_VESTING_V2_START_TIMESTAMP);
  if (timestamp <= startTimestamp) return web3.utils.toBN(0);
  if (timestamp >= startTimestamp + DISTRIBUTION_PERIOD) return allocation;
  var seconds = timestamp - startTimestamp;
  return allocation.mul(web3.utils.toBN(seconds)).div(web3.utils.toBN(DISTRIBUTION_PERIOD));
}

contract("RariGovernanceTokenVestingV2", accounts => {
  it("should vest private token distributions", async () => {
    let governanceTokenInstance = await (parseInt(process.env.UPGRADE_FROM_LAST_VERSION) > 0 ? RariGovernanceToken.at(process.env.UPGRADE_GOVERNANCE_TOKEN_ADDRESS) : RariGovernanceToken.deployed());
    let governanceTokenVestingInstance = await RariGovernanceTokenVestingV2.deployed();

    // Set private RGT allocations
    var rgtAllocation = web3.utils.toBN(1e18);
    await governanceTokenVestingInstance.setPrivateRgtAllocation(process.env.DEVELOPMENT_ADDRESS, rgtAllocation);

    // Check unclaimed RGT
    var myUnclaimedRgt = await governanceTokenVestingInstance.getUnclaimedPrivateRgt.call(process.env.DEVELOPMENT_ADDRESS);
    var myEstimatedRgt = getRgtDistributed(Math.trunc((new Date()).getTime() / 1000), rgtAllocation);
    assert(myEstimatedRgt.gte(myUnclaimedRgt.muln(999).divn(1000)) && myEstimatedRgt.lte(myUnclaimedRgt.muln(1001).divn(1000)));

    // Claim one third of all available RGT
    var rgtToClaim = myUnclaimedRgt.divn(3);
    var initialRgt = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS);
    await governanceTokenVestingInstance.claimPrivateRgt(rgtToClaim, { from: process.env.DEVELOPMENT_ADDRESS });
    var rgtAfterClaim = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS);
    var myClaimedRgt = rgtAfterClaim.sub(initialRgt);
    assert(myClaimedRgt.eq(rgtToClaim));

    // Check unclaimed RGT
    var myEstimatedRgt = myUnclaimedRgt.sub(myClaimedRgt);
    var myUnclaimedRgt = await governanceTokenVestingInstance.getUnclaimedPrivateRgt.call(process.env.DEVELOPMENT_ADDRESS);
    assert(myEstimatedRgt.gte(myUnclaimedRgt.muln(999).divn(1000)) && myEstimatedRgt.lte(myUnclaimedRgt.muln(1001).divn(1000)));

    // Claim all RGT
    var initialRgt = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS);
    await governanceTokenVestingInstance.claimAllPrivateRgt({ from: process.env.DEVELOPMENT_ADDRESS });
    var rgtAfterClaim = await governanceTokenInstance.balanceOf.call(process.env.DEVELOPMENT_ADDRESS);
    var myClaimedRgt = rgtAfterClaim.sub(initialRgt);
    assert(myClaimedRgt.gte(myUnclaimedRgt.muln(999).divn(1000)) && myClaimedRgt.lte(myUnclaimedRgt.muln(1001).divn(1000)));
  });
});
