'use client';

import { cn } from '@/lib/utils';
import { Home, Search, Bell, Plus, Settings, User, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers';
import { Avatar } from '@/components/common';
import { useEffect, useState } from 'react';

const Sidebar = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/notifications/unread-count', { cache: 'no-store' });
        if (!response.ok) {
          if (mounted) setUnreadCount(0);
          return;
        }

        const data = await response.json();
        if (mounted) {
          setUnreadCount(data.unread_count || 0);
        }
      } catch (error) {
        if (mounted) setUnreadCount(0);
      }
    };

    fetchUnreadCount();
    const timer = setInterval(fetchUnreadCount, 30000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const navItems = [
    { icon: Home, label: 'Home', href: '/' },
    { icon: Search, label: 'Discover', href: '/discover' },
    { icon: Bell, label: 'Notifications', href: '/notifications', badge: unreadCount },
    { icon: MessageSquare, label: 'Messages', href: '/messages' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-[33.33%] border-r border-gray-100 bg-white flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-500 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <span className="text-xl font-bold text-dark">Metabased</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center justify-between px-4 py-3 rounded-xl text-base font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary-50 text-primary-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-dark'
                  )}
                >
                  <span className="flex items-center gap-3">
                    <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                    <span>{item.label}</span>
                  </span>
                  {!!item.badge && item.badge > 0 && (
                    <span className="min-w-5 h-5 px-1 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Create Post Button */}
        <div className="mt-6 px-2">
          <Link
            href="/create"
            className="flex items-center justify-center gap-2 w-full py-3 bg-primary-400 hover:bg-primary-500 text-white rounded-xl font-semibold transition-colors"
          >
            <Plus size={20} />
            <span>Create Post</span>
          </Link>
        </div>
      </nav>

      {/* User Profile Quick Access */}
      <div className="p-4 border-t border-gray-100">
        <Link
          href="/profile"
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <Avatar 
            src={user?.avatar_url} 
            alt={user?.display_name || 'User'} 
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-dark truncate">{user?.display_name || 'Chưa đặt tên'}</p>
            <p className="text-xs text-gray-400 truncate">@{user?.username || 'username'}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
