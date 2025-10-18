import { TOKEN_CONTRACT } from '../utils/constants';

const Footer: React.FC = () => (
  <footer className="mt-8 text-center text-sm opacity-75">
    <p>Total Supply: 100B $PORK | Presale: 40B | Price: 0.00005 MATIC/PORK</p>
    <p>
      Contract:{' '}
      <a
        href={`https://polygonscan.com/address/${TOKEN_CONTRACT}`}
        target="_blank"
        rel="noopener noreferrer"
        className="underline"
      >
        0x7f...10d8
      </a>
    </p>
    <p>
      🐷 Join the #PorkelonArmy |{' '}
      <a href="https://x.com/PorkelonToken25" target="_blank" rel="noopener noreferrer" className="underline">
        @PorkelonToken25
      </a>
    </p>
  </footer>
);

export default Footer;
