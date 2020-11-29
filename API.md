# Rari Governance: Smart Contract API

Welcome to the API docs for `RariGovernanceToken` and `RariGovernanceTokenDistributor`, the smart contracts behind the Rari Governance system.

* See [`USAGE.md`](USAGE.md) for instructions on common usage of the smart contracts' APIs.
* See [EIP-20: ERC-20 Token Standard](https://eips.ethereum.org/EIPS/eip-20) for reference on all common functions of ERC20 tokens like RSPT.
* Smart contract ABIs are available in the `abi` properties of the JSON files in the `build` folder.

*If you're using JavaScript, don't waste your time directly integrating our smart contracts: the [Rari JavaScript SDK](https://github.com/Rari-Capital/rari-sdk) makes programmatic deposits and withdrawals as easy as just one line of code!*

## **RGT (Rari Governance Token)**

See [EIP-20: ERC-20 Token Standard](https://eips.ethereum.org/EIPS/eip-20) for reference on all common functions of ERC20 tokens like RGT. Here are a few of the most common ones:

### `uint256 RariGovernanceToken.balanceOf(address account)`

Returns the amount of RGT owned by `account`.

* A user's RGT (Rari Governance Token) balance represents their **share of the voting power for the Rari Stable Pool, Yield Pool, and Ethereum Pool.**
    * During the liquidity mining period, RGT is distributed to Rari Stable Pool, Yield Pool, and Ethereum Pool users (i.e., RSPT, RYPT, and REPT holders) proportionally to their USD balances supplied to the pools (at a rate depending on the block number).
* Parameters:
    * `account` (address) - The account whose balance we are retrieving.

### `bool RariGovernanceToken.transfer(address recipient, uint256 amount)`

Transfers the specified `amount` of RGT to `recipient`.

* Parameters:
    * `recipient` (address): The recipient of the RGT.
    * `inputAmounts` (uint256[]): The amounts of tokens to be withdrawn and exchanged (including taker fees).
* Return value: Boolean indicating success.

### `bool RariGovernanceToken.approve(address spender, uint256 amount)`

Approve `sender` to spend the specified `amount` of RGT on behalf of `msg.sender`.

* As with the `approve` functions of other ERC20 contracts, beware that changing an allowance with this method brings the risk that someone may use both the old and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this race condition is to first reduce the spender's allowance to 0 and set the desired value afterwards: https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
* Parameters:
    * `spender` (address) - The account to which we are setting an allowance.
    * `amount` (uint256) - The amount of the allowance to be set.
* Return value: Boolean indicating success.

### `uint256 RariGovernanceToken.totalSupply()`

Returns the total supply of RGT (scaled by 1e18). The total supply should always be equal to 10,000,000 RGT.

## **Claiming RGT**

### `uint256 RariGovernanceTokenDistributor.claimRgt(uint256 amount)`

Claims `amount` unclaimed RGT earned by `msg.sender` via liquidity mining across all pools.

* Parameters:
    * `amount`: The amount of RGT to claim.

### `uint256 RariGovernanceTokenDistributor.claimAllRgt()`

Claims all unclaimed RGT earned by `msg.sender` via liquidity mining across all pools.

* Return value: The quantity of RGT claimed.

## **Get Unclaimed RGT**

### `uint256 RariGovernanceTokenDistributor.getUnclaimedRgt(address holder)`

Returns the quantity of unclaimed RGT earned by `holder` via liquidity mining across all pools.

* Parameters:
    * `holder` (address) - The holder of RSPT, RYPT, or REPT.
* Return value: The quantity of unclaimed RGT.

## **Claim Fees**

### `uint256 getPublicRgtClaimFee(uint256 blockNumber)`

Returns the public RGT claim fee for users during liquidity mining (scaled by 1e18) at `blockNumber`.

* Parameters:
    * `blockNumber` (uint256) - The block number to check.

## **Distribution Constants**

### `uint256 RariGovernanceTokenDistributor.distributionStartBlock()`

The starting block of the distribution period: `11094200`.

* In the starting block, no RGT has been distributed: RGT will be available starting after 1 block has passed and will be rewarded for every block that passes, including last block in the distribution period.

### `uint256 RariGovernanceTokenDistributor.distributionPeriod()`

The length of the distribution period in blocks: `390000`.

### `uint256 RariGovernanceTokenDistributor.distributionEndBlock()`

The final block of the distribution period: `11484200`.

### `uint256 RariGovernanceTokenDistributor.finalRgtDistribution()`

The total and final quantity of all RGT to be distributed by the end of the period: `8750000e18` (8,750,000 RGT times 10 to the power of 18).

## **Total RGT Distributed**

### `uint256 RariGovernanceTokenDistributor.getRgtDistributed(uint256 blockNumber)`

Returns the amount of RGT earned via liquidity mining at the given `blockNumber`.

* [See this graph for a visualization of RGT distributed via liquidity mining vs. blocks since distribution started.](https://www.desmos.com/calculator/zkmlmxcavc)

* Parameters:
    * `blockNumber` (uint256) - The block number to check.

## **Distribution Speeds**

### `RariGovernanceTokenDistributor.refreshDistributionSpeeds()`

Updates RGT distribution speeds for each pool.

* Warning: This function uses a large quantity of gas (1.5 million on average).

### `RariGovernanceTokenDistributor.refreshDistributionSpeeds(RariPool pools)`

Updates RGT distribution speeds for each pool given the `pool` whose balance should be refreshed.

* Warning: This function uses a large quantity of gas (around 500k on average).
* Parameters:
    * `pools` (RariGovernanceTokenDistributor.RariPool) - The pools whose balances should be refreshed.

### `uint256 RariGovernanceTokenDistributor.getEthUsdPrice()`

Returns the latest ETH/USD price (scaled by 1e8) from Chainlink used to calculate RGT distribution speeds.
