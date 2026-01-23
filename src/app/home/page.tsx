'use client';

import { MainLayout } from '@/components/layout';
import { PostCard } from '@/components/post';
import { Button, Avatar } from '@/components/common';
import { Image as ImageIcon, Sparkles, TrendingUp, Users, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/providers';
import Link from 'next/link';
import type { Post } from '@/types';

export default function HomePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [trendingUsers, setTrendingUsers] = useState<Array<{ id: string; username: string; display_name: string; followers_count: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch posts từ Supabase
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch('/api/posts');
        if (response.ok) {
          const data = await response.json();
          setPosts(data.posts || []);
        }
      } catch (error) {
        console.error('Error fetching posts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // Fetch trending users từ Supabase
  useEffect(() => {
    const fetchTrendingUsers = async () => {
      try {
        const response = await fetch('/api/users/trending');
        if (response.ok) {
          const data = await response.json();
          setTrendingUsers(data.users || []);
        }
      } catch (error) {
        console.error('Error fetching trending users:', error);
      }
    };

    fetchTrendingUsers();
  }, []);

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Create Post Card - chỉ hiện khi đã đăng nhập */}
        {isAuthenticated && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-soft p-4 mb-6">
            <div className="flex items-center gap-4">
              <Avatar 
                src={user?.avatar_url} 
                alt={user?.display_name || 'You'} 
                size="md" 
              />
              <div className="flex-1">
                <Link href="/create">
                  <input
                    type="text"
                    placeholder="What's on your mind?"
                    className="w-full py-3 px-4 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 cursor-pointer"
                    readOnly
                  />
                </Link>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <Link href="/create" className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
                  <ImageIcon size={18} className="text-primary-500" />
                  <span className="text-sm font-medium">Photo</span>
                </Link>
                <Link href="/create" className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
                  <Sparkles size={18} className="text-primary-500" />
                  <span className="text-sm font-medium">NFT</span>
                </Link>
              </div>
              <Link href="/create">
                <Button variant="primary" size="sm">
                  Post
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Trending Section - chỉ hiện khi có users */}
        {trendingUsers.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-soft p-4 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-primary-500" />
              <h3 className="font-semibold text-dark">Trending Creators</h3>
            </div>
            <div className="space-y-3">
              {trendingUsers.map((trendingUser) => (
                <Link 
                  key={trendingUser.id} 
                  href={`/profile/${trendingUser.username}`}
                  className="flex items-center justify-between hover:bg-gray-50 rounded-xl p-2 -mx-2 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar alt={trendingUser.display_name || trendingUser.username} size="sm" />
                    <div>
                      <p className="text-sm font-semibold text-dark">{trendingUser.display_name || trendingUser.username}</p>
                      <p className="text-xs text-gray-400">@{trendingUser.username}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {trendingUser.followers_count} followers
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Feed */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
            </div>
          ) : posts.length > 0 ? (
            posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-soft p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ImageIcon size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-dark mb-2">No posts yet</h3>
              <p className="text-gray-500 mb-4">
                Be the first to share something amazing!
              </p>
              {isAuthenticated && (
                <Link href="/create">
                  <Button variant="primary">Create Post</Button>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Load More - chỉ hiện khi có posts */}
        {posts.length > 0 && (
          <div className="flex justify-center mt-8">
            <Button variant="outline" size="md">
              Load More
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
