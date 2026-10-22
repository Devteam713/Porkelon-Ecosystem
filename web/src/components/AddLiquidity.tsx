import React, { useState } from 'react';
import Web3 from 'web3';
import { useWeb3 } from '../hooks/useWeb3';
import { ABI } from '../utils/constants';
import { AMOY_ADDRESSES } from '../contracts/addresses';

interface AddLiquidityProps {
  account: `0x${string}` | null;
  web3: Web3 | null;
  addLiquidity: (porkAmount: number, maticAmount: number) => Promise<void>;
}

const AddLiquidity: React.FC<AddLiquidityProps> = ({ account, web3, addLiquidity }) => {
  const { balance } = useWeb3();
  const [porkAmount, setPorkAmount] = useState<number>(0);
  const [maticAmount, setMaticAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleApprove = async () => {
    if (!web3 || !account || porkAmount <= 0) {
      alert('Invalid amount or wallet not connected.');
      return;
    }
    if (!AMOY_ADDRESSES.PorkelonToken || !AMOY_ADDRESSES.LiquidityMining) {
      alert('Contracts are not deployed yet.');
      return;
    }
    setIsLoading(true);
    try {
      const tokenContract = new web3.eth.Contract(ABI, AMOY_ADDRESSES.PorkelonToken);
      const data = tokenContract.methods
        .approve(AMOY_ADDRESSES.LiquidityMining, web3.utils.toWei(porkAmount.toString(), 'ether'))
        .encodeABI();
      await web3.eth.sendTransaction({
        from: account,
        to: AMOY_ADDRESSES.PorkelonToken,
        data,
      });
      alert('Approval successful! You can now add liquidity.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Approval failed.';
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLiquidity = async () => {
    if (porkAmount <= 0 || maticAmount <= 0) {
      alert('Amounts must be greater than 0.');
      return;
    }
    setIsLoading(true);
    try {
      await addLiquidity(porkAmount, maticAmount);
    } finally {
      setIsLoading(false);
    }
  };

  if (!account || !web3) {
    return <p className="text-center text-gray-300">Connect wallet to add liquidity.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-300">Your Balance: {balance.toLocaleString()} $PORK</p>
      <label htmlFor="pork-amount" className="block text-sm font-medium">
        $PORK Amount
      </label>
      <input
        id="pork-amount"
        type="number"
        value={porkAmount}
        onChange={(e) => {
          const value = Number(e.target.value);
          if (value >= 0) setPorkAmount(value);
        }}
        placeholder="Enter $PORK amount"
        className="w-full p-2 rounded bg-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
        min="0"
        step="1"
      />
      <label htmlFor="matic-amount-liq" className="block text-sm font-medium">
        MATIC Amount
      </label>
      <input
        id="matic-amount-liq"
        type="number"
        value={maticAmount}
        onChange={(e) => {
          const value = Number(e.target.value);
          if (value >= 0) setMaticAmount(value);
        }}
        placeholder="Enter MATIC amount"
        className="w-full p-2 rounded bg-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
        min="0"
        step="0.01"
      />
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleApprove}
          disabled={isLoading}
          className="w-full bg-yellow-600 hover:bg-yellow-700 py-2 rounded-lg font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Approving...' : 'Approve $PORK'}
        </button>
        <button
          onClick={handleAddLiquidity}
          disabled={isLoading}
          className="w-full bg-green-600 hover:bg-green-700 py-2 rounded-lg font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Adding...' : 'Add Liquidity'}
        </button>
      </div>
    </div>
  );
};

export default AddLiquidity;
