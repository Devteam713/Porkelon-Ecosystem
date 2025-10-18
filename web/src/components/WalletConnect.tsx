interface WalletConnectProps {
  account: string | null;
  connectWallet: () => void;
}

const WalletConnect: React.FC<WalletConnectProps> = ({ account, connectWallet }) => {
  if (account) {
    return (
      <p className="text-center mb-4">
        Connected: {account.slice(0, 6)}...{account.slice(-4)}
      </p>
    );
  }

  return (
    <button
      onClick={connectWallet}
      className="w-full max-w-md bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-semibold mb-8"
    >
      Connect Wallet (MetaMask/Trust)
    </button>
  );
};

export default WalletConnect;
