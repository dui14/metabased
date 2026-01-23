'use client';

import { cn, formatDate, formatNumber } from '@/lib/utils';
import { Avatar, Badge, Button, Card, Input } from '@/components/common';
import { Heart, MessageCircle, Repeat2, Share, MoreHorizontal, Sparkles, ExternalLink, Copy, Check, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Post, Comment } from '@/types';

interface PostDetailProps {
  post: Post;
  comments?: Comment[];
}

const mockComments: Comment[] = [
  {
    id: '1',
    post_id: '1',
    user_id: '1',
    content: 'This is absolutely stunning! 🔥',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    user: { username: 'alex_nft', display_name: 'Alex Thompson' },
  },
  {
    id: '2',
    post_id: '1',
    user_id: '2',
    content: 'Love the colors and composition',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    user: { username: 'sarah_art', display_name: 'Sarah Miller' },
  },
  {
    id: '3',
    post_id: '1',
    user_id: '3',
    content: 'Already minted! Great work 👏',
    created_at: new Date(Date.now() - 10800000).toISOString(),
    user: { username: 'mike_collector', display_name: 'Mike Chen' },
  },
];

const PostDetail = ({ post, comments = mockComments }: PostDetailProps) => {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [newComment, setNewComment] = useState('');
  const [copied, setCopied] = useState(false);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-gray-500 hover:text-dark dark:hover:text-white mb-4 transition-colors"
      >
        <ArrowLeft size={18} />
        <span className="text-sm font-medium">Back</span>
      </button>

      {/* Main Content */}
      {post.image_url && (
        <Card padding="none" className="overflow-hidden mb-4">
          <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
            <Image
              src={post.image_url}
              alt={post.caption || 'Post image'}
              fill
              className="object-cover"
              priority
            />
            {post.is_nft && (
              <div className="absolute top-4 right-4">
                <Badge variant="nft" size="md">
                  <Sparkles size={12} className="mr-1" />
                  Minted on Base Sepolia
                </Badge>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Creator Info */}
      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <Link href={`/profile/${post.user_id}`} className="flex items-center gap-3">
            <Avatar src={post.user?.avatar_url} alt={post.user?.username || 'User'} size="lg" />
            <div>
              <p className="font-semibold text-dark dark:text-white hover:underline">
                {post.user?.display_name || post.user?.username}
              </p>
              <p className="text-sm text-gray-400">@{post.user?.username}</p>
            </div>
          </Link>
          <Button variant="primary" size="sm">
            Follow
          </Button>
        </div>

        {/* Caption */}
        {post.caption && (
          <p className="text-dark dark:text-white mt-4 text-base leading-relaxed">{post.caption}</p>
        )}

        {/* Timestamp */}
        <p className="text-sm text-gray-400 mt-3">
          {new Date(post.created_at).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>

        {/* Engagement Stats */}
        <div className="flex items-center gap-6 py-4 mt-4 border-y border-gray-100 dark:border-gray-800">
          <div>
            <span className="font-semibold text-dark dark:text-white">{formatNumber(likesCount)}</span>
            <span className="text-gray-500 ml-1">Likes</span>
          </div>
          <div>
            <span className="font-semibold text-dark dark:text-white">{formatNumber(post.comments_count)}</span>
            <span className="text-gray-500 ml-1">Comments</span>
          </div>
          <div>
            <span className="font-semibold text-dark dark:text-white">{formatNumber(post.reposts_count)}</span>
            <span className="text-gray-500 ml-1">Reposts</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <button
            onClick={handleLike}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl transition-colors',
              isLiked ? 'text-red-500 bg-red-50 dark:bg-red-900/30' : 'text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30'
            )}
          >
            <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
            <span className="font-medium">Like</span>
          </button>

          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-500 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors">
            <MessageCircle size={20} />
            <span className="font-medium">Comment</span>
          </button>

          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors">
            <Repeat2 size={20} />
            <span className="font-medium">Repost</span>
          </button>

          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-500 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
          >
            {copied ? <Check size={20} /> : <Share size={20} />}
            <span className="font-medium">{copied ? 'Copied!' : 'Share'}</span>
          </button>
        </div>
      </Card>

      {/* NFT Panel */}
      {post.is_nft && (
        <Card className="mb-4 border-2 border-primary-200 dark:border-primary-800">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-500 rounded-xl flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-dark dark:text-white">NFT Details</h3>
              <Badge variant="default" size="sm">Base Sepolia</Badge>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">Token ID</span>
              <span className="font-mono text-dark dark:text-white">#{post.nft_token_id || '1234'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">Contract</span>
              <span className="font-mono text-sm text-dark dark:text-white">0x1234...5678</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-500">Token URI</span>
              <Link href="#" className="text-primary-500 hover:underline flex items-center gap-1">
                View Metadata <ExternalLink size={14} />
              </Link>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500">Status</span>
              <Badge variant="success" size="sm">Listed for Sale</Badge>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary-50 to-orange-50 dark:from-primary-900/30 dark:to-orange-900/30 rounded-xl">
            <div>
              <p className="text-sm text-gray-500">Current Price</p>
              <p className="text-2xl font-bold text-dark dark:text-white">{post.nft_price || '0.05'} ETH</p>
              <p className="text-xs text-gray-400">≈ $125.00 USD</p>
            </div>
            <Button variant="primary" size="lg" className="px-8">
              Buy NFT
            </Button>
          </div>

          {/* Transaction Status */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">Transaction History</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse-soft" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Minted 2 hours ago</span>
            </div>
          </div>
        </Card>
      )}

      {/* Comments Section */}
      <Card>
        <h3 className="font-semibold text-dark dark:text-white mb-4">Comments ({comments.length})</h3>

        {/* Comment Input */}
        <div className="flex items-start gap-3 mb-6">
          <Avatar alt="You" size="sm" />
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-sm text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            />
            <Button variant="primary" size="md" disabled={!newComment.trim()}>
              Post
            </Button>
          </div>
        </div>

        {/* Comments List */}
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-3">
              <Avatar src={comment.user?.avatar_url} alt={comment.user?.username || 'User'} size="sm" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-dark dark:text-white text-sm">
                    {comment.user?.display_name || comment.user?.username}
                  </span>
                  <span className="text-xs text-gray-400">
                    @{comment.user?.username}
                  </span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-400">
                    {formatDate(comment.created_at)}
                  </span>
                </div>
                <p className="text-dark dark:text-white text-sm mt-1">{comment.content}</p>
                <div className="flex items-center gap-4 mt-2">
                  <button className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                    Like
                  </button>
                  <button className="text-xs text-gray-400 hover:text-primary-500 transition-colors">
                    Reply
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default PostDetail;
