import { useState, useEffect, useCallback } from 'react';
import { Web3Service } from '../utils/web3.js';
import toast from 'react-hot-toast';

export const useWeb3 = () => {
  const [web3Service] = useState(() => new Web3Service());
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async () => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    try {
      await web3Service.connect();
      const address = await web3Service.getWalletAddress();
      setWalletAddress(address);
      setIsConnected(true);
      toast.success('Wallet connected successfully!');
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      toast.error(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, [web3Service, isConnecting]);

  const connectDemo = useCallback(() => {
    setIsConnected(true);
    setWalletAddress('0x742d35Cc6634C0532925a3b8D9C9C9C9CC5DC7');
    toast.success('Demo mode activated!');
  }, []);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setWalletAddress('');
    toast.success('Wallet disconnected');
  }, []);

  // Auto-connect if wallet is already connected
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            await connect();
          }
        } catch (error) {
          console.error('Failed to check wallet connection:', error);
        }
      }
    };

    checkConnection();
  }, [connect]);

  // Listen for account changes
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          disconnect();
        } else if (accounts[0] !== walletAddress && isConnected) {
          // Account changed, reconnect
          connect();
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, [walletAddress, isConnected, connect, disconnect]);

  return {
    web3Service,
    isConnected,
    walletAddress,
    isConnecting,
    connect,
    connectDemo,
    disconnect
  };
};