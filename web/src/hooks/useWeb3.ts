import { useState, useEffect, useCallback } from 'react';
import Web3 from 'web3';
import {
  PRESALE_ABI,
  ERC20_ABI,
  BASE_SEPOLIA_RPC,
  USDC_DECIMALS,
  PORK_DECIMALS,
  PORK_PER_USDC,
} from '../utils/constants';
import {
  BASE_SEPOLIA_ADDRESSES,
  BASE_SEPOLIA_CHAIN_HEX,
  CONTRACTS_DEPLOYED,
} from '../contracts/addresses';

// --- Ethereum provider types ---
interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, callback: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, callback: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export type WalletStatus =
  | 'unknown'
  | 'no-wallet'
  | 'wrong-network'
  | 'ready'
  | 'error';

export interface PresaleState {
  open: boolean;
  totalCollectedUsdc: number;
  hardcapUsdc: number;
  remainingCapUsdc: number;
  claimablePork: number;
  contributedUsdc: number;
  usdcBalance: number;
}

export interface Web3Hook {
  web3: Web3 | null;
  account: `0x${string}` | null;
  walletStatus: WalletStatus;
  contractsDeployed: boolean;
  presale: PresaleState;
  error: string | null;
  connectWallet: () => Promise<void>;
  switchToBaseSepolia: () => Promise<void>;
  buyTokens: (usdcAmount: number) => Promise<void>;
  claimTokens: () => Promise<void>;
  refreshPresale: () => Promise<void>;
}

const initialPresale: PresaleState = {
  open: false,
  totalCollectedUsdc: 0,
  hardcapUsdc: 50000,
  remainingCapUsdc: 50000,
  claimablePork: 0,
  contributedUsdc: 0,
  usdcBalance: 0,
};

function getProvider(): EthereumProvider | null {
  return typeof window !== 'undefined' && window.ethereum ? window.ethereum : null;
}

