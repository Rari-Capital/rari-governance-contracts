const fs = require("fs");
const HDWalletProvider = require("@truffle/hdwallet-provider");
require('dotenv').config();

if (process.env.DEVELOPMENT_POOL_CONTRACTS_FROM_ARTIFACTS) for (const [dir, managerKey, tokenKey] of [
  [process.env.DEVELOPMENT_POOL_STABLE_CONTRACTS_DIRECTORY, "POOL_STABLE_MANAGER_ADDRESS", "POOL_STABLE_TOKEN_ADDRESS"],
  [process.env.DEVELOPMENT_POOL_YIELD_CONTRACTS_DIRECTORY, "POOL_YIELD_MANAGER_ADDRESS", "POOL_YIELD_TOKEN_ADDRESS"],
  [process.env.DEVELOPMENT_POOL_ETHEREUM_CONTRACTS_DIRECTORY, "POOL_ETHEREUM_MANAGER_ADDRESS", "POOL_ETHEREUM_TOKEN_ADDRESS"]
]) if (dir) {
  if (fs.existsSync(dir + "/build/contracts/RariFundManager.json")) {
    var poolManager = require(dir + "/build/contracts/RariFundManager.json");
    if (poolManager && poolManager.networks["1"] && poolManager.networks["1"].address) process.env[managerKey] = poolManager.networks["1"].address;
  }

  if (fs.existsSync(dir + "/build/contracts/RariFundManager.json")) {
    var poolToken = require(dir + "/build/contracts/RariFundToken.json");
    if (poolToken && poolToken.networks["1"] && poolToken.networks["1"].address) process.env[tokenKey] = poolToken.networks["1"].address;
  }
}

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // for more about customizing your Truffle configuration!
  networks: {
    development: {
      host: "127.0.0.1",
      port: "8546",
      network_id: "*",
      gasPrice: 1e6,
      from: process.env.DEVELOPMENT_ADDRESS
    },
    live: {
      provider: function() {
        var keys = [process.env.LIVE_DEPLOYER_PRIVATE_KEY];
        if (process.env.LIVE_POOL_OWNER_PRIVATE_KEY) keys.push(process.env.LIVE_POOL_OWNER_PRIVATE_KEY);
        if (process.env.LIVE_UPGRADE_GOVERNANCE_OWNER_PRIVATE_KEY) keys.push(process.env.LIVE_UPGRADE_GOVERNANCE_OWNER_PRIVATE_KEY);
        return new HDWalletProvider(keys, process.env.LIVE_WEB3_PROVIDER_URL);
      },
      network_id: 1,
      gasPrice: parseInt(process.env.LIVE_GAS_PRICE),
      from: process.env.LIVE_DEPLOYER_ADDRESS
    }
  },
  compilers: {
    solc: {
      version: "0.5.17",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  }
};
