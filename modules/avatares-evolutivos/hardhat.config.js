require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL || "";
const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      url: sepoliaRpcUrl,
      accounts: deployerPrivateKey ? [deployerPrivateKey] : [],
    },
  },
};