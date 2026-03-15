'use client';

import { cn } from '@/lib/utils';
import { Home, Search, Bell, Plus, MessageSquare, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers';
import { Avatar } from '@/components/common';

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar = ({ collapsed = false, onToggleCollapse }: SidebarProps) => {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = [
    { icon: Home, label: 'Home', href: '/home' },
    { icon: Search, label: 'Discover', href: '/discover' },
    { icon: Bell, label: 'Notifications', href: '/notifications' },
    { icon: MessageSquare, label: 'Messages', href: '/messages' },
  ];

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-30 h-screen border-r border-gray-100 bg-white hidden md:flex md:flex-col transition-all duration-300',
        collapsed ? 'w-20' : 'w-72'
      )}
    >
      <div className={cn(collapsed ? 'p-3' : 'p-6')}>
        <div className={cn('relative flex items-center gap-2', collapsed ? 'justify-center' : 'justify-between')}>
          <Link href="/" className={cn('flex items-center min-w-0', collapsed ? 'justify-center' : 'gap-2')}>
            <div className={cn(
              'bg-gradient-to-br from-primary-400 to-primary-500 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300',
              collapsed ? 'w-11 h-11 shadow-soft' : 'w-10 h-10'
            )}>
              <span className={cn('text-white font-bold transition-all duration-300', collapsed ? 'text-xl' : 'text-lg')}>M</span>
            </div>
            {!collapsed && <span className="text-xl font-bold text-dark truncate">Metabased</span>}
          </Link>
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              'hidden lg:inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors',
              collapsed && 'absolute right-0 top-1/2 -translate-y-1/2'
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
      </div>

      <nav className={cn('flex-1', collapsed ? 'px-2' : 'px-4')}>
        <ul className={cn('space-y-1', collapsed && 'pt-2')}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center rounded-xl text-base font-medium transition-all duration-200',
                    collapsed ? 'justify-center px-2 py-3.5' : 'gap-3 px-4 py-3',
                    isActive
                      ? 'bg-primary-50 text-primary-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-dark'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className={cn('mt-6', collapsed ? 'px-0' : 'px-2')}>
          <Link
            href="/create"
            className={cn(
              'w-full bg-primary-400 hover:bg-primary-500 text-white rounded-xl font-semibold transition-colors inline-flex items-center justify-center',
              collapsed ? 'py-3.5' : 'gap-2 py-3'
            )}
            title={collapsed ? 'Create Post' : undefined}
          >
            <Plus size={20} />
            {!collapsed && <span>Create Post</span>}
          </Link>
        </div>
      </nav>

      <div className={cn('border-t border-gray-100', collapsed ? 'p-2 pt-3' : 'p-4')}>
        <Link
          href="/profile"
          className={cn(
            'rounded-xl hover:bg-gray-50 transition-colors flex items-center',
            collapsed ? 'justify-center p-3' : 'gap-3 p-3'
          )}
          title={collapsed ? 'Profile' : undefined}
        >
          <Avatar
            src={user?.avatar_url}
            alt={user?.display_name || 'User'}
            size="sm"
          />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-dark truncate">{user?.display_name || 'Chưa đặt tên'}</p>
              <p className="text-xs text-gray-400 truncate">@{user?.username || 'username'}</p>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
