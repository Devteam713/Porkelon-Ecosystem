import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: { optimizer: { enabled: true, runs: 200 } }
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v6"
  },
  networks: {
    hardhat: {},
    mumbai: {
      url: process.env.MUMBAI_RPC || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    polygon: {
      url: process.env.POLYGON_RPC || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  }
};

export default config;
