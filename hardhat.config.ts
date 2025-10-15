import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-ethers');
import "dotenv/config";

/**
 * Helper to normalize private keys from .env
 * Supports:
 * - PRIVATE_KEY="key"
 * - DEPLOYER_PRIVATE_KEY="key"
 * - PRIVATE_KEYS="key1,key2"
 */
function getAccounts(): string[] {
  const raw = process.env.PRIVATE_KEYS || process.env.PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
  if (!raw) return [];
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .map((k) => (k.startsWith("0x") ? k : `0x${k}`));
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  mocha: {
    timeout: 1_000_000,
  },

  typechain: {
    outDir: "typechain",
    target: "ethers-v6",
  },

  networks: {
    hardhat: {
      // customize if you need forking, chainId overrides, etc.
    },

    // Amoy (custom Polygon-based network)
    amoy: {
      url: process.env.AMOY_RPC || "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts: getAccounts(),
    },

  
    },

    // Polygon mainnet
    polygon: {
      url: process.env.POLYGON_RPC || "",
      chainId: 137,
      
    },
  },
};

export default config;
