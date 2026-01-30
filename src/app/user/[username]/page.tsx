'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Avatar, Button, Card, Badge, Modal } from '@/components/common';
import { PostCard } from '@/components/post';
import { NFTCard } from '@/components/nft';
import { Share, MapPin, Calendar, Sparkles, ArrowLeft, MessageCircle, Loader2, ImageIcon } from 'lucide-react';
import { useAuth, useTheme } from '@/providers';
import type { Post, NFT } from '@/types';
import type { DbUser } from '@/lib/database.types';

type TabType = 'posts' | 'nfts';

export default function UserProfilePage({ params }: { params: { username: string } }) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { t } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [showUnfollowModal, setShowUnfollowModal] = useState(false);
  const [profileUser, setProfileUser] = useState<DbUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = 
    currentUser?.username?.toLowerCase() === params.username?.toLowerCase();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        
        const apiUrl = `/api/users/profile?username=${encodeURIComponent(params.username)}`;
        
        const response = await fetch(apiUrl, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        const data = await response.json();
        
        if (data.user) {
          setProfileUser(data.user);
          
          if (currentUser?.id && !isOwnProfile) {
            const followResponse = await fetch(
              `/api/follows?follower_id=${currentUser.id}&following_id=${data.user.id}`
            );
            const followData = await followResponse.json();
            setIsFollowing(followData.isFollowing);
          }
          
          const postsResponse = await fetch(`/api/posts?user_id=${data.user.id}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          const postsData = await postsResponse.json();
          setPosts(postsData.posts || []);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.username) {
      fetchProfile();
    }
  }, [params.username, currentUser?.id, isOwnProfile]);

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
        setShowUnfollowModal(false);
        
        const apiUrl = `/api/users/profile?username=${encodeURIComponent(params.username)}`;
        const profileResponse = await fetch(apiUrl);
        const profileData = await profileResponse.json();
        
        if (profileData.user) {
          setProfileUser(profileData.user);
        }
      }
    } catch (error) {
      console.error('Error following/unfollowing:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleFollowButtonClick = () => {
    if (isFollowing) {
      setShowUnfollowModal(true);
    } else {
      handleFollow();
    }
  };

  const handleShareProfile = async () => {
    const profileUrl = `${window.location.origin}/user/${profileUser?.username}`;
    
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(profileUrl);
        alert(t('profileUrlCopied') || 'Profile URL copied!');
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = profileUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          alert(t('profileUrlCopied') || 'Profile URL copied!');
        } catch (err) {
          console.error('Fallback: Could not copy text', err);
          alert(t('errorOccurred') || 'Failed to copy URL');
        }
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error('Error copying profile URL:', error);
      alert(t('errorOccurred') || 'Failed to copy URL');
    }
  };

  const handleMessage = () => {
    router.push(`/messages?to=${params.username}`);
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
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-dark dark:hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">{t('back')}</span>
        </button>

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
              <Button variant="outline" size="sm" onClick={handleShareProfile}>
                <Share size={16} />
              </Button>
              
              {!isOwnProfile && currentUser && (
                <>
                  <Button variant="outline" size="sm" onClick={handleMessage}>
                    <MessageCircle size={16} />
                  </Button>
                  
                  <Button 
                    variant={isFollowing ? "outline" : "primary"}
                    size="sm"
                    onClick={handleFollowButtonClick}
                    disabled={followLoading}
                  >
                    {isFollowing ? t('following') : t('follow')}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="px-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-dark dark:text-white">{profileUser.display_name || 'Chưa đặt tên'}</h1>
              <Badge variant="nft" size="sm">
                <Sparkles size={10} className="mr-1" />
                Creator
              </Badge>
            </div>
            <p className="text-gray-500 text-sm">@{profileUser.username}</p>
            
            <p className="text-dark dark:text-gray-300 mt-3 leading-relaxed text-sm">{profileUser.bio || 'Chưa có giới thiệu'}</p>

            <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <MapPin size={14} />
                <span>Base Sepolia</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>{t('joined')} {profileUser.created_at ? new Date(profileUser.created_at).toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' }) : 'N/A'}</span>
              </div>
            </div>

            <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-sm">
              <div>
                <span className="font-bold text-dark dark:text-white">{profileUser.following_count || 0}</span>
                <span className="text-gray-500 ml-1">{t('following')}</span>
              </div>
              <div>
                <span className="font-bold text-dark dark:text-white">{(profileUser.followers_count || 0).toLocaleString()}</span>
                <span className="text-gray-500 ml-1">{t('followers')}</span>
              </div>
              <div>
                <span className="font-bold text-dark dark:text-white">{nfts.length}</span>
                <span className="text-gray-500 ml-1">{t('nftsCreated')}</span>
              </div>
            </div>
          </div>
        </Card>

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
                <p className="text-gray-400 text-sm mt-1">{isOwnProfile ? t('shareFirstMoment') : 'Người dùng chưa có bài đăng nào'}</p>
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
                <p className="text-gray-400 text-sm mt-1">{isOwnProfile ? t('mintPostsAsNft') : 'Người dùng chưa mint NFT nào'}</p>
              </Card>
            )}
          </div>
        )}
      </div>
      
      <Modal isOpen={showUnfollowModal} onClose={() => setShowUnfollowModal(false)} size="sm">
        <div className="text-center">
          <h3 className="text-xl font-bold text-dark dark:text-white mb-2">
            {t('unfollowUser')}
          </h3>
          <p className="text-gray-500 mb-6">
            {t('unfollowConfirm')}
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowUnfollowModal(false)}
              className="flex-1"
              disabled={followLoading}
            >
              {t('cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleFollow}
              className="flex-1 bg-red-500 hover:bg-red-600"
              disabled={followLoading}
            >
              {followLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t('unfollow')
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
