import React from "react";
import MintForm from "./components/MintForm";
import StakeWidget from "./components/StakeWidget";
import AddLiquidity from "./components/AddLiquidity";
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useWeb3 } from './hooks/useWeb3';
import Header from './components/Header';
import WalletConnect from './components/WalletConnect';
import PresaleForm from './components/PresaleForm';
import ProgressBar from './components/ProgressBar';
import Footer from './components/Footer';

const App: React.FC = () => {
  const { account, connectWallet, buyTokens, raised, goal, error } = useWeb3();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-white">
      <Header />
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <WalletConnect account={account} connectWallet={connectWallet} />
      <PresaleForm account={account} buyTokens={buyTokens} />
      <ProgressBar raised={raised} goal={goal} />
      <Footer />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
export default function App() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Porkelon Ecosystem — Demo</h1>
      <p>Connect wallet using RainbowKit (not wired in this minimal scaffold).</p>
      <MintForm />
      <hr />
      <StakeWidget />
      <hr />
      <AddLiquidity />
    </div>
  );
}
