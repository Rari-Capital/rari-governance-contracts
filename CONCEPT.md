# Rari Governance: How it Works

This document explains how the Rari Governance protocol works under the hood. This information, along with information on the Rari pools, is also [available online](https://rari.capital/current.html).

## RGT (Rari Governance Token)

The Rari Governance Token (RGT) represents **shares of the voting power for the Rari Stable Pool, Yield Pool, and Ethereum Pool,** Rari Capital's three lending aggregators based on the Ethereum blockchain.

## Proposals & Voting

Anyone can create a new proposal or vote on existing proposals (using RGT) to modify or update the code behind the Rari Stable Pool, Yield Pool, Ethereum Pool, or the Rari Governance protocol itself at any time at [vote.rari.capital](https://vote.rari.capital/). Once the governance protocol is finished, proposals will be created, voted on, and executed completely on-chain.

## RGT Liquidity Mining

During the liquidity mining period of `390000` blocks (approximately 60 days), starting on block `11094200` (approximately October 20, 2020 at 10 AM PT), RGT is distributed to Rari Stable Pool, Yield Pool, and Ethereum Pool users (i.e., RSPT, RYPT, and REPT holders) proportionally to their USD balances supplied to the pools (at a rate depending on the block number). [See this graph for a visualization of RGT distributed via liquidity mining vs. blocks since distribution started.](https://www.desmos.com/calculator/2yvnflg4ir)

## Claiming RGT

During the **initial liquidity mining period**, RGT is constantly being distributed to Rari Stable Pool, Yield Pool, and Ethereum Pool holders. You may claim your earned RGT at any time. However, if you claim RGT before the liquidity mining period ends, you will be subject to a burn fee (beginnning at 33% at the start of liquidity mining and decreasing linearly to 0% once liquidity mining is over).

During the **special Uniswap liquidity mining period**, RGT is constantly being distributed to liquidity providers for the RGT/ETH Uniswap V2 Pair. There is no claim fee.

## Structure

The Rari Governance protocol is made up of 3 user-facing **smart contracts** in total (see [`DEPLOYED.md`](DEPLOYED.md) for deployed addresses):

* `RariGovernanceToken` is the contract behind the Rari Governance Token (RGT), an ERC20 token accounting for the ownership of Rari Stable Pool, Yield Pool, and Ethereum Pool.
* `RariGovernanceTokenDistributor` distributes RGT (Rari Governance Token) to Rari Stable Pool, Yield Pool, and Ethereum Pool holders.
* `RariGovernanceTokenUniswapDistributor` distributes RGT (Rari Governance Token) to liquidity providers for the RGT/ETH Uniswap V2 Pair.
* `RariGovernanceTokenVesting` distributes private RGT (Rari Governance Token) allocations to team/advisors/etc. with a vesting schedule.

## Security

Rari's Ethereum-based smart contracts are written in Solidity and audited by [Quantstamp](https://quantstamp.com/) (as well as various other partners) for security. Rari does not have control over your funds: instead, the Ethereum blockchain executes all secure code across its entire decentralized network (making it very difficult and extremely costly to rewrite history), and your funds are only withdrawable by you.

Please note that at the moment, smart contract upgrades are approved via a 3-of-5 multisig federation controlled by Rari's co-founders and partners. Upgrades are currently partially decentralized via an off-chain voting system available at [vote.rari.capital](https://vote.rari.capital/). Upgrades will become fully decentralized in the future once our on-chain governance protocol is finished.

Please note that using our web client online at [app.rari.capital](https://app.rari.capital) is not nearly as trustworthy as downloading, verifying, and using it offline.

## Risk

We have covered security above, but see [our website](https://rari.capital/risks.html) for more information on the risks associated with supplying funds to Rari.
