import { Connection, clusterApiUrl, PublicKey, Transaction } from '@solana/web3.js';
import { Metaplex, walletAdapterIdentity } from '@metaplex-foundation/js';

// Use devnet for testing
export const SOLANA_NETWORK = clusterApiUrl('devnet');

// Create connection to Solana
export const connection = new Connection(SOLANA_NETWORK, 'confirmed');

// Initialize Metaplex instance
export const getMetaplex = (wallet: any) => {
  return Metaplex.make(connection)
    .use(walletAdapterIdentity(wallet));
};

// Check if Phantom wallet is installed
export const isPhantomInstalled = (): boolean => {
  return typeof window !== 'undefined' && 'solana' in window && (window as any).solana?.isPhantom;
};

// Get Phantom wallet provider
export const getPhantomProvider = () => {
  if (isPhantomInstalled()) {
    return (window as any).solana;
  }
  return null;
};

// Request airdrop for testing (devnet only)
export const requestAirdrop = async (publicKey: PublicKey): Promise<string> => {
  try {
    const signature = await connection.requestAirdrop(
      publicKey,
      1000000000 // 1 SOL
    );
    await connection.confirmTransaction(signature);
    return signature;
  } catch (error) {
    console.error('Airdrop failed:', error);
    throw error;
  }
};

// Get SOL balance
export const getBalance = async (publicKey: PublicKey): Promise<number> => {
  try {
    const balance = await connection.getBalance(publicKey);
    return balance / 1000000000; // Convert lamports to SOL
  } catch (error) {
    console.error('Failed to get balance:', error);
    return 0;
  }
};
