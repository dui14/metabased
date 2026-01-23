'use client';

import { useState } from 'react';
import { Badge, Button, Card, Avatar } from '@/components/common';
import { 
  Users, TrendingUp, FileText, Settings, Search, 
  Ban, Trash2, Eye, Shield, Download, RefreshCw, Filter
} from 'lucide-react';
import Link from 'next/link';

// Same mock data
const mockUsers = [
  {
    id: '1',
    username: 'alex_nft',
    display_name: 'Alex Thompson',
    wallet_address: '0x1234...5678',
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
    status: 'suspended' as const,
    role: 'user' as const,
    posts_count: 8,
    nfts_count: 45,
    created_at: '2024-02-01',
  },
];

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.display_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-100 flex flex-col">
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

        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-1">
            <li>
              <Link href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50">
                <TrendingUp size={20} />
                <span>Dashboard</span>
              </Link>
            </li>
            <li>
              <Link href="/admin/users" className="flex items-center gap-3 px-4 py-3 rounded-xl text-dark bg-primary-50 font-medium">
                <Users size={20} />
                <span>Users</span>
              </Link>
            </li>
            <li>
              <Link href="/admin/reports" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50">
                <FileText size={20} />
                <span>Reports</span>
              </Link>
            </li>
            <li>
              <Link href="/admin/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50">
                <Settings size={20} />
                <span>Settings</span>
              </Link>
            </li>
          </ul>
        </nav>

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-dark">All Users</h1>
            <p className="text-gray-500">View and manage user accounts</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm">
              <Download size={16} className="mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        <Card>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 w-80"
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
              {filteredUsers.length} users
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">User</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Wallet</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Posts</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">NFTs</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Joined</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50">
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
                      <Badge variant={user.status === 'active' ? 'success' : 'warning'} size="sm">
                        {user.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">{user.posts_count}</td>
                    <td className="py-4 px-4">{user.nfts_count}</td>
                    <td className="py-4 px-4">
                      <span className="text-gray-500 text-sm">{user.created_at}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-2 hover:bg-gray-100 rounded-lg" title="View">
                          <Eye size={16} className="text-gray-500" />
                        </button>
                        <button className="p-2 hover:bg-yellow-50 rounded-lg" title="Suspend">
                          <Ban size={16} className="text-yellow-500" />
                        </button>
                        <button className="p-2 hover:bg-red-50 rounded-lg" title="Delete">
                          <Trash2 size={16} className="text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500">Page 1 of 1</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <Button variant="outline" size="sm" disabled>Next</Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
