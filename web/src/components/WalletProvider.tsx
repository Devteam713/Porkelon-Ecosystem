import React from "react";
import { WagmiConfig, createConfig, configureChains, useNetwork } from "wagmi";
import { publicProvider } from "wagmi/providers/public";
import { polygonMumbai, polygon } from "wagmi/chains";
import { getDefaultWallets, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";

const chains = [polygon, polygonMumbai];

const { chains: configuredChains, publicClient } = configureChains(chains, [publicProvider()]);

const { connectors } = getDefaultWallets({
  appName: "Porkelon",
  projectId: "porkelon-app",
  chains: configuredChains,
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
});

export default function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={configuredChains}>{children}</RainbowKitProvider>
    </WagmiConfig>
  );
}
