import type { Metadata } from 'next';
import './globals.css';
import { DynamicProvider } from '@/providers';
import { ProgressBar } from '@/components/common';

export const metadata: Metadata = {
  metadataBase: new URL('https://metabased.xyz'),
  title: 'Metabased - Social NFT Marketplace',
  description: 'Share moments, own memories. The social platform where your photos become NFTs on Base Sepolia.',
  keywords: ['NFT', 'Social', 'Base', 'Sepolia', 'Blockchain', 'Web3'],
  authors: [{ name: 'Metabased' }],
  openGraph: {
    title: 'Metabased - Social NFT Marketplace',
    description: 'Share moments, own memories. The social platform where your photos become NFTs on Base Sepolia.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ProgressBar />
        <DynamicProvider>{children}</DynamicProvider>
      </body>
    </html>
  );
}
