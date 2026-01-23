'use client';

import { cn } from '@/lib/utils';
import { Badge, Button, Card } from '@/components/common';
import { Sparkles, ExternalLink, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { NFT } from '@/types';

interface NFTCardProps {
  nft: NFT;
  imageUrl: string;
  name: string;
  onBuy?: () => void;
}

const NFTCard = ({ nft, imageUrl, name, onBuy }: NFTCardProps) => {
  return (
    <Card padding="none" hover className="overflow-hidden">
      {/* Image */}
      <div className="relative aspect-square bg-gray-100">
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover"
        />
        <div className="absolute top-3 right-3">
          <Badge variant="nft" size="sm">
            <Sparkles size={10} className="mr-1" />
            NFT
          </Badge>
        </div>
        <div className="absolute bottom-3 left-3">
          <Badge variant="default" size="sm">
            Base Sepolia
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-dark truncate">{name}</h3>
        <p className="text-sm text-gray-500 mt-1">Token #{nft.token_id}</p>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400">Price</p>
            <p className="font-bold text-dark">{nft.price || '0.05'} ETH</p>
          </div>
          {nft.status === 'listed' && (
            <Button size="sm" variant="primary" onClick={onBuy}>
              <ShoppingCart size={14} className="mr-1" />
              Buy
            </Button>
          )}
          {nft.status === 'minted' && (
            <Badge variant="default" size="sm">Owned</Badge>
          )}
          {nft.status === 'sold' && (
            <Badge variant="success" size="sm">Sold</Badge>
          )}
        </div>
      </div>
    </Card>
  );
};

export default NFTCard;
