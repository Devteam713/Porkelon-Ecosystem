interface ProgressBarProps {
  raised: number;
  goal: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ raised, goal }) => {
  const progress = ((raised / goal) * 100).toFixed(2);

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
      <h2 className="text-2xl font-semibold mb-4 text-center">Presale Progress</h2>
      <div className="relative">
        <div className="bg-white/20 h-4 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-4 rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-sm mt-2 text-center">
          ${raised.toLocaleString()} raised of ${goal.toLocaleString()} goal ({progress}%)
        </p>
      </div>
    </div>
  );
};

export default ProgressBar;
