'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, Button, Badge, Input } from '@/components/common';
import { NFTCard } from '@/components/nft';
import { Search, Filter, Grid, List, Sparkles, TrendingUp, Clock, DollarSign } from 'lucide-react';
import type { NFT } from '@/types';

const mockNFTs: NFT[] = [
  {
    id: '1',
    token_id: '1234',
    post_id: '1',
    owner_address: '0x1234...5678',
    creator_address: '0x1234...5678',
    token_uri: 'https://example.com/metadata/1234',
    price: '0.05',
    status: 'listed',
    contract_address: '0xABCD...EF01',
    network: 'base-sepolia',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    token_id: '4521',
    post_id: '2',
    owner_address: '0xABCD...EF01',
    creator_address: '0x9999...1111',
    token_uri: 'https://example.com/metadata/4521',
    price: '0.08',
    status: 'listed',
    contract_address: '0xABCD...EF01',
    network: 'base-sepolia',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    token_id: '7890',
    post_id: '3',
    owner_address: '0x5555...2222',
    creator_address: '0x5555...2222',
    token_uri: 'https://example.com/metadata/7890',
    price: '0.12',
    status: 'listed',
    contract_address: '0xABCD...EF01',
    network: 'base-sepolia',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    token_id: '2345',
    post_id: '4',
    owner_address: '0x1111...3333',
    creator_address: '0x1111...3333',
    token_uri: 'https://example.com/metadata/2345',
    price: '0.15',
    status: 'listed',
    contract_address: '0xABCD...EF01',
    network: 'base-sepolia',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    token_id: '6789',
    post_id: '5',
    owner_address: '0x2222...4444',
    creator_address: '0x2222...4444',
    token_uri: 'https://example.com/metadata/6789',
    price: '0.03',
    status: 'listed',
    contract_address: '0xABCD...EF01',
    network: 'base-sepolia',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '6',
    token_id: '9012',
    post_id: '6',
    owner_address: '0x3333...5555',
    creator_address: '0x3333...5555',
    token_uri: 'https://example.com/metadata/9012',
    price: '0.25',
    status: 'listed',
    contract_address: '0xABCD...EF01',
    network: 'base-sepolia',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockImages = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1634017839464-5c339bbe3a6a?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&h=400&fit=crop',
];

type SortOption = 'recent' | 'price-low' | 'price-high' | 'trending';

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const sortOptions = [
    { value: 'recent', label: 'Recently Listed', icon: Clock },
    { value: 'price-low', label: 'Price: Low to High', icon: DollarSign },
    { value: 'price-high', label: 'Price: High to Low', icon: DollarSign },
    { value: 'trending', label: 'Trending', icon: TrendingUp },
  ];

  const stats = [
    { label: 'Total NFTs', value: '1,234' },
    { label: 'Total Volume', value: '45.6 ETH' },
    { label: 'Floor Price', value: '0.02 ETH' },
  ];

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-dark flex items-center gap-2">
              <Sparkles className="text-primary-500" />
              NFT Marketplace
            </h1>
            <p className="text-gray-500">Discover and collect unique NFTs</p>
          </div>
          <Badge variant="default" size="md">Base Sepolia</Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label} className="text-center">
              <p className="text-2xl font-bold text-dark">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search NFTs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <div className="flex items-center bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-white shadow-soft' : 'hover:bg-gray-200'
                }`}
              >
                <Grid size={18} className="text-gray-600" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-white shadow-soft' : 'hover:bg-gray-200'
                }`}
              >
                <List size={18} className="text-gray-600" />
              </button>
            </div>
          </div>
        </Card>

        {/* NFT Grid */}
        <div className={`grid ${viewMode === 'grid' ? 'grid-cols-3' : 'grid-cols-1'} gap-4`}>
          {mockNFTs.map((nft, index) => (
            <NFTCard
              key={nft.id}
              nft={nft}
              imageUrl={mockImages[index % mockImages.length]}
              name={`Artwork #${nft.token_id}`}
            />
          ))}
        </div>

        {/* Load More */}
        <div className="flex justify-center mt-8">
          <Button variant="outline" size="md">
            Load More
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
