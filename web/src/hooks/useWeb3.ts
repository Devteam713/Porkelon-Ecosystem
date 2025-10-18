import { useState, useEffect, useCallback } from 'react';
import Web3 from 'web3';
import { POLYGON_RPC, CHAIN_ID, PRESALE_CONTRACT, STAKING_CONTRACT, LIQUIDITY_CONTRACT, TOKEN_CONTRACT, ABI } from '../utils/constants';

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
        mint: (amount: string) => { send: (options: { from: string }) => Promise<void> };
        stake: (amount: string) => { send: (options: { from: string }) => Promise<void> };
        addLiquidity: (tokenAmount: string, maticAmount: string) => { send: (options: { from: string; value: string }) => Promise<void> };
        balanceOf: (account: string) => { call: () => Promise<string> };
        stakedBalance: (account: string) => { call: () => Promise<string> };
      };
    };
  };
}

interface Web3Hook {
  web3: Web3Extended | null;
  account: `0x${string}` | null;
  raised: number;
  goal: number;
  balance: number;
  stakedBalance: number;
  error: string | null;
  connectWallet: () => Promise<void>;
  buyTokens: (maticAmount: number) => Promise<void>;
  mintTokens: (amount: number) => Promise<void>;
  stakeTokens: (amount: number) => Promise<void>;
  addLiquidity: (porkAmount: number, maticAmount: number) => Promise<void>;
}

export const useWeb3 = (): Web3Hook => {
  const [web3, setWeb3] = useState<Web3Extended | null>(null);
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [raised, setRaised] = useState<number>(0);
  const [balance, setBalance] = useState<number>(0);
  const [stakedBalance, setStakedBalance] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const goal = 25_000_000;

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
      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as `0x${string}`[];
      setAccount(accounts[0] || null);
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
      });

      // Fetch presale data
      const presaleContract = new w3.eth.Contract(ABI, PRESALE_CONTRACT);
      const totalRaised = await presaleContract.methods.totalRaised().call();
      setRaised(Number(w3.utils.fromWei(totalRaised, 'ether')) * 0.00005);

      // Fetch token balance and staked balance
      if (accounts[0]) {
        const tokenContract = new w3.eth.Contract(ABI, TOKEN_CONTRACT);
        const stakingContract = new w3.eth.Contract(ABI, STAKING_CONTRACT);
        const balance = await tokenContract.methods.balanceOf(accounts[0]).call();
        const staked = await stakingContract.methods.stakedBalance(accounts[0]).call();
        setBalance(Number(w3.utils.fromWei(balance, 'ether')));
        setStakedBalance(Number(w3.utils.fromWei(staked, 'ether')));
      }
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
      if (web3 && accounts[0]) {
        const tokenContract = new web3.eth.Contract(ABI, TOKEN_CONTRACT);
        const stakingContract = new web3.eth.Contract(ABI, STAKING_CONTRACT);
        const balance = await tokenContract.methods.balanceOf(accounts[0]).call();
        const staked = await stakingContract.methods.stakedBalance(accounts[0]).call();
        setBalance(Number(web3.utils.fromWei(balance, 'ether')));
        setStakedBalance(Number(web3.utils.fromWei(staked, 'ether')));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet.';
      setError(message);
      alert('Failed to connect wallet. Try again.');
    }
  }, [web3]);

  const buyTokens = useCallback(
    async (maticAmount: number) => {
      if (!web3 || !account) {
        setError('Connect wallet first!');
        return;
      }
      if (maticAmount < 0.01) {
        setError('Minimum purchase is 0.01 MATIC.');
        return;
      }
      try {
        setError(null);
        const porkAmount = (maticAmount / 0.00005).toString();
        const contract = new web3.eth.Contract(ABI, PRESALE_CONTRACT);
        await contract.methods.buyTokens(porkAmount).send({
          from: account,
          value: web3.utils.toWei(maticAmount.toString(), 'ether'),
          gas: await contract.methods.buyTokens(porkAmount).estimateGas({ from: account, value: web3.utils.toWei(maticAmount.toString(), 'ether') }),
        });
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

  const mintTokens = useCallback(
    async (amount: number) => {
      if (!web3 || !account) {
        setError('Connect wallet first!');
        return;
      }
      if (amount <= 0) {
        setError('Mint amount must be greater than 0.');
        return;
      }
      try {
        setError(null);
        const tokenContract = new web3.eth.Contract(ABI, TOKEN_CONTRACT);
        await tokenContract.methods.mint(web3.utils.toWei(amount.toString(), 'ether')).send({
          from: account,
          gas: await tokenContract.methods.mint(web3.utils.toWei(amount.toString(), 'ether')).estimateGas({ from: account }),
        });
        const balance = await tokenContract.methods.balanceOf(account).call();
        setBalance(Number(web3.utils.fromWei(balance, 'ether')));
        alert('Mint successful! Check your wallet.');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Minting failed.';
        setError(message);
        console.error('Mint error:', err);
        alert('Minting failed. Ensure permissions and balance.');
      }
    },
    [web3, account]
  );

  const stakeTokens = useCallback(
    async (amount: number) => {
      if (!web3 || !account) {
        setError('Connect wallet first!');
        return;
      }
      if (amount <= 0) {
        setError('Stake amount must be greater than 0.');
        return;
      }
      try {
        setError(null);
        const stakingContract = new web3.eth.Contract(ABI, STAKING_CONTRACT);
        await stakingContract.methods.stake(web3.utils.toWei(amount.toString(), 'ether')).send({
          from: account,
          gas: await stakingContract.methods.stake(web3.utils.toWei(amount.toString(), 'ether')).estimateGas({ from: account }),
        });
        const staked = await stakingContract.methods.stakedBalance(account).call();
        setStakedBalance(Number(web3.utils.fromWei(staked, 'ether')));
        alert('Staking successful! Check your wallet.');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Staking failed.';
        setError(message);
        console.error('Stake error:', err);
        alert('Staking failed. Ensure sufficient $PORK.');
      }
    },
    [web3, account]
  );

  const addLiquidity = useCallback(
    async (porkAmount: number, maticAmount: number) => {
      if (!web3 || !account) {
        setError('Connect wallet first!');
        return;
      }
      if (porkAmount <= 0 || maticAmount <= 0) {
        setError('Amounts must be greater than 0.');
        return;
      }
      try {
        setError(null);
        const liquidityContract = new web3.eth.Contract(ABI, LIQUIDITY_CONTRACT);
        await liquidityContract.methods.addLiquidity(
          web3.utils.toWei(porkAmount.toString(), 'ether'),
          web3.utils.toWei(maticAmount.toString(), 'ether')
        ).send({
          from: account,
          value: web3.utils.toWei(maticAmount.toString(), 'ether'),
          gas: await liquidityContract.methods.addLiquidity(
            web3.utils.toWei(porkAmount.toString(), 'ether'),
            web3.utils.toWei(maticAmount.toString(), 'ether')
          ).estimateGas({ from: account, value: web3.utils.toWei(maticAmount.toString(), 'ether') }),
        });
        const balance = await new web3.eth.Contract(ABI, TOKEN_CONTRACT).methods.balanceOf(account).call();
        setBalance(Number(web3.utils.fromWei(balance, 'ether')));
        alert('Liquidity added successfully!');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Liquidity addition failed.';
        setError(message);
        console.error('Liquidity error:', err);
        alert('Liquidity addition failed. Ensure sufficient funds.');
      }
    },
    [web3, account]
  );

  return { web3, account, raised, goal, balance, stakedBalance, error, connectWallet, buyTokens, mintTokens, stakeTokens, addLiquidity };
};
