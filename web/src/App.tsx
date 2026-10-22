import React from 'react';
import { useWeb3 } from './hooks/useWeb3';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import WalletConnect from './components/WalletConnect';
import PresaleForm from './components/PresaleForm';
import Footer from './components/Footer';

/** Shown in place of a dApp widget when contracts aren't deployed yet. */
const ComingSoon: React.FC<{ label: string }> = ({ label }) => (
  <div className="text-center py-8 px-4">
    <p className="text-4xl mb-3">🐷⏳</p>
    <p className="text-lg font-semibold">{label} is coming soon</p>
    <p className="text-sm text-gray-300 mt-2 max-w-md mx-auto">
      This feature will go live as soon as its contracts are wired up.
    </p>
  </div>
);

const App: React.FC = () => {
  const {
    account,
    walletStatus,
    contractsDeployed,
    presale,
    connectWallet,
    switchToBaseSepolia,
    buyTokens,
    claimTokens,
    error,
  } = useWeb3();

  return (
    <div className="min-h-screen flex flex-col items-center text-white bg-gradient-to-br from-purple-600 to-indigo-800">
      <Header />
      {error && (
        <div className="max-w-3xl w-full mx-auto mt-4 px-4">
          <div className="p-4 bg-red-500/20 border border-red-400/30 rounded-lg text-center">
            <p className="text-red-200">{error}</p>
          </div>
        </div>
      )}
      <main className="w-full">
        <LandingPage />
      </main>
      <main className="max-w-3xl w-full mx-auto py-8 px-4 space-y-8">
        {/* Presale Section */}
        <section
          id="presale"
          className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-lg scroll-mt-8"
          aria-labelledby="presale-heading"
        >
          <h2 id="presale-heading" className="text-2xl font-bold mb-4 text-center">
            Porkelon Presale
          </h2>
          <p className="text-center text-sm text-gray-300 mb-6">
            Base Sepolia testnet · 1 USDC = 66,666.67 $PORK
          </p>
          {contractsDeployed ? (
            <>
              <WalletConnect
                account={account}
                walletStatus={walletStatus}
                connectWallet={connectWallet}
                switchToBaseSepolia={switchToBaseSepolia}
              />
              <PresaleForm
                account={account}
                presale={presale}
                buyTokens={buyTokens}
                claimTokens={claimTokens}
              />
            </>
          ) : (
            <ComingSoon label="The presale" />
          )}
        </section>

        {/* Ecosystem Section */}
        <section
          className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-lg"
          aria-labelledby="ecosystem-heading"
        >
          <h2 id="ecosystem-heading" className="text-2xl font-bold mb-4 text-center">
            Porkelon Ecosystem
          </h2>
          <ComingSoon label="Staking, NFT marketplace & liquidity mining" />
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default App;
