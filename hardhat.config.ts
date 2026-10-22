import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import "@openzeppelin/hardhat-upgrades";
import "dotenv/config";

/**
 * Helper to normalize private keys from .env
 * Supports:
 * - PRIVATE_KEY="key"
 * - DEPLOYER_PRIVATE_KEY="key"
 * - PRIVATE_KEYS="key1,key2"
 */
function getAccounts(): string[] {
  const raw =
    process.env.PRIVATE_KEYS ||
    process.env.PRIVATE_KEY ||
    process.env.DEPLOYER_PRIVATE_KEY;
  if (!raw) return [];
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .map((k) => (k.startsWith("0x") ? k : `0x${k}`));
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
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
    hardhat: {},

    // Polygon Amoy testnet
    amoy: {
      url: process.env.AMOY_RPC || "https://api.zan.top/polygon-amoy",
      chainId: 80002,
      accounts: getAccounts(),
    },

    // Base Sepolia testnet
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org",
      chainId: 84532,
      accounts: getAccounts(),
    },

    // Polygon mainnet
    polygon: {
      url: process.env.POLYGON_RPC || "",
      chainId: 137,
      accounts: getAccounts(),
    },
  },

  etherscan: {
    apiKey: {
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      baseSepolia: process.env.ETHERSCAN_API_KEY || process.env.POLYGONSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "polygonAmoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com",
        },
      },
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },
};

export default config;
