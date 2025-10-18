import React from 'react';
import { useWeb3 } from './hooks/useWeb3';
import Header from './components/Header';
import WalletConnect from './components/WalletConnect';
import PresaleForm from './components/PresaleForm';
import ProgressBar from './components/ProgressBar';
import MintForm from './components/MintForm';
import StakeWidget from './components/StakeWidget';
import AddLiquidity from './components/AddLiquidity';
import Footer from './components/Footer';

const App: React.FC = () => {
  const { web3, account, connectWallet, buyTokens, raised, goal, error, mintTokens, stakeTokens, addLiquidity } = useWeb3();

  return (
    <div className="min-h-screen flex flex-col items-center text-white bg-gradient-to-br from-purple-600 to-indigo-800">
      <Header />
      {error && (
        <div className="max-w-3xl w-full mx-auto mt-4 p-4 bg-red-500/20 rounded-lg text-center">
          <p className="text-red-300">{error}</p>
        </div>
      )}
      <main className="max-w-3xl w-full mx-auto py-8 space-y-8">
        {/* Presale Section */}
        <section className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-lg" aria-labelledby="presale-heading">
          <h2 id="presale-heading" className="text-2xl font-bold mb-4 text-center">Porkelon Presale</h2>
          <WalletConnect account={account} connectWallet={connectWallet} />
          <PresaleForm account={account} buyTokens={buyTokens} />
          <ProgressBar raised={raised} goal={goal} />
        </section>

        {/* Ecosystem Section */}
        <section className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-lg" aria-labelledby="ecosystem-heading">
          <h2 id="ecosystem-heading" className="text-2xl font-bold mb-4 text-center">Porkelon Ecosystem</h2>
          <p className="text-center mb-6 text-gray-200">
            Connect your wallet to mint, stake, or add liquidity to $PORK pools.
          </p>
          <div className="space-y-6">
            <div className="border border-white/20 rounded-lg p-4">
              <h3 className="text-xl font-semibold mb-2">Mint $PORK</h3>
              <MintForm account={account} web3={web3} mintTokens={mintTokens} />
            </div>
            <div className="border border-white/20 rounded-lg p-4">
              <h3 className="text-xl font-semibold mb-2">Stake $PORK</h3>
              <StakeWidget account={account} web3={web3} stakeTokens={stakeTokens} />
            </div>
            <div className="border border-white/20 rounded-lg p-4">
              <h3 className="text-xl font-semibold mb-2">Add Liquidity (PORK/MATIC)</h3>
              <AddLiquidity account={account} web3={web3} addLiquidity={addLiquidity} />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default App;
