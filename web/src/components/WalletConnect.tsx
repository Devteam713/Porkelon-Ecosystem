import React from 'react';
import { WalletStatus } from '../hooks/useWeb3';

interface WalletConnectProps {
  account: `0x${string}` | null;
  walletStatus: WalletStatus;
  connectWallet: () => Promise<void>;
  switchToBaseSepolia: () => Promise<void>;
}

const WalletConnect: React.FC<WalletConnectProps> = ({
  account,
  walletStatus,
  connectWallet,
  switchToBaseSepolia,
}) => {
  if (walletStatus === 'no-wallet') {
    return (
      <div className="text-center mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
        <p className="mb-3 text-gray-200">
          No Web3 wallet detected. Install MetaMask to join the Porkelon presale.
        </p>
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-orange-500 hover:bg-orange-600 px-6 py-3 rounded-lg font-semibold"
        >
          Install MetaMask
        </a>
      </div>
    );
  }

  if (walletStatus === 'wrong-network') {
    return (
      <div className="text-center mb-4 p-4 bg-yellow-500/10 rounded-lg border border-yellow-400/30">
        <p className="mb-3 text-yellow-200">
          You&apos;re on the wrong network. The presale runs on Base Sepolia (testnet).
        </p>
        <button
          onClick={switchToBaseSepolia}
          className="bg-yellow-600 hover:bg-yellow-700 px-6 py-3 rounded-lg font-semibold"
        >
          Switch to Base Sepolia
        </button>
      </div>
    );
  }

  if (account) {
    return (
      <div className="text-center mb-4">
        <p className="font-mono">
          Connected: {account.slice(0, 6)}...{account.slice(-4)}
        </p>
        <p className="text-sm text-gray-300">Base Sepolia testnet</p>
      </div>
    );
  }

  return (
    <div className="text-center mb-4">
      <button
        onClick={connectWallet}
        className="w-full max-w-md bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-semibold transition-colors"
      >
        Connect Wallet
      </button>
    </div>
  );
};

export default WalletConnect;
