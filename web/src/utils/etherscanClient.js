// src/utils/etherscanClient.js
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const BASE_URL = "https://api.etherscan.io/api";

/**
 * Core request wrapper
 */
async function etherscanRequest(params) {
  try {
    const response = await axios.get(BASE_URL, {
      params: { ...params, apikey: ETHERSCAN_API_KEY },
      timeout: 10000,
    });

    if (response.data.status === "0" && response.data.message !== "OK") {
      throw new Error(`Etherscan error: ${response.data.result}`);
    }

    return response.data.result;
  } catch (error) {
    console.error("Etherscan API Error:", error.message);
    throw error;
  }
}

/**
 * Get ETH balance for an address
 */
export async function getEthBalance(address) {
  return etherscanRequest({
    module: "account",
    action: "balance",
    address,
    tag: "latest",
  });
}

/**
 * Get multiple ETH balances
 */
export async function getMultiBalances(addresses = []) {
  return etherscanRequest({
    module: "account",
    action: "balancemulti",
    address: addresses.join(","),
    tag: "latest",
  });
}

/**
 * Get normal transaction history
 */
export async function getTxList(address, startBlock = 0, endBlock = 99999999, sort = "desc") {
  return etherscanRequest({
    module: "account",
    action: "txlist",
    address,
    startblock: startBlock,
    endblock: endBlock,
    sort,
  });
}

/**
 * Get ERC-20 token transfers
 */
export async function getTokenTransfers(address, startBlock = 0, endBlock = 99999999, sort = "desc") {
  return etherscanRequest({
    module: "account",
    action: "tokentx",
    address,
    startblock: startBlock,
    endblock: endBlock,
    sort,
  });
}

/**
 * Get NFT (ERC-721) transfers
 */
export async function getNFTTransfers(address, startBlock = 0, endBlock = 99999999, sort = "desc") {
  return etherscanRequest({
    module: "account",
    action: "tokennfttx",
    address,
    startblock: startBlock,
    endblock: endBlock,
    sort,
  });
}

/**
 * Get internal transactions
 */
export async function getInternalTxs(address, startBlock = 0, endBlock = 99999999, sort = "desc") {
  return etherscanRequest({
    module: "account",
    action: "txlistinternal",
    address,
    startblock: startBlock,
    endblock: endBlock,
    sort,
  });
}
