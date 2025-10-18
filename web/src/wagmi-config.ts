import { configureChains, createConfig } from 'wagmi';
import { polygon, polygonAmoy } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { metaMask } from 'wagmi/connectors';

const { chains, publicClient } = configureChains(
  [CHAIN_ID === 80002 ? polygonAmoy : polygon],
  [publicProvider()]
);

export const config = createConfig({
  autoConnect: true,
  connectors: [metaMask()],
  publicClient,
});
