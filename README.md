# Rari Governance: Smart Contracts

Welcome to `rari-governance-contracts`, the central repository for the Solidity source code behind Rari Governance's Ethereum-based smart contracts (with automated tests) and documentation.

## How it works

The Rari Governance Token (RGT) represents **shares of the voting power for the [Rari Stable Pool], Yield Pool, and Ethereum Pool,** Rari Capital's three lending aggregators based on the Ethereum blockchain. During the liquidity mining period, RGT is distributed to Rari Stable Pool, Yield Pool, and Ethereum Pool users (i.e., RSPT, RYPT, and REPT holders) proportionally to their USD balances supplied to the pools (at a rate depending on the block number). This information, along with information on the Rari pools, is also [available online](https://rari.capital/current.html). Find out more about Rari Capital at [rari.capital](https://rari.capital).

## Contract usage

Documentation on common usage of the contracts is available in [`USAGE.md`](USAGE.md). Detailed API documentation for our smart contracts' public methods is available in [`API.md`](API.md). Smart contract ABIs are available in the `abi` properties of the JSON files in the `build` folder. For easy implementation, see the [Rari JavaScript SDK](https://github.com/Rari-Capital/rari-sdk).

## Installation (for development and deployment)

We, as well as others, had success using Truffle on Node.js `v12.18.2` with the latest version of NPM.

To install the latest version of Truffle: `npm install -g truffle`

*Though the latest version of Truffle should work, to compile, deploy, and test our contracts, we used Truffle `v5.1.45` (which should use `solc` version `0.5.17+commit.d19bba13.Emscripten.clang` and Web3.js `v1.2.1`).*

To install all our dependencies: `npm install`

## Compiling the contracts

`npm run compile`

## Testing the contracts

Make sure to configure the following `.env` variables:

    DISTRIBUTION_START_BLOCK=11094200

To test liquidity mining via an existing Rari Stable Pool `v2.1.0`, Yield Pool `v1.0.0`, and Ethereum Pool `v1.0.0`, the following `.env` variables must be configured:

    POOL_OWNER=0x10dB6Bce3F2AE1589ec91A872213DAE59697967a
    POOL_STABLE_MANAGER_ADDRESS=
    POOL_STABLE_TOKEN_ADDRESS=
    POOL_YIELD_MANAGER_ADDRESS=
    POOL_YIELD_TOKEN_ADDRESS=
    POOL_ETHEREUM_MANAGER_ADDRESS=
    POOL_ETHEREUM_TOKEN_ADDRESS=

In `.env`, set `DEVELOPMENT_ADDRESS=0x45D54B22582c79c8Fb8f4c4F2663ef54944f397a` to test deployment and also set `DEVELOPMENT_ADDRESS_SECONDARY=0x1Eeb75CFad36EDb6C996f7809f30952B0CA0B5B9` to run automated tests.

To test the contracts, first fork the Ethereum mainnet. Begin by configuring `DEVELOPMENT_WEB3_PROVIDER_URL_TO_BE_FORKED` in `.env` (set to any mainnet Web3 HTTP provider JSON-RPC URL; we use a local `geth` instance, specifically a light client started with `geth --syncmode light --rpc --rpcapi eth,web3,debug,net`; Infura works too, but beware of latency and rate limiting). To start the fork, run `npm run ganache`. *If you would like to change the port, make sure to configure `scripts/ganache.js`, `scripts/test.sh`, `scripts/migrate-dev.sh`, and the `development` network in `truffle-config.js`.* Note that you will likely have to regularly restart your fork, especially when forking from a node without archive data or when using live 0x API responses to make currency exchanges.

To deploy the contracts to your private mainnet fork, run `truffle migrate --network development --skip-dry-run --reset`. Alternatively, `npm run migrate-dev` will run Ganache and migrate the contracts in the same command.

To run automated tests on the contracts on your private mainnet fork, run `npm test` (which runs Ganache in the background for you).

As an alterative to manually configuring existing pool manager and token addresses, `npm test` and `npm migrate-dev` can automatically run Ganache and deploy the Rari Stable Pool, Yield Pool, and/or Ethereum Pool to the `development` network (and configure the pool manager and token addresses environment variables) before deploying Rari Governance if the following variables in `.env` are set: `DEVELOPMENT_POOL_STABLE_CONTRACTS_DIRECTORY`, `DEVELOPMENT_POOL_STABLE_CONTRACTS_DIRECTORY`, and/or `DEVELOPMENT_POOL_STABLE_CONTRACTS_DIRECTORY`.

## Live deployment

Make sure to configure the following `.env` variables:

    DISTRIBUTION_START_BLOCK=11094200

The following `.env` variables must be configured for liquidity mining via the existing Rari Stable Pool `v2.1.0`, Yield Pool `v1.0.0`, and Ethereum Pool `v1.0.0`:

    POOL_OWNER=0x10dB6Bce3F2AE1589ec91A872213DAE59697967a
    POOL_STABLE_MANAGER_ADDRESS=
    POOL_STABLE_TOKEN_ADDRESS=
    POOL_YIELD_MANAGER_ADDRESS=
    POOL_YIELD_TOKEN_ADDRESS=
    POOL_ETHEREUM_MANAGER_ADDRESS=
    POOL_ETHEREUM_TOKEN_ADDRESS=

In `.env`, configure `LIVE_DEPLOYER_ADDRESS`, `LIVE_DEPLOYER_PRIVATE_KEY`, `LIVE_WEB3_PROVIDER_URL`, `LIVE_GAS_PRICE` (ideally, use the "fast" price listed by [ETH Gas Station](https://www.ethgasstation.info/)), `LIVE_GOVERNANCE_OWNER`, and `LIVE_POOL_OWNER_PRIVATE_KEY` to deploy to the mainnet.

Then, migrate: `truffle migrate --network live`

## License

See `LICENSE`.

## Credits

Rari Capital's smart contracts are developed by [David Lucid](https://github.com/davidlucid). Find out more about Rari Capital at [rari.capital](https://rari.capital).
