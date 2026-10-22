import { TOKEN_CONTRACT } from '../utils/constants';

const linkClass = 'underline hover:text-white';

const Footer: React.FC = () => (
  <footer className="py-8 text-center text-sm text-gray-300">
    <p>Total Supply: 200B $PORK | 18 decimals | Polygon Network</p>
    <p>
      Contract:{' '}
      <a
        href={`https://polygonscan.com/address/${TOKEN_CONTRACT}`}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        0x7f...10d8
      </a>
    </p>
    <p className="mt-2">
      🐷 Join the #PorkelonArmy
    </p>
    <p className="mt-1 space-x-4">
      <a href="https://t.me/prklntokn" target="_blank" rel="noopener noreferrer" className={linkClass}>
        📱 Telegram
      </a>
      <a href="https://x.com/PorkelonToken25" target="_blank" rel="noopener noreferrer" className={linkClass}>
        𝕏 @PorkelonToken25
      </a>
      <a href="https://porkelon.b12sites.com" target="_blank" rel="noopener noreferrer" className={linkClass}>
        🌐 Website
      </a>
    </p>
  </footer>
);

export default Footer;
