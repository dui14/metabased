'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Avatar, Button, Card, Badge } from '@/components/common';
import { PostCard } from '@/components/post';
import { NFTCard } from '@/components/nft';
import { Share, MapPin, Calendar, Sparkles, ArrowLeft, MessageCircle, Loader2, ImageIcon } from 'lucide-react';
import { useAuth, useTheme } from '@/providers';
import type { Post, NFT } from '@/types';
import type { DbUser } from '@/lib/database.types';

type TabType = 'posts' | 'nfts';

export default function UserProfilePage({ params }: { params: { address: string } }) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { t } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);
  const [profileUser, setProfileUser] = useState<DbUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  // Check if this is the current user's profile (by wallet or username)
  const isOwnProfile = 
    currentUser?.wallet_address?.toLowerCase() === params.address?.toLowerCase() ||
    currentUser?.username?.toLowerCase() === params.address?.toLowerCase();

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        
        // Kiểm tra xem param là wallet address hay username
        const isWalletAddress = params.address?.startsWith('0x') && params.address?.length === 42;
        
        let apiUrl: string;
        if (isWalletAddress) {
          apiUrl = `/api/users/profile?wallet=${encodeURIComponent(params.address)}`;
        } else {
          // Tìm theo username
          apiUrl = `/api/users/profile?username=${encodeURIComponent(params.address)}`;
        }
        
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.user) {
          setProfileUser(data.user);
          
          // Fetch follow status if logged in and not own profile
          if (currentUser?.id && !isOwnProfile) {
            const followResponse = await fetch(
              `/api/follows?follower_id=${currentUser.id}&following_id=${data.user.id}`
            );
            const followData = await followResponse.json();
            setIsFollowing(followData.isFollowing);
          }
          
          // TODO: Fetch user's posts
          // TODO: Fetch user's NFTs
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.address) {
      fetchProfile();
    }
  }, [params.address, currentUser?.id, isOwnProfile]);

  const handleFollow = async () => {
    if (!currentUser?.id || !profileUser?.id) return;
    
    setFollowLoading(true);
    try {
      const response = await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          follower_id: currentUser.id,
          following_id: profileUser.id,
          action: isFollowing ? 'unfollow' : 'follow',
        }),
      });
      
      if (response.ok) {
        setIsFollowing(!isFollowing);
        setShowUnfollowConfirm(false);
        // Update follower count locally
        if (profileUser) {
          setProfileUser({
            ...profileUser,
            followers_count: isFollowing 
              ? profileUser.followers_count - 1 
              : profileUser.followers_count + 1,
          });
        }
      }
    } catch (error) {
      console.error('Error following/unfollowing:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = () => {
    router.push(`/messages?to=${params.address}`);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
        </div>
      </MainLayout>
    );
  }

  if (!profileUser) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto px-4 py-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-gray-500 hover:text-dark dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">{t('back')}</span>
          </button>
          <Card className="text-center py-12">
            <p className="text-gray-500">{t('userNotFound')}</p>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-dark dark:hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">{t('back')}</span>
        </button>

        {/* Profile Header */}
        <Card className="mb-6">
          <div className="h-24 bg-gradient-to-r from-primary-400 via-primary-500 to-orange-400 -m-4 mb-0 rounded-t-2xl" />
          
          <div className="flex items-end justify-between -mt-10 mb-4 px-2">
            <Avatar 
              src={profileUser.avatar_url} 
              alt={profileUser.display_name || 'User'} 
              size="xl" 
              className="border-4 border-white dark:border-gray-800 shadow-lg" 
            />
            <div className="flex gap-2 pb-2">
              <Button variant="outline" size="sm">
                <Share size={16} />
              </Button>
              
              {/* Show Follow/Message only for other users */}
              {!isOwnProfile && currentUser && (
                <>
                  <Button variant="outline" size="sm" onClick={handleMessage}>
                    <MessageCircle size={16} />
                  </Button>
                  
                  {isFollowing ? (
                    <div className="relative">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowUnfollowConfirm(true)}
                        onMouseEnter={() => setShowUnfollowConfirm(true)}
                        onMouseLeave={() => setShowUnfollowConfirm(false)}
                        disabled={followLoading}
                        className={showUnfollowConfirm ? 'border-red-500 text-red-500 hover:bg-red-50' : ''}
                      >
                        {showUnfollowConfirm ? t('unfollow') : t('following')}
                      </Button>
                      {showUnfollowConfirm && (
                        <div 
                          className="absolute top-full mt-1 right-0 z-10"
                          onMouseEnter={() => setShowUnfollowConfirm(true)}
                          onMouseLeave={() => setShowUnfollowConfirm(false)}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleFollow}
                            disabled={followLoading}
                            className="border-red-500 text-red-500 hover:bg-red-50 whitespace-nowrap"
                          >
                            {t('unfollow')}?
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleFollow}
                      disabled={followLoading}
                    >
                      {t('follow')}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="px-2">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-dark dark:text-white">
                {profileUser.display_name || 'Unnamed User'}
              </h1>
              <Badge variant="nft" size="sm">
                <Sparkles size={10} className="mr-1" />
                Creator
              </Badge>
            </div>
            <p className="text-gray-500">@{profileUser.username || 'username'}</p>
            <p className="text-dark dark:text-gray-300 mt-3">{profileUser.bio || ''}</p>

            <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <MapPin size={14} />
                <span>Base Sepolia</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>{t('joined')} {profileUser.created_at ? new Date(profileUser.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}</span>
              </div>
            </div>

            <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div>
                <span className="font-bold text-dark dark:text-white">{profileUser.following_count || 0}</span>
                <span className="text-gray-500 ml-1">{t('following')}</span>
              </div>
              <div>
                <span className="font-bold text-dark dark:text-white">{(profileUser.followers_count || 0).toLocaleString()}</span>
                <span className="text-gray-500 ml-1">{t('followers')}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'posts' ? 'bg-white dark:bg-gray-700 text-dark dark:text-white shadow-soft' : 'text-gray-500'
            }`}
          >
            {t('posts')}
          </button>
          <button
            onClick={() => setActiveTab('nfts')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'nfts' ? 'bg-white dark:bg-gray-700 text-dark dark:text-white shadow-soft' : 'text-gray-500'
            }`}
          >
            {t('nfts')}
          </button>
        </div>

        {activeTab === 'posts' && (
          <div className="space-y-4">
            {posts.length > 0 ? (
              posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))
            ) : (
              <Card className="text-center py-12">
                <ImageIcon size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">{t('noPosts')}</p>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'nfts' && (
          <div className="grid grid-cols-2 gap-4">
            {nfts.length > 0 ? (
              nfts.map((nft) => (
                <NFTCard
                  key={nft.id}
                  nft={nft}
                  imageUrl={nft.token_uri || ''}
                  name={`NFT #${nft.token_id}`}
                />
              ))
            ) : (
              <Card className="col-span-2 text-center py-12">
                <Sparkles size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">{t('noNfts')}</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
