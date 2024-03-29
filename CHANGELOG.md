# Changelog

## `v2.0.3` (contracts deployed 2021-10-21; all code pushed 2021-10-22)

* Added `RariGovernanceTokenVestingV3` for [on-chain proposal #6](https://www.withtally.com/governance/rari/proposal/6).

## `v2.0.2` (contracts deployed 2021-09-09; all code pushed 2021-10-22)

* Upgrade `RariGovernanceToken` to mint 2.5M additional RGT instead of 2.6M for [on-chain proposal #4](https://www.withtally.com/governance/rari/proposal/4).

## `v2.0.1` (contracts deployed 2021-08-18; all code pushed 2021-10-22)

* Added `RariGovernanceTokenVestingV2`.

## `v2.0.0` (contracts deployed 2021-07-20; all code pushed 2021-10-22)

* On-chain governance!

## `v1.4.1` (contracts deployed 2021-04-18; all code pushed 2021-10-22)

* Added `RariGovernanceToken.sweepLostFunds` function.

## `v1.4.0` (contracts deployed 2021-02-16; all code pushed 2021-10-22)

* Added minting of additional 10 million RGT.
* Added distributions of 750,000 RGT for the first year of liquidity mining.
* Added vesting of 7 million RGT.
* Added RGT distributions for the official ETH-RGT SushiSwap pair.
* Added RGT distributions for RGT liquidity providers on Loopring.

## `v1.3.0` (contracts deployed 2020-11-29; all code pushed 2020-11-29)

* Fixed RGT distribution equation in `RariGovernanceTokenDistributor`.

## `v1.2.0` (contracts deployed 2020-11-27; all code pushed 2020-11-29)

* Added private vesting schedules via `RariGovernanceTokenVesting`.

## `v1.1.0` (contracts deployed 2020-10-20; all code pushed 2020-11-29)

* Fixed ETH/USD price feed in `RariGovernanceTokenDistributor`.

## `v1.0.0` (contracts deployed 2020-10-20; all code pushed 2020-11-29)

* First version of the contracts:
    * Rari Governance Token (RGT).
    * Liquidity mining of RGT (proportional to USD balances in Rari Stable Pool, Yield Pool, and Ethereum Pool).
