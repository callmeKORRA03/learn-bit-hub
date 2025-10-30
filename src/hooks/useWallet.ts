import { useState, useEffect, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { getPhantomProvider, isPhantomInstalled, getBalance } from '@/lib/solana';
import { toast } from 'sonner';

export interface WalletState {
  connected: boolean;
  publicKey: PublicKey | null;
  connecting: boolean;
  balance: number;
}

export const useWallet = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    connected: false,
    publicKey: null,
    connecting: false,
    balance: 0,
  });

  // Check if already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (!isPhantomInstalled()) return;
      
      const provider = getPhantomProvider();
      if (provider?.isConnected && provider.publicKey) {
        const balance = await getBalance(provider.publicKey);
        setWalletState({
          connected: true,
          publicKey: provider.publicKey,
          connecting: false,
          balance,
        });
      }
    };

    checkConnection();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (!isPhantomInstalled()) return;

    const provider = getPhantomProvider();
    
    const handleAccountChange = async (publicKey: PublicKey | null) => {
      if (publicKey) {
        const balance = await getBalance(publicKey);
        setWalletState({
          connected: true,
          publicKey,
          connecting: false,
          balance,
        });
      } else {
        setWalletState({
          connected: false,
          publicKey: null,
          connecting: false,
          balance: 0,
        });
      }
    };

    provider?.on('accountChanged', handleAccountChange);
    provider?.on('disconnect', () => {
      setWalletState({
        connected: false,
        publicKey: null,
        connecting: false,
        balance: 0,
      });
    });

    return () => {
      provider?.removeListener('accountChanged', handleAccountChange);
      provider?.removeListener('disconnect', () => {});
    };
  }, []);

  const connect = useCallback(async () => {
    if (!isPhantomInstalled()) {
      toast.error('Phantom wallet not found', {
        description: 'Please install Phantom wallet extension',
        action: {
          label: 'Install',
          onClick: () => window.open('https://phantom.app/', '_blank'),
        },
      });
      return;
    }

    setWalletState(prev => ({ ...prev, connecting: true }));

    try {
      const provider = getPhantomProvider();
      const response = await provider.connect();
      const balance = await getBalance(response.publicKey);
      
      setWalletState({
        connected: true,
        publicKey: response.publicKey,
        connecting: false,
        balance,
      });

      toast.success('Wallet connected!', {
        description: `${response.publicKey.toBase58().slice(0, 8)}...${response.publicKey.toBase58().slice(-8)}`,
      });
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      toast.error('Failed to connect wallet', {
        description: error.message || 'Please try again',
      });
      setWalletState(prev => ({ ...prev, connecting: false }));
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const provider = getPhantomProvider();
      await provider?.disconnect();
      setWalletState({
        connected: false,
        publicKey: null,
        connecting: false,
        balance: 0,
      });
      toast.success('Wallet disconnected');
    } catch (error: any) {
      console.error('Failed to disconnect wallet:', error);
      toast.error('Failed to disconnect wallet');
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (walletState.publicKey) {
      const balance = await getBalance(walletState.publicKey);
      setWalletState(prev => ({ ...prev, balance }));
    }
  }, [walletState.publicKey]);

  return {
    ...walletState,
    connect,
    disconnect,
    refreshBalance,
    provider: getPhantomProvider(),
  };
};
