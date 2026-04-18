'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, Avatar, Button } from '@/components/common';
import { Search, UserPlus, TrendingUp, Users, Loader2 } from 'lucide-react';
import { useTheme, useAuth } from '@/providers';
import Link from 'next/link';

interface DiscoverUser {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  followers_count: number;
  is_following?: boolean;
}

interface DiscoverPost {
  id: string;
  caption: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  user?: {
    username?: string;
    display_name?: string | null;
  } | null;
}

const trendingTags = ['#NFT', '#BaseSepolia', '#DigitalArt', '#Web3', '#Crypto', '#Photography'];

export default function DiscoverPage() {
  const router = useRouter();
  const { t } = useTheme();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'trending'>('users');
  const [users, setUsers] = useState<DiscoverUser[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<DiscoverPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpeningPostId, setIsOpeningPostId] = useState<string | null>(null);
  const [hasSearchedUsers, setHasSearchedUsers] = useState(false);
  const [hasSearchedTrending, setHasSearchedTrending] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const handleFollow = async (targetUserId: string) => {
    if (!user?.id) {
      console.log('User not logged in');
      return;
    }

    const isFollowing = followingIds.has(targetUserId);
    const action = isFollowing ? 'unfollow' : 'follow';

    try {
      console.log(`${action} user:`, targetUserId);
      
      const response = await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          follower_id: user.id,
          following_id: targetUserId,
          action
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.log('Follow error:', errorData);
        return;
      }

      const result = await response.json();
      console.log('Follow result:', result);

      const newFollowingIds = new Set(followingIds);
      if (result.action === 'followed') {
        newFollowingIds.add(targetUserId);
      } else {
        newFollowingIds.delete(targetUserId);
      }
      setFollowingIds(newFollowingIds);

      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === targetUserId
            ? { ...u, followers_count: u.followers_count + (result.action === 'followed' ? 1 : -1) }
            : u
        )
      );
    } catch (error) {
      console.log('Error handling follow:', error);
    }
  };

  const checkFollowingStatus = async (userIds: string[]) => {
    if (!user?.id || userIds.length === 0) return;

    const checks = userIds.map(async (userId) => {
      try {
        const response = await fetch(`/api/follows?follower_id=${user.id}&following_id=${userId}`);
        const data = await response.json();
        return { userId, isFollowing: data.isFollowing };
      } catch (error) {
        console.log('Error checking follow status:', error);
        return { userId, isFollowing: false };
      }
    });

    const results = await Promise.all(checks);
    const newFollowingIds = new Set<string>();
    results.forEach(({ userId, isFollowing }) => {
      if (isFollowing) newFollowingIds.add(userId);
    });
    setFollowingIds(newFollowingIds);
  };

  const handleSearch = async () => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;
    
    try {
      setIsLoading(true);

      if (activeTab === 'trending') {
        setHasSearchedTrending(true);

        const response = await fetch(
          `/api/posts?q=${encodeURIComponent(trimmedQuery)}&limit=20&offset=0&noCache=true`
        );

        if (response.ok) {
          const data = await response.json();
          setTrendingPosts(data.posts || []);
        } else {
          setTrendingPosts([]);
        }

        return;
      }

      setHasSearchedUsers(true);
      const response = await fetch('/api/users/discover');
      if (response.ok) {
        const data = await response.json();
        const allUsers = data.users || [];
        const normalizedQuery = trimmedQuery.toLowerCase();
        const filtered = allUsers.filter(
          (user: DiscoverUser) =>
            user.username?.toLowerCase().includes(normalizedQuery) ||
            user.display_name?.toLowerCase().includes(normalizedQuery)
        );
        setUsers(filtered);
        
        if (filtered.length > 0) {
          await checkFollowingStatus(filtered.map((u: DiscoverUser) => u.id));
        }
      }
    } catch (error) {
      console.log(
        activeTab === 'trending' ? 'Error fetching trending posts:' : 'Error fetching users:',
        error
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenTrendingPost = async (postId: string) => {
    try {
      setIsOpeningPostId(postId);

      await fetch(`/api/posts/${postId}?noCache=true`, {
        cache: 'no-store',
      });
    } catch (error) {
      console.log('Error preloading post detail:', error);
    } finally {
      setIsOpeningPostId(null);
      router.push(`/post/${postId}`);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-dark dark:text-white mb-6">{t('discover')}</h1>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={
              activeTab === 'trending' ? 'Search posts by caption...' : t('findUsers')
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-12 pr-16 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary-400 dark:text-white"
          />
          <button
            onClick={handleSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
          >
            {t('search')}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'users' ? 'bg-white text-dark shadow-soft' : 'text-gray-500'
            }`}
          >
            <Users size={18} />
            Users
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'trending' ? 'bg-white text-dark shadow-soft' : 'text-gray-500'
            }`}
          >
            <TrendingUp size={18} />
            Trending
          </button>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-3">
            {!hasSearchedUsers ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t('enterSearchQuery')}</p>
              </div>
            ) : isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
              </div>
            ) : users.length > 0 ? (
              users.map((user) => (
                <Card key={user.id} hover>
                  <div className="flex items-center justify-between">
                    <Link href={`/user/${user.username}`} className="flex items-center gap-3 flex-1">
                      <Avatar src={user.avatar_url} alt={user.display_name || user.username} size="lg" />
                      <div>
                        <p className="font-semibold text-dark dark:text-white hover:underline">{user.display_name || user.username}</p>
                        <p className="text-sm text-gray-400">@{user.username}</p>
                        {user.bio && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{user.bio}</p>}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span>{user.followers_count?.toLocaleString() || 0} {t('followers')}</span>
                        </div>
                      </div>
                    </Link>
                    <Button 
                      variant={followingIds.has(user.id) ? "outline" : "primary"} 
                      size="sm"
                      onClick={() => handleFollow(user.id)}
                    >
                      {followingIds.has(user.id) ? t('following') : t('follow')}
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="text-center py-12">
                <Users size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">{t('noUsersFound')}</p>
              </Card>
            )}
          </div>
        )}

        {/* Trending Tab */}
        {activeTab === 'trending' && (
          <div className="space-y-4">
            <Card>
              <h3 className="font-semibold text-dark dark:text-white mb-4">Search caption results</h3>
              {!hasSearchedTrending ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Enter text and press Search to find matching post captions.
                </p>
              ) : isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
                </div>
              ) : trendingPosts.length > 0 ? (
                <div className="space-y-2">
                  {trendingPosts.map((post) => (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => handleOpenTrendingPost(post.id)}
                      disabled={isOpeningPostId === post.id}
                      className="w-full text-left p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-300 hover:bg-primary-50/40 dark:hover:bg-gray-800 transition-colors disabled:opacity-70"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-dark dark:text-white break-words">
                            {post.caption}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            @{post.user?.username || 'unknown'}
                            {post.user?.display_name ? ` - ${post.user.display_name}` : ''}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
                            <span>{post.likes_count || 0} likes</span>
                            <span>{post.comments_count || 0} comments</span>
                            <span>{post.reposts_count || 0} reposts</span>
                          </div>
                        </div>
                        <div className="pt-1 text-primary-500">
                          {isOpeningPostId === post.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <span className="text-xs font-semibold">Open</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No posts found with this caption text.
                </p>
              )}
            </Card>

            <Card>
              <h3 className="font-semibold text-dark dark:text-white mb-4">{t('trendingTags')}</h3>
              <div className="flex flex-wrap gap-2">
                {trendingTags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/search?q=${encodeURIComponent(tag)}`}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-primary-50 dark:hover:bg-primary-900 hover:text-primary-500 dark:text-gray-300 rounded-full text-sm font-medium transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="font-semibold text-dark dark:text-white mb-4">{t('suggestedForYou')}</h3>
              <div className="space-y-3">
                {users.length > 0 ? (
                  users.slice(0, 3).map((user) => (
                    <div key={user.id} className="flex items-center justify-between py-2">
                      <Link href={`/user/${user.username}`} className="flex items-center gap-3">
                        <Avatar src={user.avatar_url} alt={user.display_name || user.username} size="md" />
                        <div>
                          <p className="font-semibold text-dark dark:text-white text-sm">{user.display_name || user.username}</p>
                          <p className="text-xs text-gray-400">@{user.username}</p>
                        </div>
                      </Link>
                      <Button 
                        variant={followingIds.has(user.id) ? "outline" : "primary"} 
                        size="sm"
                        onClick={() => handleFollow(user.id)}
                      >
                        <UserPlus size={14} className="mr-1" />
                        {followingIds.has(user.id) ? t('following') : t('follow')}
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">{t('noUsersYet')}</p>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
