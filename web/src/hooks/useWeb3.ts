import { useState, useEffect } from 'react';
import Web3 from 'web3';
import { POLYGON_RPC, CHAIN_ID, PRESALE_CONTRACT, TOKEN_CONTRACT, ABI, PRICE_PER_PORK } from '../utils/constants';

export const useWeb3 = () => {
  const [web3, setWeb3] = useState<Web3 | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [raised, setRaised] = useState<number>(0);
  const goal = 25_000_000; // $25M

  useEffect(() => {
    if (window.ethereum) {
      const initWeb3 = async () => {
        const w3 = new Web3(window.ethereum || POLYGON_RPC);
        setWeb3(w3);
        try {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const accounts = await w3.eth.getAccounts();
          setAccount(accounts[0]);
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
          });
          // Simulate progress (replace with contract call for live data)
          let start = 0;
          const increment = goal / 100;
          const timer = setInterval(() => {
            start += increment;
            setRaised(Math.min(start, goal * 0.1)); // Simulate 10% raised
            if (start >= goal * 0.1) clearInterval(timer);
          }, 50);
        } catch (error) {
          console.error('Wallet connection failed:', error);
        }
      };
      window.ethereum.on('accountsChanged', (accounts: string[]) => setAccount(accounts[0] || null));
      initWeb3();
    }
  }, []);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const accounts = await web3?.eth.getAccounts();
        setAccount(accounts?.[0] || null);
      } catch (error) {
        alert('Failed to connect wallet. Try again.');
      }
    } else {
      alert('Install MetaMask or Trust Wallet!');
    }
  };

  const buyTokens = async (maticAmount: number) => {
    if (!web3 || !account) {
      alert('Connect wallet first!');
      return;
    }
    const porkAmount = (maticAmount / PRICE_PER_PORK).toString();
    const contract = new web3.eth.Contract(ABI, PRESALE_CONTRACT);
    try {
      await contract.methods.buyTokens(porkAmount).send({
        from: account,
        value: web3.utils.toWei(maticAmount.toString(), 'ether'),
      });
      alert('Purchase successful! Check your wallet.');
    } catch (error) {
      console.error('Purchase failed:', error);
      alert('Transaction failed. Ensure sufficient MATIC.');
    }
  };

  return { web3, account, raised, goal, connectWallet, buyTokens };
};
