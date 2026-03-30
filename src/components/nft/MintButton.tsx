'use client';

import { useState } from 'react';
import { Button, Modal, Badge } from '@/components/common';
import { Sparkles, Loader2, Check, AlertCircle, HelpCircle } from 'lucide-react';
import { mintPostOnChain, persistMintedPost, type MintContractType } from '@/lib/nft-mint';

interface MintButtonProps {
  postId: string;
  tokenURI?: string | null;
  mintDeadline?: string | null;
  disabled?: boolean;
  onMintSuccess?: (post: Record<string, unknown>) => void;
}

type MintStatus = 'idle' | 'preparing' | 'signing' | 'minting' | 'persisting' | 'success' | 'error';

const MintButton = ({ postId, tokenURI = null, mintDeadline = null, disabled, onMintSuccess }: MintButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<MintStatus>('idle');
  const [contractType, setContractType] = useState<MintContractType>('ERC721');
  const [amount1155, setAmount1155] = useState('1');
  const [errorMessage, setErrorMessage] = useState('');
  const [mintedTokenId, setMintedTokenId] = useState('');
  const [mintTxHash, setMintTxHash] = useState('');

  const handleMint = async () => {
    setErrorMessage('');
    setMintedTokenId('');
    setMintTxHash('');

    try {
      setStatus('preparing');
      setStatus('signing');

      const amount = contractType === 'ERC1155' ? Number(amount1155) : 1;
      setStatus('minting');

      const onChainResult = await mintPostOnChain({
        postId,
        contractType,
        amount,
        tokenURI,
        mintDeadline,
      });

      setStatus('persisting');
      const persisted = await persistMintedPost({
        postId,
        contractType,
        contractAddress: onChainResult.contractAddress,
        tokenId: onChainResult.tokenId,
        mintTxHash: onChainResult.mintTxHash,
      });

      setMintedTokenId(onChainResult.tokenId);
      setMintTxHash(onChainResult.mintTxHash);
      setStatus('success');
      onMintSuccess?.(persisted.post);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unknown minting error');
      setStatus('error');
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'preparing':
        return 'Preparing wallet and contract call...';
      case 'signing':
        return 'Please sign the transaction in your wallet';
      case 'minting':
        return 'Minting your NFT on Base Sepolia...';
      case 'persisting':
        return 'Syncing minted token data to your post...';
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
          setErrorMessage('');
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
                  <p className="text-sm text-gray-500">Mint your post on Base Sepolia using ERC-721 or ERC-1155</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Choose NFT standard</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setContractType('ERC721')}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    contractType === 'ERC721'
                      ? 'border-primary-400 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-dark">NFT 721</p>
                    <span title="ERC-721 la NFT doc nhat, moi token la mot ban duy nhat.">
                      <HelpCircle
                        size={16}
                        className="text-gray-500"
                      />
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">1 token = 1 tai san doc ban</p>
                </button>

                <button
                  type="button"
                  onClick={() => setContractType('ERC1155')}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    contractType === 'ERC1155'
                      ? 'border-primary-400 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-dark">NFT 1155</p>
                    <span title="ERC-1155 cho phep mint nhieu ban cung mot token id (semi-fungible).">
                      <HelpCircle
                        size={16}
                        className="text-gray-500"
                      />
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">1 token id co the co nhieu ban</p>
                </button>
              </div>
            </div>

            {contractType === 'ERC1155' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (ERC-1155)
                </label>
                <input
                  type="number"
                  value={amount1155}
                  onChange={(e) => setAmount1155(e.target.value)}
                  step="1"
                  min="1"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                />
              </div>
            )}

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
              Mint {contractType === 'ERC721' ? 'ERC-721' : 'ERC-1155'}
            </Button>
          </div>
        )}

        {(status === 'preparing' || status === 'signing' || status === 'minting' || status === 'persisting') && (
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
            <div className="text-left p-3 bg-gray-50 rounded-xl mb-6 space-y-1">
              <p className="text-sm text-gray-600">Token ID: <span className="font-semibold text-dark">{mintedTokenId}</span></p>
              <p className="text-sm text-gray-600 break-all">Mint Tx: <span className="font-mono text-xs text-dark">{mintTxHash}</span></p>
            </div>
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
            <p className="text-sm text-gray-500 mb-2">{getStatusMessage()}</p>
            {errorMessage && (
              <p className="text-xs text-red-500 mb-6 break-words">{errorMessage}</p>
            )}
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
