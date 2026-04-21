'use client';

import { cn, formatDate, formatNumber } from '@/lib/utils';
import { Avatar, Badge, Button, Card, Modal } from '@/components/common';
import { Heart, MessageCircle, Repeat2, Share, MoreHorizontal, Sparkles, Eye, EyeOff, Trash2, Link as LinkIcon, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import type { Post } from '@/types';
import { useAuth, useTheme } from '@/providers';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { buyPostListingOnChain } from '@/lib/nft-mint';
import { useMarketplaceListingStatus } from '@/lib/useMarketplaceListingStatus';

interface PostCardProps {
  post: Post;
  onLike?: () => void;
  onComment?: () => void;
  onRepost?: () => void;
  onShare?: () => void;
  onUpdate?: (post: Post) => void;
  onDelete?: (postId: string) => void;
}

const PostCard = ({ post, onLike, onComment, onRepost, onShare, onUpdate, onDelete }: PostCardProps) => {
  const { user } = useAuth();
  const { t } = useTheme();
  const { primaryWallet } = useDynamicContext();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [isReposted, setIsReposted] = useState(false);
  const [repostsCount, setRepostsCount] = useState(post.reposts_count);
  const [showMenu, setShowMenu] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyStatus, setBuyStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [buyTxHash, setBuyTxHash] = useState('');
  const [buyErrorMessage, setBuyErrorMessage] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwner = user?.id === post.user_id;
  const isNft = post.is_nft;
  const nftPrice = post.nft_price?.trim() || null;
  const nftListingId = post.nft_listing_id || null;
  const nftStatus = post.nft_status || 'minted';
  const isListed = nftStatus === 'listed' && Boolean(nftListingId && nftPrice);
  const { listing: liveListing, refresh: refreshListing } = useMarketplaceListingStatus(nftListingId, {
    enabled: isListed,
    pollingMs: 5000,
  });
  const isSoldOut = nftStatus === 'sold' || (isListed && !!liveListing?.isSoldOut);
  const canBuyNft = isListed && !isSoldOut;
  const walletConnector = primaryWallet?.connector;

  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!user?.id) return;

      try {
        const response = await fetch(`/api/likes?user_id=${user.id}&post_id=${post.id}`);
        if (response.ok) {
          const data = await response.json();
          setIsLiked(data.isLiked);
        }
      } catch (error) {
        console.error('Error checking like status:', error);
      }
    };

    checkLikeStatus();
  }, [user?.id, post.id]);

  useEffect(() => {
    const checkRepostStatus = async () => {
      if (!user?.id) return;

      try {
        const response = await fetch(`/api/reposts?user_id=${user.id}&post_id=${post.id}`);
        if (response.ok) {
          const data = await response.json();
          setIsReposted(!!data.isReposted);
        }
      } catch (error) {
        console.error('Error checking repost status:', error);
      }
    };

    checkRepostStatus();
  }, [user?.id, post.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLike = async () => {
    if (!user?.id) {
      alert('Please login first');
      return;
    }

    const newIsLiked = !isLiked;
    const newLikesCount = newIsLiked ? likesCount + 1 : likesCount - 1;

    setIsLiked(newIsLiked);
    setLikesCount(newLikesCount);

    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          post_id: post.id,
          action: newIsLiked ? 'like' : 'unlike',
        }),
      });

      if (!response.ok) {
        setIsLiked(!newIsLiked);
        setLikesCount(likesCount);
        console.error('Failed to like/unlike post');
      }
    } catch (error) {
      setIsLiked(!newIsLiked);
      setLikesCount(likesCount);
      console.error('Error liking/unliking post:', error);
    }

    onLike?.();
  };

  const handleRepost = async () => {
    if (!user?.id) {
      alert('Please login first');
      return;
    }

    const newIsReposted = !isReposted;
    const newRepostsCount = newIsReposted ? repostsCount + 1 : Math.max(repostsCount - 1, 0);

    setIsReposted(newIsReposted);
    setRepostsCount(newRepostsCount);

    try {
      const response = await fetch('/api/reposts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          post_id: post.id,
          action: newIsReposted ? 'repost' : 'unrepost',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setIsReposted(!newIsReposted);
        setRepostsCount(repostsCount);
        alert(data.error || 'Failed to repost');
      }
    } catch (error) {
      setIsReposted(!newIsReposted);
      setRepostsCount(repostsCount);
      console.error('Error reposting:', error);
    }

    onRepost?.();
  };

  const handleCopyUrl = async () => {
    const url = `${window.location.origin}/post/${post.id}`;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        alert(t('urlCopied') || 'URL copied to clipboard!');
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          alert(t('urlCopied') || 'URL copied to clipboard!');
        } catch (err) {
          console.error('Fallback: Could not copy text', err);
          alert(t('errorOccurred') || 'Failed to copy URL');
        }
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error('Error copying URL:', error);
      alert(t('errorOccurred') || 'Failed to copy URL');
    }
    setShowMenu(false);
  };

  const handleToggleVisibility = async () => {
    const newVisibility = post.visibility === 'public' ? 'private' : 'public';
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: newVisibility }),
      });

      if (response.ok) {
        const data = await response.json();
        onUpdate?.(data.post);
      }
    } catch (error) {
      console.error('Error updating visibility:', error);
    }
    setShowMenu(false);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('dynamic_authentication_token');
      const headers: HeadersInit = {};

      if (token && token !== 'null' && token !== 'undefined') {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
        headers,
      });

      if (response.ok) {
        alert('Post deleted successfully!');
        onDelete?.(post.id);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete post. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('An error occurred while deleting the post.');
    }
    setShowMenu(false);
  };

  const closeBuyModal = () => {
    setShowBuyModal(false);
    setBuyStatus('idle');
    setBuyTxHash('');
    setBuyErrorMessage('');
  };

  const handleBuyNft = async () => {
    if (!canBuyNft || !nftListingId || !nftPrice) return;

    setBuyStatus('pending');
    setBuyTxHash('');
    setBuyErrorMessage('');
    setShowBuyModal(true);
    setIsBuying(true);
    try {
      const result = await buyPostListingOnChain({
        listingId: nftListingId,
        quantity: 1,
        unitPriceEth: nftPrice,
        walletConnector,
      });
      setBuyTxHash(result.txHash);
      setBuyStatus('success');
      await refreshListing();

      // If listing had only one remaining item before this purchase, reflect sold state immediately.
      if ((liveListing?.remainingQuantity ?? 1) <= 1) {
        onUpdate?.({ ...post, nft_status: 'sold' } as Post);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to buy NFT';
      setBuyErrorMessage(message);
      setBuyStatus('error');
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <>
      <Card className="animate-fadeIn" hover>
      {post.is_repost && (
        <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-green-50 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
          <Repeat2 size={14} />
          <span>Reposted {post.reposted_at ? formatDate(post.reposted_at) : ''}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <Link href={`/user/${post.user?.username || post.user_id}`} className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <Avatar src={post.user?.avatar_url} alt={post.user?.username || 'User'} size="md" className="flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-dark dark:text-white hover:underline truncate text-sm sm:text-base">
              {post.user?.display_name || post.user?.username}
            </p>
            <div className="flex items-center gap-1 sm:gap-2 text-xs text-gray-400 flex-wrap">
              <span className="truncate max-w-[100px] sm:max-w-none">@{post.user?.username}</span>
              <span className="hidden sm:inline">·</span>
              <span className="truncate">{formatDate(post.created_at)}</span>
              {post.visibility === 'private' && (
                <>
                  <span className="hidden sm:inline">·</span>
                  <EyeOff size={12} className="inline flex-shrink-0" />
                </>
              )}
            </div>
          </div>
        </Link>
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <MoreHorizontal size={18} className="text-gray-400" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-2 z-50">
              <button
                onClick={handleCopyUrl}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <LinkIcon size={16} />
                Copy URL
              </button>

              {isOwner && (
                <>
                  <button
                    onClick={handleToggleVisibility}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    {post.visibility === 'public' ? <EyeOff size={16} /> : <Eye size={16} />}
                    Make {post.visibility === 'public' ? 'Private' : 'Public'}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Delete Post
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <Link href={`/post/${post.id}`}>
        {/* Caption */}
        {post.caption && (
          <div className={cn(
            "text-dark dark:text-white break-words",
            post.image_url ? "text-sm mb-3 line-clamp-3" : "text-base mb-3 py-2"
          )}>
            <p>{post.caption}</p>
          </div>
        )}

        {/* Image */}
        {post.image_url && (
          <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-3">
            <Image
              src={post.image_url}
              alt={post.caption || 'Post image'}
              fill
              className="object-cover hover:scale-105 transition-transform duration-300"
              unoptimized
            />
            {isNft && (
              <div className="absolute top-3 right-3">
                <Badge variant="nft" size="md">
                  <Sparkles size={12} className="mr-1" />
                  NFT
                </Badge>
              </div>
            )}
          </div>
        )}
      </Link>

      {/* NFT Section */}
      {isNft && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-gradient-to-r from-primary-50 to-orange-50 dark:from-primary-900/30 dark:to-orange-900/30 rounded-xl mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center shadow-soft flex-shrink-0">
              <Sparkles size={16} className="text-primary-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <p className="font-semibold text-dark dark:text-white text-sm sm:text-base capitalize">{nftStatus}</p>
              {isListed && <p className="text-xs text-gray-500">{nftPrice} ETH</p>}
              {isListed && liveListing && (
                <p className="text-xs text-gray-500">
                  Available: {liveListing.remainingQuantity}/{liveListing.quantity}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Badge variant="default" size="sm" className="text-xs">
              Base Sepolia
            </Badge>
            {canBuyNft ? (
              <Button
                size="sm"
                variant="primary"
                className="flex-1 sm:flex-none"
                onClick={handleBuyNft}
                disabled={isBuying}
              >
                {isBuying ? 'Buying...' : 'Buy NFT'}
              </Button>
            ) : isListed || nftStatus === 'sold' ? (
              <span className="text-xs font-semibold text-red-500">Sold out</span>
            ) : (
              <span className="text-xs text-gray-500">Sell in Create &gt; Sell</span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={onComment}
          className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg text-gray-500 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
        >
          <MessageCircle size={16} className="sm:w-[18px] sm:h-[18px]" />
          <span className="text-xs sm:text-sm font-medium">{formatNumber(post.comments_count)}</span>
        </button>

        <button
          onClick={handleLike}
          className={cn(
            'flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg transition-colors',
            isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30'
          )}
        >
          <Heart size={16} className="sm:w-[18px] sm:h-[18px]" fill={isLiked ? 'currentColor' : 'none'} />
          <span className="text-xs sm:text-sm font-medium">{formatNumber(likesCount)}</span>
        </button>

        <button
          onClick={handleRepost}
          className={cn(
            'flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg transition-colors',
            isReposted
              ? 'text-green-600 bg-green-50 dark:bg-green-900/30'
              : 'text-gray-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30'
          )}
        >
          <Repeat2 size={16} className="sm:w-[18px] sm:h-[18px]" />
          <span className="text-xs sm:text-sm font-medium">{formatNumber(repostsCount)}</span>
        </button>

        <button
          onClick={() => {
            handleCopyUrl();
            onShare?.();
          }}
          className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg text-gray-500 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
        >
          <Share size={16} className="sm:w-[18px] sm:h-[18px]" />
        </button>
      </div>
    </Card>

    {/* Buy NFT Modal */}
    <Modal
      isOpen={showBuyModal}
      onClose={buyStatus === 'success' || buyStatus === 'error' ? closeBuyModal : () => {}}
      title="Buy NFT"
      size="sm"
    >
      {buyStatus === 'pending' && (
        <div className="text-center py-8">
          <Loader2 size={48} className="mx-auto text-primary-500 animate-spin mb-4" />
          <p className="font-semibold text-dark dark:text-white">Processing transaction on-chain...</p>
          <p className="text-sm text-gray-400 mt-2">Please don&apos;t close this window</p>
        </div>
      )}
      {buyStatus === 'success' && (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <h4 className="text-lg font-semibold text-dark dark:text-white mb-1">Purchase Successful!</h4>
          <p className="text-sm text-gray-500 mb-4">You now own this NFT on Base Sepolia</p>
          {buyTxHash && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl mb-4 text-left">
              <p className="text-xs text-gray-500 mb-1">Transaction Hash</p>
              <a
                href={`https://sepolia.basescan.org/tx/${buyTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-primary-500 hover:underline break-all flex items-center gap-1"
              >
                {buyTxHash.slice(0, 20)}...{buyTxHash.slice(-10)}
                <ExternalLink size={12} className="flex-shrink-0" />
              </a>
            </div>
          )}
          <Button variant="primary" className="w-full" onClick={closeBuyModal}>Done</Button>
        </div>
      )}
      {buyStatus === 'error' && (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h4 className="text-lg font-semibold text-dark dark:text-white mb-2">Transaction Failed</h4>
          {buyErrorMessage && (
            <p className="text-sm text-red-500 mb-4 break-words">{buyErrorMessage}</p>
          )}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={closeBuyModal}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={() => { closeBuyModal(); void handleBuyNft(); }}>Retry</Button>
          </div>
        </div>
      )}
    </Modal>
    </>
  );
};

export default PostCard;
