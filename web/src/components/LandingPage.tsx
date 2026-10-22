import React from 'react';

const features = [
  {
    title: 'Low Fees on Polygon',
    desc: 'Fast, near-zero-cost transactions on Polygon. No more watching your gains evaporate into gas fees.',
    emoji: '⚡',
  },
  {
    title: 'UUPS Upgradeable',
    desc: 'Future-proof smart contracts with UUPS proxy architecture. The ecosystem evolves without disrupting holders.',
    emoji: '🔧',
  },
  {
    title: '1% Community Tax',
    desc: 'A small 1% transaction fee flows to the team wallet, funding development, marketing, and the Porkelon Army.',
    emoji: '💰',
  },
  {
    title: 'Pausable & Burnable',
    desc: 'Emergency pause for security, plus a burn mechanism that makes supply deflationary over time.',
    emoji: '🔥',
  },
  {
    title: 'Locked Liquidity',
    desc: 'Liquidity is locked to build trust. No rug pulls — the pig is here to stay.',
    emoji: '🔒',
  },
  {
    title: 'DAO-Ready Governance',
    desc: 'ERC20Votes built in from day one. Holders get a voice as the ecosystem grows.',
    emoji: '🗳️',
  },
];

const allocations = [
  { label: 'Dev', pct: 25, color: 'bg-purple-400' },
  { label: 'Liquidity (Locked)', pct: 40, color: 'bg-pink-400' },
  { label: 'Staking / Rewards', pct: 10, color: 'bg-indigo-400' },
  { label: 'Marketing', pct: 10, color: 'bg-fuchsia-400' },
  { label: 'Presale', pct: 10, color: 'bg-violet-400' },
  { label: 'Airdrops', pct: 5, color: 'bg-cyan-400' },
];

const phases = [
  {
    phase: 'Phase 1',
    title: 'Launch & Growth',
    items: ['Community build', 'Token live on Polygon', 'Porkelon Army formation'],
  },
  {
    phase: 'Phase 2',
    title: 'Expansion',
    items: ['Aggressive marketing push', 'Listings on meme-token trackers (DexTools, etc.)', 'Partnerships with influencers & meme projects'],
  },
  {
    phase: 'Phase 3',
    title: 'Utility & Scale',
    items: ['NFT memes & mini-games integration', 'Stronger liquidity pools', 'Exchange listings push'],
  },
];

const LandingPage: React.FC = () => (
  <div className="w-full">
    {/* Hero */}
    <section className="text-center px-6 py-16" aria-labelledby="hero-heading">
      <div className="text-7xl mb-6" aria-hidden="true">🐖</div>
      <h1 id="hero-heading" className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight">
        Porkelon <span className="text-pink-300">$PORK</span>
      </h1>
      <p className="text-xl md:text-2xl text-gray-100 max-w-3xl mx-auto mb-4">
        Porkelon isn't just another meme coin — it's a movement powered by community, humor, and momentum.
      </p>
      <p className="text-lg text-gray-200 max-w-2xl mx-auto mb-8">
        Fast transactions, low fees, and viral energy. This pig is destined for orbit. 🌕✨
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <a
          href="#presale"
          className="px-8 py-3 bg-pink-500 hover:bg-pink-600 rounded-full font-bold text-lg transition-colors"
        >
          Join the Presale
        </a>
        <a
          href="https://t.me/prklntokn"
          target="_blank"
          rel="noopener noreferrer"
          className="px-8 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full font-bold text-lg transition-colors"
        >
          Join the Army 🐖
        </a>
      </div>
    </section>

    {/* Features */}
    <section className="px-6 py-12" aria-labelledby="features-heading">
      <h2 id="features-heading" className="text-3xl font-bold text-center mb-8">
        Why Porkelon?
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {features.map((f) => (
          <div key={f.title} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-lg">
            <div className="text-4xl mb-3" aria-hidden="true">{f.emoji}</div>
            <h3 className="text-xl font-bold mb-2">{f.title}</h3>
            <p className="text-gray-200">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>

    {/* Tokenomics */}
    <section className="px-6 py-12" aria-labelledby="tokenomics-heading">
      <div className="max-w-4xl mx-auto bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-lg">
        <h2 id="tokenomics-heading" className="text-3xl font-bold text-center mb-2">
          Tokenomics
        </h2>
        <p className="text-center text-gray-200 mb-8">
          Total Supply: <strong>200,000,000,000</strong> PORK (18 decimals) — capped, no further minting after initialization.
        </p>
        <div className="space-y-4">
          {allocations.map((a) => (
            <div key={a.label}>
              <div className="flex justify-between text-sm font-semibold mb-1">
                <span>{a.label}</span>
                <span>{a.pct}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-3">
                <div className={`${a.color} h-3 rounded-full`} style={{ width: `${a.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Roadmap */}
    <section className="px-6 py-12" aria-labelledby="roadmap-heading">
      <h2 id="roadmap-heading" className="text-3xl font-bold text-center mb-8">
        Roadmap
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {phases.map((p) => (
          <div key={p.phase} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-lg">
            <p className="text-pink-300 font-bold text-sm uppercase tracking-wide mb-1">{p.phase}</p>
            <h3 className="text-2xl font-bold mb-4">{p.title}</h3>
            <ul className="space-y-2 text-gray-200">
              {p.items.map((item) => (
                <li key={item} className="flex items-start">
                  <span className="mr-2" aria-hidden="true">✅</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>

    {/* Community */}
    <section className="px-6 py-12" aria-labelledby="community-heading">
      <div className="max-w-3xl mx-auto bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-lg text-center">
        <h2 id="community-heading" className="text-3xl font-bold mb-4">
          Join the Porkelon Army 🐖
        </h2>
        <p className="text-gray-200 mb-6">
          Meme tokens thrive on energy and virality. Bring yours.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="https://t.me/prklntokn"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full font-semibold transition-colors"
          >
            📱 Telegram
          </a>
          <a
            href="https://x.com/PorkelonToken25"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full font-semibold transition-colors"
          >
            𝕏 @PorkelonToken25
          </a>
          <a
            href="https://porkelon.b12sites.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full font-semibold transition-colors"
          >
            🌐 Website
          </a>
        </div>
      </div>
    </section>
  </div>
);

export default LandingPage;
