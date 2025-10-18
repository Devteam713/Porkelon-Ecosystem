import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { Web3Extended } from '../hooks/useWeb3';
import { TOKEN_CONTRACT, STAKING_CONTRACT } from '../utils/constants';

interface StakeWidgetProps {
  account: `0x${string}` | null;
  web3: Web3Extended | null;
  stakeTokens: (amount: number) => Promise<void>;
}

const StakeWidget: React.FC<StakeWidgetProps> = ({ account, web3, stakeTokens }) => {
  const { balance, stakedBalance } = useWeb3();
  const [amount, setAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pendingRewards, setPendingRewards] = useState<number>(0);

  useEffect(() => {
    const fetchRewards = async () => {
      if (web3 && account) {
        const stakingContract = new web3.eth.Contract(ABI, STAKING_CONTRACT);
        const rewards = await stakingContract.methods.getPendingRewards(account).call();
        setPendingRewards(Number(web3.utils.fromWei(rewards, 'ether')));
      }
    };
    fetchRewards();
    const interval = setInterval(fetchRewards, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [web3, account]);

  const handleApprove = async () => {
    if (!web3 || !account || amount <= 0) {
      alert('Invalid amount or wallet not connected.');
      return;
    }
    setIsLoading(true);
    try {
      const tokenContract = new web3.eth.Contract(ABI, TOKEN_CONTRACT);
      await tokenContract.methods.approve(STAKING_CONTRACT, web3.utils.toWei(amount.toString(), 'ether')).send({
        from: account,
        gas: await tokenContract.methods.approve(STAKING_CONTRACT, web3.utils.toWei(amount.toString(), 'ether')).estimateGas({ from: account }),
      });
      alert('Approval successful! You can now stake.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Approval failed.';
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStake = async () => {
    if (amount <= 0) {
      alert('Amount must be greater than 0.');
      return;
    }
    setIsLoading(true);
    try {
      await stakeTokens(amount);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!web3 || !account) {
      alert('Connect wallet first!');
      return;
    }
    setIsLoading(true);
    try {
      const stakingContract = new web3.eth.Contract(ABI, STAKING_CONTRACT);
      await stakingContract.methods.claimRewards().send({
        from: account,
        gas: await stakingContract.methods.claimRewards().estimateGas({ from: account }),
      });
      alert('Rewards claimed successfully!');
      setPendingRewards(0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Claiming rewards failed.';
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!account || !web3) {
    return <p className="text-center text-gray-300">Connect wallet to stake $PORK.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-300">Your Balance: {balance.toLocaleString()} $PORK</p>
      <p className="text-sm text-gray-300">Staked: {stakedBalance.toLocaleString()} $PORK</p>
      <p className="text-sm text-gray-300">Pending Rewards: {pendingRewards.toLocaleString()} $PORK</p>
      <label htmlFor="stake-amount" className="block text-sm font-medium">Stake Amount ($PORK)</label>
      <input
        id="stake-amount"
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
      <div className="flex space-x-4">
        <button
          onClick={handleApprove}
          disabled={isLoading}
          className="w-full bg-yellow-600 hover:bg-yellow-700 py-2 rounded-lg font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Approving...' : 'Approve $PORK'}
        </button>
        <button
          onClick={handleStake}
          disabled={isLoading}
          className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded-lg font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Staking...' : 'Stake $PORK'}
        </button>
      </div>
      <button
        onClick={handleClaimRewards}
        disabled={isLoading || pendingRewards === 0}
        className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Claiming...' : 'Claim Rewards'}
      </button>
    </div>
  );
};

export default StakeWidget;
