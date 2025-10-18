import React from 'react';
import { useWeb3 } from '../hooks/useWeb3';
// import { ConnectButton } from '@rainbow-me/rainbowkit';

interface WalletConnectProps {
  account: `0x${string}` | null;
  connectWallet: () => Promise<void>;
}

const WalletConnect: React.FC<WalletConnectProps> = ({ account, connectWallet }) => {
  const { balance } = useWeb3();

  if (account) {
    return (
      <div className="text-center mb-4">
        <p>Connected: {account.slice(0, 6)}...{account.slice(-4)}</p>
        <p className="text-sm text-gray-300">Balance: {balance.toLocaleString()} $PORK</p>
        {/* <ConnectButton /> */}
      </div>
    );
  }

  return (
    <div className="text-center mb-4">
      <button
        onClick={connectWallet}
        className="w-full max-w-md bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-semibold"
      >
        Connect Wallet (MetaMask/Trust)
      </button>
      {/* <ConnectButton /> */}
    </div>
  );
};

export default WalletConnect;
