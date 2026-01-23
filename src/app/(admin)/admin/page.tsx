'use client';

import { useState } from 'react';
import { Badge, Button, Card, Avatar, Input } from '@/components/common';
import { 
  Users, TrendingUp, FileText, Settings, Search, 
  MoreHorizontal, Ban, Trash2, Eye, Shield,
  ChevronDown, Download, RefreshCw
} from 'lucide-react';
import Link from 'next/link';

// Mock data
const mockUsers = [
  {
    id: '1',
    username: 'alex_nft',
    display_name: 'Alex Thompson',
    wallet_address: '0x1234...5678',
    email: 'alex@example.com',
    status: 'active' as const,
    role: 'user' as const,
    posts_count: 24,
    nfts_count: 12,
    created_at: '2024-01-15',
  },
  {
    id: '2',
    username: 'sarah_art',
    display_name: 'Sarah Miller',
    wallet_address: '0xABCD...EF01',
    email: 'sarah@example.com',
    status: 'active' as const,
    role: 'user' as const,
    posts_count: 56,
    nfts_count: 34,
    created_at: '2024-01-10',
  },
  {
    id: '3',
    username: 'mike_collector',
    display_name: 'Mike Chen',
    wallet_address: '0x9999...1111',
    email: 'mike@example.com',
    status: 'suspended' as const,
    role: 'user' as const,
    posts_count: 8,
    nfts_count: 45,
    created_at: '2024-02-01',
  },
  {
    id: '4',
    username: 'emily_creates',
    display_name: 'Emily Davis',
    wallet_address: '0x5555...2222',
    email: 'emily@example.com',
    status: 'active' as const,
    role: 'admin' as const,
    posts_count: 128,
    nfts_count: 67,
    created_at: '2023-12-01',
  },
];

const stats = [
  { label: 'Total Users', value: '2,456', change: '+12%', icon: Users },
  { label: 'Active Posts', value: '8,732', change: '+8%', icon: FileText },
  { label: 'NFTs Minted', value: '1,234', change: '+24%', icon: TrendingUp },
];

export default function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-100 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div>
              <span className="text-lg font-bold text-dark">Metabased</span>
              <Badge variant="primary" size="sm" className="ml-2">Admin</Badge>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-1">
            <li>
              <Link
                href="/admin"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-dark bg-primary-50 font-medium"
              >
                <Users size={20} />
                <span>Users</span>
              </Link>
            </li>
            <li>
              <Link
                href="/admin/reports"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <FileText size={20} />
                <span>Reports</span>
              </Link>
            </li>
            <li>
              <Link
                href="/admin/settings"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Settings size={20} />
                <span>Settings</span>
              </Link>
            </li>
          </ul>
        </nav>

        {/* Admin Profile */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
            <Avatar alt="Admin" size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-dark truncate">Admin User</p>
              <p className="text-xs text-gray-400">Super Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-dark">User Management</h1>
            <p className="text-gray-500">Manage and monitor all platform users</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm">
              <Download size={16} className="mr-2" />
              Export
            </Button>
            <Button variant="primary" size="sm">
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label} className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                <stat.icon size={24} className="text-primary-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-dark">{stat.value}</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <span className="text-xs text-green-500 font-medium">{stat.change}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Users Table */}
        <Card>
          {/* Filters */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent w-80"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <p className="text-sm text-gray-500">
              Showing {filteredUsers.length} of {mockUsers.length} users
            </p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">User</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Wallet</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Role</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Posts</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">NFTs</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Joined</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar alt={user.display_name} size="sm" />
                        <div>
                          <p className="font-semibold text-dark">{user.display_name}</p>
                          <p className="text-sm text-gray-400">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-mono text-sm text-gray-600">{user.wallet_address}</span>
                    </td>
                    <td className="py-4 px-4">
                      <Badge
                        variant={user.status === 'active' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {user.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <Badge
                        variant={user.role === 'admin' ? 'primary' : 'default'}
                        size="sm"
                      >
                        {user.role === 'admin' && <Shield size={10} className="mr-1" />}
                        {user.role}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-dark">{user.posts_count}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-dark">{user.nfts_count}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-gray-500 text-sm">{user.created_at}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View Profile"
                        >
                          <Eye size={16} className="text-gray-500" />
                        </button>
                        <button
                          className="p-2 hover:bg-yellow-50 rounded-lg transition-colors"
                          title={user.status === 'active' ? 'Suspend User' : 'Activate User'}
                        >
                          <Ban size={16} className={user.status === 'active' ? 'text-yellow-500' : 'text-green-500'} />
                        </button>
                        <button
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete User"
                        >
                          <Trash2 size={16} className="text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500">Page 1 of 10</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm">
                Next
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
