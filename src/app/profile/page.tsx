'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Avatar, Button, Card, Badge } from '@/components/common';
import { PostCard } from '@/components/post';
import { NFTCard } from '@/components/nft';
import { Settings, Share, MapPin, Link as LinkIcon, Calendar, Sparkles, ImageIcon, Loader2 } from 'lucide-react';
import { useAuth, useTheme } from '@/providers';
import type { Post, NFT } from '@/types';

const nfts: NFT[] = [];

type TabType = 'posts' | 'nfts';

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!user?.id) return;
      
      try {
        setIsLoading(true);
        const response = await fetch(`/api/posts?user_id=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setPosts(data.posts || []);
        }
      } catch (error) {
        console.error('Error fetching user posts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserPosts();
  }, [user?.id]);

  const handlePostUpdate = (updatedPost: Post) => {
    setPosts(posts.map(p => p.id === updatedPost.id ? updatedPost : p));
  };

  const handlePostDelete = (postId: string) => {
    setPosts(posts.filter(p => p.id !== postId));
  };

  const handleSettingsClick = () => {
    router.push('/settings');
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        {/* Profile Header */}
        <Card className="mb-4 sm:mb-6">
          {/* Cover gradient */}
          <div className="h-20 sm:h-24 bg-gradient-to-r from-primary-400 via-primary-500 to-orange-400 -m-4 mb-0 rounded-t-2xl" />
          
          {/* Avatar and actions */}
          <div className="flex items-end justify-between -mt-8 sm:-mt-10 mb-3 sm:mb-4 px-2">
            <div className="relative">
              <Avatar src={user?.avatar_url} alt={user?.display_name || 'Profile'} size="xl" className="border-4 border-white dark:border-gray-800 shadow-lg w-16 h-16 sm:w-20 sm:h-20" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-6 sm:h-6 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
            </div>
            <div className="flex gap-2 pb-2">
              <Button variant="outline" size="sm">
                <Share size={14} className="sm:w-4 sm:h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleSettingsClick}>
                <Settings size={14} className="sm:w-4 sm:h-4" />
              </Button>
            </div>
          </div>

          {/* User info */}
          <div className="px-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-dark dark:text-white truncate">{user?.display_name || 'Chưa đặt tên'}</h1>
              <Badge variant="nft" size="sm">
                <Sparkles size={10} className="mr-1" />
                Creator
              </Badge>
            </div>
            <p className="text-gray-500 text-sm truncate">@{user?.username || 'username'}</p>
            
            <p className="text-dark dark:text-gray-300 mt-2 sm:mt-3 leading-relaxed text-sm">{user?.bio || 'Chưa có giới thiệu'}</p>

            {/* Meta info */}
            <div className="flex flex-wrap gap-2 sm:gap-4 mt-3 sm:mt-4 text-xs sm:text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <MapPin size={12} className="sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                <span className="truncate">Base Sepolia</span>
              </div>
              <div className="flex items-center gap-1">
                <LinkIcon size={12} className="sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                <a href="#" className="text-primary-500 hover:underline truncate">metabased.xyz</a>
              </div>
              <div className="flex items-center gap-1">
                <Calendar size={12} className="sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                <span className="truncate">{t('joined')} {user?.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' }) : 'N/A'}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4 sm:gap-6 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 dark:border-gray-700 text-sm">
              <div>
                <span className="font-bold text-dark dark:text-white">{user?.following_count || 0}</span>
                <span className="text-gray-500 ml-1">{t('following')}</span>
              </div>
              <div>
                <span className="font-bold text-dark dark:text-white">{(user?.followers_count || 0).toLocaleString()}</span>
                <span className="text-gray-500 ml-1">{t('followers')}</span>
              </div>
              <div>
                <span className="font-bold text-dark dark:text-white">{nfts.length}</span>
                <span className="text-gray-500 ml-1">{t('nftsCreated')}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'posts'
                ? 'bg-white dark:bg-gray-700 text-dark dark:text-white shadow-soft'
                : 'text-gray-500 hover:text-dark dark:hover:text-white'
            }`}
          >
            {t('posts')} ({posts.length})
          </button>
          <button
            onClick={() => setActiveTab('nfts')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'nfts'
                ? 'bg-white dark:bg-gray-700 text-dark dark:text-white shadow-soft'
                : 'text-gray-500 hover:text-dark dark:hover:text-white'
            }`}
          >
            {t('nfts')} ({nfts.length})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'posts' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
              </div>
            ) : posts.length > 0 ? (
              posts.map((post) => (
                <PostCard 
                  key={post.id} 
                  post={post}
                  onUpdate={handlePostUpdate}
                  onDelete={handlePostDelete}
                />
              ))
            ) : (
              <Card className="text-center py-12">
                <ImageIcon size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">{t('noPosts')}</p>
                <p className="text-gray-400 text-sm mt-1">{t('shareFirstMoment')}</p>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'nfts' && (
          <div className="grid grid-cols-2 gap-4">
            {nfts.length > 0 ? (
              nfts.map((nft, index) => (
                <NFTCard
                  key={nft.id}
                  nft={nft}
                  imageUrl={`https://images.unsplash.com/photo-${1618005182384 + index * 1000}?w=400&h=400&fit=crop`}
                  name={`NFT #${nft.token_id}`}
                />
              ))
            ) : (
              <Card className="col-span-2 text-center py-12">
                <Sparkles size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">{t('noNfts')}</p>
                <p className="text-gray-400 text-sm mt-1">{t('mintPostsAsNft')}</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
