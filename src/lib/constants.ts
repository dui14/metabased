// App constants
export const APP_NAME = 'Metabased';
export const APP_DESCRIPTION = 'Social NFT Marketplace on Base Sepolia';
export const APP_URL = 'https://metabased.vercel.app';

// Network config
export const NETWORK = {
  name: 'Base Sepolia',
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 84532),
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org',
  explorerUrl: 'https://sepolia.basescan.org',
  currency: 'ETH',
};

// Contract addresses (placeholder)
export const CONTRACTS = {
  NFT_721: process.env.NEXT_PUBLIC_NFT721_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
  NFT_1155: process.env.NEXT_PUBLIC_NFT1155_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
  MARKETPLACE: process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
};

// UI Constants
export const COLORS = {
  primary: '#FFA66B',
  primaryHover: '#FF8A4C',
  dark: '#111111',
  light: '#FFFFFF',
};

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
