'use client';

import { useState } from 'react';
import { Button, Modal, Badge } from '@/components/common';
import { Sparkles, Loader2, Check, AlertCircle } from 'lucide-react';

interface MintButtonProps {
  postId: string;
  disabled?: boolean;
  onMintSuccess?: (tokenId: string) => void;
}

type MintStatus = 'idle' | 'preparing' | 'signing' | 'minting' | 'success' | 'error';

const MintButton = ({ postId, disabled, onMintSuccess }: MintButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<MintStatus>('idle');
  const [price, setPrice] = useState('0.05');

  const handleMint = async () => {
    setStatus('preparing');
    
    // Simulate minting process
    setTimeout(() => setStatus('signing'), 1000);
    setTimeout(() => setStatus('minting'), 2500);
    setTimeout(() => {
      setStatus('success');
      onMintSuccess?.('12345');
    }, 5000);
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'preparing':
        return 'Preparing transaction...';
      case 'signing':
        return 'Please sign the transaction in your wallet';
      case 'minting':
        return 'Minting your NFT on Base Sepolia...';
      case 'success':
        return 'NFT minted successfully!';
      case 'error':
        return 'Transaction failed. Please try again.';
      default:
        return '';
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
      >
        <Sparkles size={14} className="mr-1" />
        Mint as NFT
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setStatus('idle');
        }}
        title="Mint as NFT"
        size="md"
      >
        <div className="relative z-50">
        {status === 'idle' && (
          <div className="space-y-6">
            <div className="p-4 bg-gradient-to-r from-primary-50 to-orange-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-soft">
                  <Sparkles size={24} className="text-primary-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-dark">Create NFT</h4>
                  <p className="text-sm text-gray-500">Mint your post as an NFT on Base Sepolia</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Set Price (ETH)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                step="0.01"
                min="0"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-2">
                Platform fee: 2.5% · You receive: {(parseFloat(price) * 0.975).toFixed(4)} ETH
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Network</span>
                <Badge variant="default">Base Sepolia</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Gas Fee (estimated)</span>
                <span className="text-dark">~0.001 ETH</span>
              </div>
            </div>

            <Button variant="primary" className="w-full" onClick={handleMint}>
              <Sparkles size={16} className="mr-2" />
              Mint NFT
            </Button>
          </div>
        )}

        {(status === 'preparing' || status === 'signing' || status === 'minting') && (
          <div className="text-center py-8">
            <Loader2 size={48} className="mx-auto text-primary-500 animate-spin mb-4" />
            <p className="text-dark font-medium">{getStatusMessage()}</p>
            <p className="text-sm text-gray-400 mt-2">Please don't close this window</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-green-500" />
            </div>
            <h4 className="text-lg font-semibold text-dark mb-2">NFT Minted!</h4>
            <p className="text-sm text-gray-500 mb-6">
              Your post is now an NFT on Base Sepolia
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
                Close
              </Button>
              <Button variant="primary" className="flex-1">
                View NFT
              </Button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} className="text-red-500" />
            </div>
            <h4 className="text-lg font-semibold text-dark mb-2">Transaction Failed</h4>
            <p className="text-sm text-gray-500 mb-6">{getStatusMessage()}</p>
            <Button variant="primary" className="w-full" onClick={handleMint}>
              Try Again
            </Button>
          </div>
        )}
        </div>
      </Modal>
    </>
  );
};

export default MintButton;
