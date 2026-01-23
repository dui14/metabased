'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, Avatar, Button, Input, Badge } from '@/components/common';
import { Search, UserPlus, TrendingUp, Users, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface DiscoverUser {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  followers_count: number;
}

const trendingTags = ['#NFT', '#BaseSepolia', '#DigitalArt', '#Web3', '#Crypto', '#Photography'];

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'trending'>('users');
  const [users, setUsers] = useState<DiscoverUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch users từ Supabase
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users/discover');
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter(
    (user) =>
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-dark mb-6">Discover</h1>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search users, tags, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
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
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
              </div>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <Card key={user.id} hover>
                  <div className="flex items-center justify-between">
                    <Link href={`/profile/${user.username}`} className="flex items-center gap-3 flex-1">
                      <Avatar src={user.avatar_url} alt={user.display_name || user.username} size="lg" />
                      <div>
                        <p className="font-semibold text-dark hover:underline">{user.display_name || user.username}</p>
                        <p className="text-sm text-gray-400">@{user.username}</p>
                        {user.bio && <p className="text-sm text-gray-600 mt-1">{user.bio}</p>}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span>{user.followers_count?.toLocaleString() || 0} followers</span>
                        </div>
                      </div>
                    </Link>
                    <Button variant="primary" size="sm">
                      Follow
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="text-center py-12">
                <Users size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No users found</p>
                <p className="text-gray-400 text-sm mt-2">Be the first to join!</p>
              </Card>
            )}
          </div>
        )}

        {/* Trending Tab */}
        {activeTab === 'trending' && (
          <div className="space-y-4">
            <Card>
              <h3 className="font-semibold text-dark mb-4">Trending Tags</h3>
              <div className="flex flex-wrap gap-2">
                {trendingTags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/search?q=${encodeURIComponent(tag)}`}
                    className="px-4 py-2 bg-gray-100 hover:bg-primary-50 hover:text-primary-500 rounded-full text-sm font-medium transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="font-semibold text-dark mb-4">Suggested for You</h3>
              <div className="space-y-3">
                {isLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
                  </div>
                ) : users.length > 0 ? (
                  users.slice(0, 3).map((user) => (
                    <div key={user.id} className="flex items-center justify-between py-2">
                      <Link href={`/profile/${user.username}`} className="flex items-center gap-3">
                        <Avatar src={user.avatar_url} alt={user.display_name || user.username} size="md" />
                        <div>
                          <p className="font-semibold text-dark text-sm">{user.display_name || user.username}</p>
                          <p className="text-xs text-gray-400">@{user.username}</p>
                        </div>
                      </Link>
                      <Button variant="outline" size="sm">
                        <UserPlus size={14} className="mr-1" />
                        Follow
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No users yet</p>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
