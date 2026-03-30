'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, Button, Avatar, Badge } from '@/components/common';
import { Sparkles, X, Upload, ArrowLeft, Loader2, HelpCircle } from 'lucide-react';
import { useAuth, useTheme } from '@/providers';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import {
  mintPostOnChain,
  persistMintedPost,
  scanWalletNftsOnBaseSepolia,
  sellPostOnChain,
  type MintContractType,
  type WalletOwnedNft,
} from '@/lib/nft-mint';
import { formatTokenIdShort, resolveNftPreview } from '@/lib/nft-preview';
import { formatAddress } from '@/lib/utils';

function getDefaultMintExpiryLocalValue(): string {
  const target = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const offset = target.getTimezoneOffset() * 60000;
  return new Date(target.getTime() - offset).toISOString().slice(0, 16);
}

type NftActionMode = 'mint' | 'sell';

interface WalletNftPreview {
  imageUrl: string | null;
  tokenUri: string | null;
  name: string | null;
}

function getWalletNftOptionId(item: WalletOwnedNft): string {
  return `${item.contractType}:${item.contractAddress.toLowerCase()}:${item.tokenId}`;
}

export default function CreatePostPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { primaryWallet } = useDynamicContext();
  const { t } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [caption, setCaption] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mintAsNFT, setMintAsNFT] = useState(false);
  const [nftActionMode, setNftActionMode] = useState<NftActionMode>('mint');
  const [nftContractType, setNftContractType] = useState<MintContractType>('ERC721');
  const [nft1155Supply, setNft1155Supply] = useState('1');
  const [sellPrice, setSellPrice] = useState('0.05');
  const [sellAmount, setSellAmount] = useState('1');
  const [walletNfts, setWalletNfts] = useState<WalletOwnedNft[]>([]);
  const [selectedWalletNftId, setSelectedWalletNftId] = useState<string | null>(null);
  const [walletNftPreviewMap, setWalletNftPreviewMap] = useState<Record<string, WalletNftPreview>>({});
  const [walletScanAt, setWalletScanAt] = useState<string | null>(null);
  const [isScanningWalletNfts, setIsScanningWalletNfts] = useState(false);
  const [walletNftsError, setWalletNftsError] = useState<string | null>(null);
  const [nftMintExpiresAt, setNftMintExpiresAt] = useState(getDefaultMintExpiryLocalValue());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const walletConnector = primaryWallet?.connector;
  const isSellAvailable = !selectedImage;
  const selectedWalletNft = walletNfts.find((item) => getWalletNftOptionId(item) === selectedWalletNftId) || null;
  const selectedWalletNftPreview = selectedWalletNft
    ? walletNftPreviewMap[getWalletNftOptionId(selectedWalletNft)]
    : null;

  const refreshWalletNfts = async () => {
    setIsScanningWalletNfts(true);
    setWalletNftsError(null);

    try {
      const items = await scanWalletNftsOnBaseSepolia({ walletConnector });
      const previewPairs = await Promise.all(
        items.map(async (item) => {
          const optionId = getWalletNftOptionId(item);
          const preview = await resolveNftPreview({
            contractType: item.contractType,
            contractAddress: item.contractAddress,
            tokenId: item.tokenId,
            tokenUriHint: item.tokenUri,
          });

          return [
            optionId,
            {
              imageUrl: preview.imageUrl,
              tokenUri: preview.tokenUri,
              name: preview.name,
            },
          ] as const;
        })
      );

      setWalletNfts(items);
      setWalletNftPreviewMap(Object.fromEntries(previewPairs));
      setWalletScanAt(new Date().toISOString());

      if (items.length > 0) {
        const currentSelectedStillExists = items.some((item) => getWalletNftOptionId(item) === selectedWalletNftId);
        if (!currentSelectedStillExists) {
          const firstId = getWalletNftOptionId(items[0]);
          setSelectedWalletNftId(firstId);
          setSellAmount('1');
        }
      } else {
        setSelectedWalletNftId(null);
      }
    } catch (scanError) {
      const message = scanError instanceof Error ? scanError.message : 'Failed to scan wallet NFTs';
      setWalletNfts([]);
      setWalletNftPreviewMap({});
      setSelectedWalletNftId(null);
      setWalletScanAt(null);
      setWalletNftsError(message);
    } finally {
      setIsScanningWalletNfts(false);
    }
  };

  useEffect(() => {
    if (!mintAsNFT || nftActionMode !== 'sell') {
      return;
    }

    void refreshWalletNfts();
  }, [mintAsNFT, nftActionMode, walletConnector]);

  useEffect(() => {
    if (selectedImage && nftActionMode === 'sell') {
      setNftActionMode('mint');
    }
  }, [selectedImage, nftActionMode]);

  useEffect(() => {
    if (!selectedWalletNft) {
      return;
    }

    if (selectedWalletNft.contractType === 'ERC721') {
      setSellAmount('1');
      return;
    }

    const normalized = Number(sellAmount);
    if (!Number.isInteger(normalized) || normalized <= 0 || normalized > selectedWalletNft.amountOwned) {
      setSellAmount(String(Math.max(1, Math.min(selectedWalletNft.amountOwned, 1))));
    }
  }, [selectedWalletNftId]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image must be less than 10MB');
        return;
      }
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      if (nftActionMode === 'sell') {
        setNftActionMode('mint');
      }
      setError(null);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user?.id || '');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Upload error:', data.error);
        setError(data.error || 'Failed to upload image');
        return null;
      }

      return data.url;
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload image');
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      setError('Please login first');
      return;
    }

    // Require either caption or image
    if (!caption.trim() && !selectedImage) {
      setError('Please enter some text or upload an image');
      return;
    }

    if (mintAsNFT && nftActionMode === 'mint' && nftContractType === 'ERC1155') {
      const parsedSupply = Number(nft1155Supply);
      if (!Number.isInteger(parsedSupply) || parsedSupply <= 0) {
        setError('Amount for ERC-1155 must be a positive integer');
        return;
      }
    }

    if (mintAsNFT && nftActionMode === 'sell') {
      if (!isSellAvailable) {
        setError('Sell mode chỉ khả dụng khi không chọn ảnh. Hãy xóa ảnh để tiếp tục sell.');
        return;
      }

      if (!selectedWalletNft) {
        setError('Please select an NFT from your wallet to sell');
        return;
      }

      const normalizedPrice = sellPrice.trim();
      if (!normalizedPrice || Number(normalizedPrice) <= 0) {
        setError('Please enter a valid sell price in ETH');
        return;
      }

      if (selectedWalletNft.contractType === 'ERC1155') {
        const parsedAmount = Number(sellAmount);
        if (
          !Number.isInteger(parsedAmount) ||
          parsedAmount <= 0 ||
          parsedAmount > selectedWalletNft.amountOwned
        ) {
          setError(`Amount must be between 1 and ${selectedWalletNft.amountOwned}`);
          return;
        }
      }
    }

    setIsLoading(true);
    setError(null);

    let createdPostId: string | null = null;

    try {
      let imageUrl = '';
      
      // Upload image if selected
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        } else {
          throw new Error('Failed to upload image');
        }
      }

      // Create post via API
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl || null,
          caption: caption.trim() || null,
          visibility: 'public',
          nft_mint_expires_at:
            mintAsNFT && nftActionMode === 'mint' && nftMintExpiresAt
              ? new Date(nftMintExpiresAt).toISOString()
              : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create post');
      }

      const newPostId = data.post.id as string;
      createdPostId = newPostId;

      if (mintAsNFT) {
        if (nftActionMode === 'mint') {
          const amount = nftContractType === 'ERC1155' ? Number(nft1155Supply) : 1;

          const onChainResult = await mintPostOnChain({
            postId: newPostId,
            contractType: nftContractType,
            amount,
            tokenURI: imageUrl || null,
            mintDeadline: data.post?.nft_mint_expires_at || null,
            walletConnector,
          });

          await persistMintedPost({
            postId: newPostId,
            contractType: nftContractType,
            contractAddress: onChainResult.contractAddress,
            tokenId: onChainResult.tokenId,
            mintTxHash: onChainResult.mintTxHash,
          });
        } else {
          const selected = selectedWalletNft;
          if (!selected) {
            throw new Error('Please select an NFT to sell');
          }

          const amountToSell = selected.contractType === 'ERC1155' ? Number(sellAmount) : 1;
          const normalizedPrice = sellPrice.trim();

          const sellResult = await sellPostOnChain({
            contractType: selected.contractType,
            contractAddress: selected.contractAddress,
            tokenId: selected.tokenId,
            priceEth: normalizedPrice,
            amount: amountToSell,
            walletConnector,
          });

          await persistMintedPost({
            postId: newPostId,
            contractType: selected.contractType,
            contractAddress: selected.contractAddress,
            tokenId: selected.tokenId,
            mintTxHash: sellResult.listingTxHash,
            listingTxHash: sellResult.listingTxHash,
            listingId: sellResult.listingId,
            nftPrice: normalizedPrice,
          });
        }
      }

      router.push(`/post/${newPostId}?noCache=true`);
      router.refresh();
    } catch (err) {
      console.error('Error creating post/mint:', err);
      const message = err instanceof Error ? err.message : 'An error occurred';

      if (createdPostId) {
        setError(`Post was created but mint failed: ${message}`);
        router.push(`/post/${createdPostId}?noCache=true`);
        router.refresh();
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainLayout showRightPanel={false}>
      <div className="max-w-2xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors flex-shrink-0"
            >
              <ArrowLeft size={18} className="sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-dark dark:text-white truncate">{t('createPost')}</h1>
          </div>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            disabled={isLoading || (!caption.trim() && !selectedImage)}
            size="sm"
            className="flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 size={16} className="sm:w-[18px] sm:h-[18px] animate-spin mr-2" />
            ) : null}
            <span className="hidden sm:inline">
              {mintAsNFT ? (nftActionMode === 'sell' ? 'Post & Sell' : t('postAndMint')) : t('post')}
            </span>
            <span className="sm:hidden">{mintAsNFT ? (nftActionMode === 'sell' ? 'Sell' : 'Mint') : 'Post'}</span>
          </Button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Post Creator */}
        <Card className="mb-4">
          <div className="flex items-start gap-2 sm:gap-4">
            <Avatar src={user?.avatar_url} alt={user?.display_name || 'You'} size="md" className="flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={t('whatsOnYourMind')}
                className="w-full min-h-[80px] sm:min-h-[100px] resize-none text-sm sm:text-base text-dark dark:text-white bg-transparent placeholder:text-gray-400 focus:outline-none"
                rows={4}
              />
            </div>
          </div>
        </Card>

        {/* Image Upload Area */}
        <Card className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          
          {selectedImage ? (
            <div className="relative">
              <img
                src={selectedImage}
                alt="Selected"
                className="w-full aspect-square object-cover rounded-xl"
              />
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setImageFile(null);
                }}
                className="absolute top-3 right-3 p-2 bg-dark/50 hover:bg-dark/70 text-white rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-video border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-900/20 transition-colors"
            >
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <Upload size={28} className="text-gray-400" />
              </div>
              <div className="text-center">
                <p className="font-medium text-dark dark:text-white">{t('uploadImage')}</p>
                <p className="text-sm text-gray-400">{t('imageFormat')}</p>
              </div>
            </button>
          )}
        </Card>

        {/* Mint as NFT Option */}
        <Card className={mintAsNFT ? 'border-2 border-primary-400' : ''}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary-400 to-primary-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles size={16} className="sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-dark dark:text-white text-sm sm:text-base truncate">{t('mintAsNft')}</h3>
                <p className="text-xs sm:text-sm text-gray-500 truncate">{t('createNftOnBase')}</p>
              </div>
            </div>
            <button
              onClick={() => setMintAsNFT(!mintAsNFT)}
              className={`relative w-10 h-5 sm:w-12 sm:h-6 rounded-full transition-colors flex-shrink-0 ${
                mintAsNFT ? 'bg-primary-400' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`absolute left-0.5 sm:left-1 top-0.5 sm:top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  mintAsNFT ? 'translate-x-5 sm:translate-x-7' : 'translate-x-0.5 sm:translate-x-1'
                }`}
              />
            </button>
          </div>

          {mintAsNFT && (
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-4 animate-fadeIn">
              <div className={`grid ${isSellAvailable ? 'grid-cols-2' : 'grid-cols-1'} gap-2 rounded-xl bg-gray-100 dark:bg-gray-800 p-1`}>
                <button
                  type="button"
                  onClick={() => setNftActionMode('mint')}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    nftActionMode === 'mint'
                      ? 'bg-white dark:bg-gray-700 text-dark dark:text-white'
                      : 'text-gray-500 hover:text-dark dark:hover:text-white'
                  }`}
                >
                  Mint
                </button>
                {isSellAvailable ? (
                  <button
                    type="button"
                    onClick={() => setNftActionMode('sell')}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      nftActionMode === 'sell'
                        ? 'bg-white dark:bg-gray-700 text-dark dark:text-white'
                        : 'text-gray-500 hover:text-dark dark:hover:text-white'
                    }`}
                  >
                    Sell
                  </button>
                ) : null}
              </div>

              {!isSellAvailable && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                  Bạn đã chọn ảnh cho post, nên chỉ có thể Mint. Muốn Sell NFT ví thì hãy xóa ảnh trước.
                </div>
              )}

              {nftActionMode === 'mint' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      NFT Standard
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setNftContractType('ERC721')}
                        className={`p-3 rounded-xl border text-left transition-colors ${
                          nftContractType === 'ERC721'
                            ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-dark dark:text-white">NFT 721</p>
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
                        onClick={() => setNftContractType('ERC1155')}
                        className={`p-3 rounded-xl border text-left transition-colors ${
                          nftContractType === 'ERC1155'
                            ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-dark dark:text-white">NFT 1155</p>
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

                  {nftContractType === 'ERC1155' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Amount (ERC-1155)
                      </label>
                      <input
                        type="number"
                        value={nft1155Supply}
                        onChange={(e) => setNft1155Supply(e.target.value)}
                        step="1"
                        min="1"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 text-dark dark:text-white"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Mint Expiry Time
                    </label>
                    <input
                      type="datetime-local"
                      value={nftMintExpiresAt}
                      onChange={(e) => setNftMintExpiresAt(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 text-dark dark:text-white"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Select NFT from your wallet</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void refreshWalletNfts()}
                      disabled={isScanningWalletNfts}
                    >
                      {isScanningWalletNfts ? 'Scanning...' : 'Rescan'}
                    </Button>
                  </div>

                  {walletNftsError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                      {walletNftsError}
                    </div>
                  )}

                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {isScanningWalletNfts ? (
                      <div className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm text-gray-500">
                        Scanning wallet on Base Sepolia...
                      </div>
                    ) : walletNfts.length === 0 ? (
                      <div className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm text-gray-500">
                        No NFT found in connected wallet.
                      </div>
                    ) : (
                      walletNfts.map((item) => {
                        const optionId = getWalletNftOptionId(item);
                        const isSelected = optionId === selectedWalletNftId;
                        const preview = walletNftPreviewMap[optionId];

                        return (
                          <button
                            key={optionId}
                            type="button"
                            onClick={() => {
                              setSelectedWalletNftId(optionId);
                              setSellAmount('1');
                            }}
                            className={`w-full rounded-xl border p-3 text-left transition-colors ${
                              isSelected
                                ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                                {preview?.imageUrl ? (
                                  <img src={preview.imageUrl} alt={preview.name || `NFT ${item.tokenId}`} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[11px] text-gray-400">No image</div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-semibold text-dark dark:text-white text-sm truncate">
                                    {preview?.name || `${item.contractType} NFT`}
                                  </p>
                                  <Badge variant="default" size="sm">
                                    {item.contractType === 'ERC1155' ? `${item.amountOwned} owned` : '1 owned'}
                                  </Badge>
                                </div>
                                <p className="mt-1 text-xs text-gray-500">Token {formatTokenIdShort(item.tokenId)} · {item.contractType}</p>
                                <p className="mt-1 text-xs text-gray-500 truncate">{formatAddress(item.contractAddress)}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {selectedWalletNft && (
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                      <div className="flex gap-3">
                        <div className="w-20 h-20 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                          {selectedWalletNftPreview?.imageUrl ? (
                            <img
                              src={selectedWalletNftPreview.imageUrl}
                              alt={selectedWalletNftPreview.name || `NFT ${selectedWalletNft.tokenId}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No image</div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm min-w-0 flex-1">
                          <span className="text-gray-500">Token ID</span>
                          <span className="font-mono text-dark dark:text-white truncate">{formatTokenIdShort(selectedWalletNft.tokenId)}</span>
                          <span className="text-gray-500">Type</span>
                          <span className="text-dark dark:text-white">{selectedWalletNft.contractType}</span>
                          <span className="text-gray-500">Owned</span>
                          <span className="text-dark dark:text-white">
                            {selectedWalletNft.contractType === 'ERC1155' ? selectedWalletNft.amountOwned : 1}
                          </span>
                          <span className="text-gray-500">Time</span>
                          <span className="text-dark dark:text-white">{walletScanAt ? new Date(walletScanAt).toLocaleString('vi-VN') : '-'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedWalletNft && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Amount to Sell
                      </label>
                      <input
                        type="number"
                        value={sellAmount}
                        onChange={(e) => setSellAmount(e.target.value)}
                        step="1"
                        min="1"
                        max={selectedWalletNft.contractType === 'ERC1155' ? selectedWalletNft.amountOwned : 1}
                        disabled={selectedWalletNft.contractType === 'ERC721'}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 text-dark dark:text-white disabled:opacity-60"
                      />
                      <p className="mt-2 text-xs text-gray-400">
                        {selectedWalletNft.contractType === 'ERC721'
                          ? 'ERC-721 always sells exactly 1 item'
                          : `Maximum: ${selectedWalletNft.amountOwned}`}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sell Price (ETH)
                    </label>
                    <input
                      type="number"
                      value={sellPrice}
                      onChange={(e) => setSellPrice(e.target.value)}
                      step="0.0001"
                      min="0"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 text-dark dark:text-white"
                    />
                  </div>
                </>
              )}

              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('network')}</span>
                  <Badge variant="default">Base Sepolia</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('gasFee')}</span>
                  <span className="text-dark dark:text-white">~0.001 ETH</span>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => router.back()}
          >
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleSubmit}
            disabled={isLoading || (!caption.trim() && !selectedImage)}
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin mr-2" />
            ) : mintAsNFT ? (
              <>
                <Sparkles size={18} className="mr-2" />
                {nftActionMode === 'sell' ? 'Post & Sell' : t('postAndMint')}
              </>
            ) : (
              t('post')
            )}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
