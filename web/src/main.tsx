import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Optional RainbowKit setup (uncomment to enable)
// import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
// import { WagmiProvider } from 'wagmi';
// import { config } from './wagmi-config';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* <WagmiProvider config={config}>
      <RainbowKitProvider> */}
        <App />
      {/* </RainbowKitProvider>
    </WagmiProvider> */}
  </React.StrictMode>
);
