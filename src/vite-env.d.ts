/// <reference types="vite/client" />
/// <reference types="vite/client" />

// Extend Window interface for polyfills
interface Window {
  Buffer: any;
  process: any;
  global: any;
  solana?: any;
}
