import React, { useState } from 'react';
import { PORK_PER_USDC, PRESALE_START_LABEL, PRESALE_END_LABEL } from '../utils/constants';
import { PresaleState } from '../hooks/useWeb3';

interface PresaleFormProps {
  account: `0x${string}` | null;
  presale: PresaleState;
  buyTokens: (usdcAmount: number) => Promise<void>;
  claimTokens: () => Promise<void>;
}

const PresaleForm: React.FC<PresaleFormProps> = ({ account, presale, buyTokens, claimTokens }) => {
  const [usdcAmount, setUsdcAmount] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!account) return null;

  const estimatedPork = Math.floor(usdcAmount * PORK_PER_USDC);
  const progress = presale.hardcapUsdc > 0
    ? Math.min(100, (presale.totalCollectedUsdc / presale.hardcapUsdc) * 100)
    : 0;

  const handleBuy = async () => {
    setIsLoading(true);
    try {
      await buyTokens(usdcAmount);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaim = async () => {
    setIsLoading(true);
    try {
      await claimTokens();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sale status */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-300">Sale status</span>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${presale.open ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
            {presale.open ? '● LIVE' : '○ Not started'}
          </span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-3 mb-2">
          <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-sm text-gray-300 text-center">
          {presale.totalCollectedUsdc.toLocaleString()} / {presale.hardcapUsdc.toLocaleString()} USDC
        </p>
        <p className="text-xs text-gray-400 text-center mt-2">
          {PRESALE_START_LABEL} → {PRESALE_END_LABEL}
        </p>
      </div>

      {/* Buy box */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
        <label htmlFor="usdc-amount" className="block text-sm font-medium mb-2">
          USDC Amount <span className="text-gray-400">(balance: {presale.usdcBalance.toLocaleString()})</span>
        </label>
        <input
          id="usdc-amount"
          type="number"
          value={usdcAmount}
          onChange={(e) => {
            const value = Number(e.target.value);
            if (value >= 0) setUsdcAmount(value);
          }}
          placeholder="Enter USDC amount"
          className="w-full p-2 mb-4 rounded bg-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
          min="0"
          step="1"
        />
        <p className="text-sm text-gray-300 mb-4">
          You get ≈ <span className="font-semibold text-white">{estimatedPork.toLocaleString()}</span> $PORK
          <span className="text-gray-400"> (66,666.67 PORK per USDC)</span>
        </p>
        <button
          onClick={handleBuy}
          disabled={isLoading || !presale.open || usdcAmount <= 0}
          className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : presale.open ? 'Approve USDC & Buy $PORK' : 'Sale not open yet'}
        </button>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Two wallet prompts: first approves USDC, then buys.
        </p>
      </div>

      {/* Claim box */}
      {(presale.claimablePork > 0 || presale.contributedUsdc > 0) && (
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-3">Your position</h3>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-300">Contributed</span>
            <span className="font-semibold">{presale.contributedUsdc.toLocaleString()} USDC</span>
          </div>
          <div className="flex justify-between text-sm mb-4">
            <span className="text-gray-300">Claimable $PORK</span>
            <span className="font-semibold">{Math.floor(presale.claimablePork).toLocaleString()}</span>
          </div>
          <button
            onClick={handleClaim}
            disabled={isLoading || presale.claimablePork <= 0}
            className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : 'Claim $PORK'}
          </button>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Claiming opens after the sale is finalized.
          </p>
        </div>
      )}
    </div>
  );
};

export default PresaleForm;
