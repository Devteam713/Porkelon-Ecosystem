import { useState, useEffect, useCallback } from 'react';
import Web3 from 'web3';
import { POLYGON_RPC, CHAIN_ID, PRESALE_CONTRACT, ABI, PRICE_PER_PORK } from '../utils/constants';

// Define types for Web3 and Ethereum provider
interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, callback: (accounts: string[]) => void) => void;
}

interface Web3Extended extends Web3 {
  eth: Web3['eth'] & {
    Contract: new (abi: typeof ABI, address: `0x${string}`) => {
      methods: {
        buyTokens: (amount: string) => { send: (options: { from: string; value: string }) => Promise<void> };
      };
    };
  };
}

// Hook return type
interface Web3Hook {
  web3: Web3Extended | null;
  account: `0x${string}` | null;
  raised: number;
  goal: number;
  connectWallet: () => Promise<void>;
  buyTokens: (maticAmount: number) => Promise<void>;
}

export const useWeb3 = (): Web3Hook => {
  const [web3, setWeb3] = useState<Web3Extended | null>(null);
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [raised, setRaised] = useState<number>(0);
  const goal = 25_000_000; // $25M

  // Type guard for Ethereum provider
  const isEthereumAvailable = (obj: unknown): obj is EthereumProvider =>
    !!obj && typeof obj === 'object' && 'request' in obj && 'on' in obj;

  const initializeWeb3 = useCallback(async () => {
    if (isEthereumAvailable(window.ethereum)) {
      const w3 = new Web3(window.ethereum || POLYGON_RPC) as Web3Extended;
      setWeb3(w3);
      try {
        const accounts = (await window.ethereum.request({
          method: 'eth_requestAccounts',
        })) as `0x${string}`[];
        setAccount(accounts[0] || null);
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
        });
        // Simulate progress (replace with contract call for live data)
        let start = 0;
        const increment = goal / 100;
        const timer = setInterval(() => {
          start += increment;
          setRaised(Math.min(start, goal * 0.1)); // Simulate 10% raised
          if (start >= goal * 0.1) clearInterval(timer);
        }, 50);
      } catch (error) {
        console.error('Wallet connection failed:', error);
      }
    }
  }, []);

  useEffect(() => {
    initializeWeb3();
    if (isEthereumAvailable(window.ethereum)) {
      window.ethereum.on('accountsChanged', (accounts: string[]) =>
        setAccount(accounts[0] ? (accounts[0] as `0x${string}`) : null)
      );
      return () => {
        window.ethereum?.removeListener('accountsChanged', () => {});
      };
    }
  }, [initializeWeb3]);

  const connectWallet = useCallback(async () => {
    if (!isEthereumAvailable(window.ethereum)) {
      alert('Install MetaMask or Trust Wallet!');
      return;
    }
    try {
      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as `0x${string}`[];
      setAccount(accounts[0] || null);
    } catch (error) {
      alert('Failed to connect wallet. Try again.');
    }
  }, []);

  const buyTokens = useCallback(
    async (maticAmount: number) => {
      if (!web3 || !account) {
        alert('Connect wallet first!');
        return;
      }
      const porkAmount = (maticAmount / PRICE_PER_PORK).toString();
      const contract = new web3.eth.Contract(ABI, PRESALE_CONTRACT);
      try {
        await contract.methods.buyTokens(porkAmount).send({
          from: account,
          value: web3.utils.toWei(maticAmount.toString(), 'ether'),
        });
        alert('Purchase successful! Check your wallet.');
      } catch (error) {
        console.error('Purchase failed:', error);
        alert('Transaction failed. Ensure sufficient MATIC.');
      }
    },
    [web3, account]
  );

  return { web3, account, raised, goal, connectWallet, buyTokens };
};
