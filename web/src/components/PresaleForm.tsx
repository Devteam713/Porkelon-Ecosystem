import { useState } from 'react';

interface PresaleFormProps {
  account: string | null;
  buyTokens: (maticAmount: number) => void;
}

const PresaleForm: React.FC<PresaleFormProps> = ({ account, buyTokens }) => {
  const [maticAmount, setMaticAmount] = useState<number>(1);
  const PRICE_PER_PORK = 0.00005;

  if (!account) return null;

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-md w-full mb-8">
      <input
        type="number"
        value={maticAmount}
        onChange={(e) => setMaticAmount(Number(e.target.value))}
        placeholder="MATIC Amount"
        className="w-full p-2 mb-4 rounded bg-white/20 text-white placeholder-white/50"
        min="0.01"
        step="0.01"
      />
      <button
        onClick={() => buyTokens(maticAmount)}
        className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg font-semibold"
      >
        Buy {Math.floor(maticAmount / PRICE_PER_PORK).toLocaleString()} $PORK
      </button>
    </div>
  );
};

export default PresaleForm;
