'use client';

import { cn, formatDate, formatNumber } from '@/lib/utils';
import { Avatar, Badge, Button, Card } from '@/components/common';
import { Heart, MessageCircle, Repeat2, Share, MoreHorizontal, Sparkles, Eye, EyeOff, Trash2, Link as LinkIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import type { Post } from '@/types';
import { useAuth, useTheme } from '@/providers';

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
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [isReposted, setIsReposted] = useState(false);
  const [repostsCount, setRepostsCount] = useState(post.reposts_count);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const isOwner = user?.id === post.user_id;

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

  return (
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
            {post.is_nft && (
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
      {post.is_nft && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-gradient-to-r from-primary-50 to-orange-50 dark:from-primary-900/30 dark:to-orange-900/30 rounded-xl mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center shadow-soft flex-shrink-0">
              <Sparkles size={16} className="text-primary-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Price</p>
              <p className="font-semibold text-dark dark:text-white text-sm sm:text-base">{post.nft_price || '0.05'} ETH</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Badge variant="default" size="sm" className="text-xs">
              Base Sepolia
            </Badge>
            {post.nft_status === 'listed' && (
              <Button size="sm" variant="primary" className="flex-1 sm:flex-none">
                Buy NFT
              </Button>
            )}
            {!post.nft_status && (
              <Button size="sm" variant="outline" className="flex-1 sm:flex-none">
                Mint as NFT
              </Button>
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
  );
};

export default PostCard;
