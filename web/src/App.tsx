import React from "react";
import MintForm from "./components/MintForm";
import StakeWidget from "./components/StakeWidget";
import AddLiquidity from "./components/AddLiquidity";
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

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
