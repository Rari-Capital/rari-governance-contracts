/**
 * COPYRIGHT © 2020 RARI CAPITAL, INC. ALL RIGHTS RESERVED.
 * Anyone is free to integrate the public (i.e., non-administrative) application programming interfaces (APIs) of the official Ethereum smart contract instances deployed by Rari Capital, Inc. in any application (commercial or noncommercial and under any license), provided that the application does not abuse the APIs or act against the interests of Rari Capital, Inc.
 * Anyone is free to study, review, and analyze the source code contained in this package.
 * Reuse (including deployment of smart contracts other than private testing on a private network), modification, redistribution, or sublicensing of any source code contained in this package is not permitted without the explicit permission of David Lucid of Rari Capital, Inc.
 * No one is permitted to use the software for any purpose other than those allowed by this license.
 * This license is liable to change at any time at the sole discretion of David Lucid of Rari Capital, Inc.
 */

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
    console.log(myUnclaimedRgt.toString(), myEstimatedRgt.toString());
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
