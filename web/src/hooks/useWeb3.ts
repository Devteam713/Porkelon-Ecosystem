import { useState, useEffect, useCallback } from 'react';
import Web3 from 'web3';
import { POLYGON_RPC, CHAIN_ID, PRESALE_CONTRACT, ABI } from '../utils/constants';

// Define types for Web3 and Ethereum provider
interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, callback: (accounts: string[]) => void) => void;
  removeListener: (event: string, callback: (accounts: string[]) => void) => void;
}

interface Web3Extended extends Web3 {
  eth: Web3['eth'] & {
    Contract: new (abi: typeof ABI, address: `0x${string}`) => {
      methods: {
        buyTokens: (amount: string) => { send: (options: { from: string; value: string }) => Promise<void> };
        totalRaised: () => { call: () => Promise<string> };
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
  error: string | null;
  connectWallet: () => Promise<void>;
  buyTokens: (maticAmount: number) => Promise<void>;
}

export const useWeb3 = (): Web3Hook => {
  const [web3, setWeb3] = useState<Web3Extended | null>(null);
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [raised, setRaised] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const goal = 25_000_000; // $25M

  // Type guard for Ethereum provider
  const isEthereumAvailable = (obj: unknown): obj is EthereumProvider =>
    !!obj && typeof obj === 'object' && 'request' in obj && 'on' in obj && 'removeListener' in obj;

  const initializeWeb3 = useCallback(async () => {
    if (!isEthereumAvailable(window.ethereum)) {
      setError('Ethereum provider not detected. Install MetaMask or Trust Wallet.');
      return;
    }

    try {
      const w3 = new Web3(window.ethereum || POLYGON_RPC) as Web3Extended;
      setWeb3(w3);

      // Request accounts
      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as `0x${string}`[];
      setAccount(accounts[0] || null);

      // Switch to correct chain
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
      });

      // Fetch live raised amount
      const contract = new w3.eth.Contract(ABI, PRESALE_CONTRACT);
      const totalRaised = await contract.methods.totalRaised().call();
      setRaised(Number(w3.utils.fromWei(totalRaised, 'ether')) * 0.00005); // Convert MATIC to USD (assuming 1 MATIC = $1 for simplicity)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Wallet connection failed.';
      setError(message);
      console.error('Initialization error:', err);
    }
  }, []);

  useEffect(() => {
    initializeWeb3();

    if (isEthereumAvailable(window.ethereum)) {
      const handleAccountsChanged = (accounts: string[]) =>
        setAccount(accounts[0] ? (accounts[0] as `0x${string}`) : null);

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, [initializeWeb3]);

  const connectWallet = useCallback(async () => {
    if (!isEthereumAvailable(window.ethereum)) {
      setError('Install MetaMask or Trust Wallet!');
      return;
    }

    try {
      setError(null);
      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as `0x${string}`[];
      setAccount(accounts[0] || null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet.';
      setError(message);
      alert('Failed to connect wallet. Try again.');
    }
  }, []);

  const buyTokens = useCallback(
    async (maticAmount: number) => {
      if (!web3 || !account) {
        setError('Connect wallet first!');
        return;
      }

      try {
        setError(null);
        const porkAmount = (maticAmount / 0.00005).toString(); // PRICE_PER_PORK
        const contract = new web3.eth.Contract(ABI, PRESALE_CONTRACT);
        await contract.methods.buyTokens(porkAmount).send({
          from: account,
          value: web3.utils.toWei(maticAmount.toString(), 'ether'),
        });
        // Update raised amount after purchase
        const totalRaised = await contract.methods.totalRaised().call();
        setRaised(Number(web3.utils.fromWei(totalRaised, 'ether')) * 0.00005);
        alert('Purchase successful! Check your wallet.');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Transaction failed.';
        setError(message);
        console.error('Purchase error:', err);
        alert('Transaction failed. Ensure sufficient MATIC.');
      }
    },
    [web3, account]
  );

  return { web3, account, raised, goal, error, connectWallet, buyTokens };
};
