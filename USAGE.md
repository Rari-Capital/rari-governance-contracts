# Rari Governance: How to Use the Smart Contracts

The following document contains instructions on common usage of the Rari Governance smart contracts' APIs.

* See [`API.md`](API.md) for a more detailed API reference on `RariGovernanceToken` and `RariGovernanceTokenDistributor`.
* See [EIP-20: ERC-20 Token Standard](https://eips.ethereum.org/EIPS/eip-20) for reference on all common functions of ERC20 tokens like RSPT.
* Smart contract ABIs are available in the `abi` properties of the JSON files in the `build` folder.

*If you're using JavaScript, check out the [Rari JavaScript SDK](https://github.com/Rari-Capital/rari-sdk)!*

## **RGT (Rari Governance Token)**

* Your RGT (Rari Governance Token) balance represents **your share of the voting power for the Rari Stable Pool, Yield Pool, and Ethereum Pool.**
    * During the liquidity mining period, RGT is distributed to Rari Stable Pool, Yield Pool, and Ethereum Pool users (i.e., RSPT, RYPT, and REPT holders) proportionally to their USD balances supplied to the pools (at a rate depending on the block number).
* **Get my RGT balance:** `uint256 RariGovernanceToken.balanceOf(address account)` returns the amount of RGT owned by `account`.
* **Transfer RGT:** `bool RariGovernanceToken.transfer(address recipient, uint256 amount)` transfers `amount` RGT to `recipient` (as with other ERC20 tokens like RGT).
* **Approve RGT:** `bool RariGovernanceToken.approve(address spender, uint256 amount)` approves `spender` to spend the specified `amount` of RGT on behalf of `msg.sender`.
    * As with the `approve` functions of other ERC20 contracts, beware that changing an allowance with this method brings the risk that someone may use both the old and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this race condition is to first reduce the spender's allowance to 0 and set the desired value afterwards: https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
* See [EIP-20: ERC-20 Token Standard](https://eips.ethereum.org/EIPS/eip-20) for reference on all common functions of ERC20 tokens like RGT.

## **Claiming RGT**

* **Claim unclaimed RGT:** `uint256 RariGovernanceTokenDistributor.claimRgt(address holder, uint256 amount)` claims `amount` unclaimed RGT earned by `holder`.
* **Claim all unclaimed RGT:** `uint256 RariGovernanceTokenDistributor.claimAllRgt(address holder)` claims all unclaimed RGT earned by `holder` (and returns the quantity of RGT claimed).

## **Get Unclaimed RGT**

* **Get all unclaimed RGT:** `uint256 RariGovernanceTokenDistributor.getUnclaimedRgt(address holder)` returns the quantity of unclaimed RGT earned by `holder`.

## **Claim Fees**

* **Get RGT claim fee:** `uint256 RariGovernanceTokenDistributor.getPublicRgtClaimFee(uint256 blockNumber)` returns the public RGT claim fee for users during liquidity mining (scaled by 1e18) at `blockNumber`.

## **Distribution Constants**

* **Distribution start block number:** `uint256 RariGovernanceTokenDistributor.distributionStartBlock()` returns `11094200`.
* **Distribution period length:** `uint256 RariGovernanceTokenDistributor.DISTRIBUTION_PERIOD()` returns `390000`.
* **Distribution end block number:** `uint256 RariGovernanceTokenDistributor.distributionEndBlock()` returns `11484200`.
* **Total RGT (to be) distributed via liquidity mining:** `uint256 RariGovernanceTokenDistributor.FINAL_RGT_DISTRIBUTION()` returns `8750000e18`.

## **Total RGT Distributed**

* **Get total RGT distributed:** `uint256 RariGovernanceTokenDistributor.getRgtDistributed(uint256 blockNumber)` returns the amount of RGT earned via liquidity mining at the given `blockNumber`.
    * [See this graph for a visualization of RGT distributed via liquidity mining vs. blocks since distribution started.](https://www.desmos.com/calculator/2yvnflg4ir)

## **Refresh Distribution Speeds**

* Refresh all distribution speeds: `RariGovernanceTokenDistributor.refreshDistributionSpeeds()` updates RGT distribution speeds for each pool.
    * Warning: This function uses a large quantity of gas (around 1.5 million on average).
* Refresh one pool's distribution speeds: `RariGovernanceTokenDistributor.refreshDistributionSpeeds(RariPool pool)` updates RGT distribution speeds for each pool given the `pool` whose balance should be refreshed.
    * Warning: This function uses a large quantity of gas (around 500k on average).