export const useWeb3 = (): Web3Hook => {
  const [web3, setWeb3] = useState<Web3 | null>(null);
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [walletStatus, setWalletStatus] = useState<WalletStatus>('unknown');
  const [presale, setPresale] = useState<PresaleState>(initialPresale);
  const [error, setError] = useState<string | null>(null);

  const contractsDeployed = CONTRACTS_DEPLOYED;
  const presaleAddress = BASE_SEPOLIA_ADDRESSES.PresaleEngine;
  const usdcAddress = BASE_SEPOLIA_ADDRESSES.MockUSDC;

  const checkNetwork = useCallback(async (provider: EthereumProvider): Promise<boolean> => {
    try {
      const chainId = (await provider.request({ method: 'eth_chainId' })) as string;
      if (chainId?.toLowerCase() === BASE_SEPOLIA_CHAIN_HEX.toLowerCase()) return true;
      setWalletStatus('wrong-network');
      return false;
    } catch {
      return false;
    }
  }, []);

  const switchToBaseSepolia = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      setWalletStatus('no-wallet');
      setError('No wallet found. Install MetaMask to continue.');
      return;
    }
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_SEPOLIA_CHAIN_HEX }],
      });
      setWalletStatus('ready');
      setError(null);
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 4902) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: BASE_SEPOLIA_CHAIN_HEX,
                chainName: 'Base Sepolia',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: [BASE_SEPOLIA_RPC],
                blockExplorerUrls: ['https://sepolia.basescan.org'],
              },
            ],
          });
          setWalletStatus('ready');
          setError(null);
        } catch (addErr: unknown) {
          setError(addErr instanceof Error ? addErr.message : 'Failed to add Base Sepolia.');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to switch network.');
      }
    }
  }, []);

  const refreshPresale = useCallback(async () => {
    if (!contractsDeployed || !presaleAddress || !usdcAddress) return;
    try {
      const w3 = new Web3(BASE_SEPOLIA_RPC);
      const engine = new w3.eth.Contract(PRESALE_ABI, presaleAddress);
      const usdc = new w3.eth.Contract(ERC20_ABI, usdcAddress);

      const [open, collected, hardcap, remaining] = await Promise.all([
        engine.methods.presaleOpen().call() as Promise<boolean>,
        engine.methods.totalCollected().call() as Promise<bigint>,
        engine.methods.HARDCAP().call() as Promise<bigint>,
        engine.methods.getRemainingCap().call() as Promise<bigint>,
      ]);

      let claimablePork = 0;
      let contributedUsdc = 0;
      let usdcBalance = 0;
      if (account) {
        const [claimable, contributed, bal] = await Promise.all([
          engine.methods.claimableTokens(account).call() as Promise<bigint>,
          engine.methods.contributions(account).call() as Promise<bigint>,
          usdc.methods.balanceOf(account).call() as Promise<bigint>,
        ]);
        claimablePork = Number(w3.utils.fromWei(claimable, PORK_DECIMALS));
        contributedUsdc = Number(contributed) / 10 ** USDC_DECIMALS;
        usdcBalance = Number(bal) / 10 ** USDC_DECIMALS;
      }

      setPresale({
        open,
        totalCollectedUsdc: Number(collected) / 10 ** USDC_DECIMALS,
        hardcapUsdc: Number(hardcap) / 10 ** USDC_DECIMALS,
        remainingCapUsdc: Number(remaining) / 10 ** USDC_DECIMALS,
        claimablePork,
        contributedUsdc,
        usdcBalance,
      });
    } catch (e) {
      console.error('Presale refresh failed:', e);
    }
  }, [account, contractsDeployed, presaleAddress, usdcAddress]);

  const connectWallet = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      setWalletStatus('no-wallet');
      setError('No wallet found. Install MetaMask or another Web3 wallet to continue.');
      return;
    }
    try {
      setError(null);
      const w3 = new Web3(provider as never);
      setWeb3(w3);
      const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as `0x${string}`[];
      setAccount(accounts[0] || null);
      const onCorrect = await checkNetwork(provider);
      setWalletStatus(onCorrect ? 'ready' : 'wrong-network');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet.');
      setWalletStatus('error');
    }
  }, [checkNetwork]);

  useEffect(() => {
    if (!getProvider()) setWalletStatus('no-wallet');
  }, []);

  useEffect(() => {
    refreshPresale();
  }, [refreshPresale]);

  useEffect(() => {
    const provider = getProvider();
    if (!provider?.on || !provider?.removeListener) return;
    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setAccount(accounts?.[0] ? (accounts[0] as `0x${string}`) : null);
    };
    const handleChainChanged = () => {
      checkNetwork(provider).then((ok) => setWalletStatus(ok ? 'ready' : 'wrong-network'));
    };
    provider.on('accountsChanged', handleAccountsChanged);
    provider.on('chainChanged', handleChainChanged);
    return () => {
      provider.removeListener?.('accountsChanged', handleAccountsChanged);
      provider.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [checkNetwork]);

  const requireReady = (): Web3 | null => {
    if (!contractsDeployed || !presaleAddress || !usdcAddress) {
      setError('Presale contracts are not configured yet.');
      return null;
    }
    if (!web3 || !account) {
      setError('Connect your wallet first.');
      return null;
    }
    if (walletStatus !== 'ready') {
      setError('Please switch to Base Sepolia.');
      return null;
    }
    return web3;
  };

  /** Approve USDC to the engine if needed, then buy PORK. */
  const buyTokens = useCallback(
    async (usdcAmount: number) => {
      const w3 = requireReady();
      if (!w3 || !account || !presaleAddress || !usdcAddress) return;
      if (usdcAmount <= 0) {
        setError('Enter an amount greater than 0.');
        return;
      }
      try {
        setError(null);
        const amountBase = BigInt(Math.floor(usdcAmount * 10 ** USDC_DECIMALS));
        const usdc = new w3.eth.Contract(ERC20_ABI, usdcAddress);
        const engine = new w3.eth.Contract(PRESALE_ABI, presaleAddress);

        const allowance = (await usdc.methods.allowance(account, presaleAddress).call()) as bigint;
        if (allowance < amountBase) {
          const approveData = usdc.methods.approve(presaleAddress, amountBase.toString()).encodeABI();
          await w3.eth.sendTransaction({ from: account, to: usdcAddress, data: approveData });
        }

        const buyData = engine.methods.buyTokens(account, amountBase.toString()).encodeABI();
        await w3.eth.sendTransaction({ from: account, to: presaleAddress, data: buyData });
        await refreshPresale();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Purchase failed.');
        console.error('Buy error:', err);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [web3, account, walletStatus, presaleAddress, usdcAddress]
  );

  const claimTokens = useCallback(async () => {
    const w3 = requireReady();
    if (!w3 || !account || !presaleAddress) return;
    try {
      setError(null);
      const engine = new w3.eth.Contract(PRESALE_ABI, presaleAddress);
      const data = engine.methods.claimTokens().encodeABI();
      await w3.eth.sendTransaction({ from: account, to: presaleAddress, data });
      await refreshPresale();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Claim failed.');
      console.error('Claim error:', err);
    }
  }, [web3, account, walletStatus, presaleAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    web3,
    account,
    walletStatus,
    contractsDeployed,
    presale,
    error,
    connectWallet,
    switchToBaseSepolia,
    buyTokens,
    claimTokens,
    refreshPresale,
  };
};

export { PORK_PER_USDC };
