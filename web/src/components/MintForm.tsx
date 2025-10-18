import React, { useState } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { Web3Extended } from '../hooks/useWeb3';

interface MintFormProps {
  account: `0x${string}` | null;
  web3: Web3Extended | null;
  mintTokens: (amount: number) => Promise<void>;
}

const MintForm: React.FC<MintFormProps> = ({ account, web3, mintTokens }) => {
  const { balance } = useWeb3();
  const [amount, setAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleMint = async () => {
    if (amount <= 0) {
      alert('Amount must be greater than 0.');
      return;
    }
    setIsLoading(true);
    try {
      await mintTokens(amount);
    } finally {
      setIsLoading(false);
    }
  };

  if (!account || !web3) {
    return <p className="text-center text-gray-300">Connect wallet to mint $PORK.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-300">Your Balance: {balance.toLocaleString()} $PORK</p>
      <label htmlFor="mint-amount" className="block text-sm font-medium">Mint Amount ($PORK)</label>
      <input
        id="mint-amount"
        type="number"
        value={amount}
        onChange={(e) => {
          const value = Number(e.target.value);
          if (value >= 0) setAmount(value);
        }}
        placeholder="Enter $PORK amount"
        className="w-full p-2 rounded bg-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
        min="0"
        step="1"
      />
      <button
        onClick={handleMint}
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Minting...' : 'Mint $PORK'}
      </button>
    </div>
  );
};

export default MintForm;
