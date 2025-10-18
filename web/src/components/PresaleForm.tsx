import React, { useState } from 'react';
import { PRICE_PER_PORK } from '../utils/constants';

interface PresaleFormProps {
  account: `0x${string}` | null;
  buyTokens: (maticAmount: number) => Promise<void>;
}

const PresaleForm: React.FC<PresaleFormProps> = ({ account, buyTokens }) => {
  const [maticAmount, setMaticAmount] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleBuy = async () => {
    setIsLoading(true);
    try {
      await buyTokens(maticAmount);
    } finally {
      setIsLoading(false);
    }
  };

  if (!account) return null;

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
      <label htmlFor="matic-amount" className="block text-sm font-medium mb-2">MATIC Amount</label>
      <input
        id="matic-amount"
        type="number"
        value={maticAmount}
        onChange={(e) => {
          const value = Number(e.target.value);
          if (value >= 0.01) setMaticAmount(value);
        }}
        placeholder="Enter MATIC amount"
        className="w-full p-2 mb-4 rounded bg-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
        min="0.01"
        step="0.01"
        aria-describedby="matic-hint"
      />
      <p id="matic-hint" className="text-sm text-gray-300 mb-4">
        Buy {Math.floor(maticAmount / PRICE_PER_PORK).toLocaleString()} $PORK
      </p>
      <button
        onClick={handleBuy}
        disabled={isLoading}
        className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Processing...' : 'Buy $PORK'}
      </button>
    </div>
  );
};

export default PresaleForm;
