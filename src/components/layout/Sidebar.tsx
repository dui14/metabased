'use client';

import { cn } from '@/lib/utils';
import { Home, Search, Bell, Plus, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers';
import { Avatar } from '@/components/common';
import { useNotificationUnreadCount } from '@/lib/useNotificationUnreadCount';
import { useMessageUnreadCount } from '@/lib/useMessageUnreadCount';

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const Sidebar = ({ collapsed = false, onToggleCollapse, mobileOpen = false, onCloseMobile }: SidebarProps) => {
  const pathname = usePathname();
  const { user } = useAuth();
  const { unreadCount } = useNotificationUnreadCount({ enabled: Boolean(user) });
  const { unreadCount: messageUnreadCount } = useMessageUnreadCount(user?.id, {
    enabled: Boolean(user),
    pollingMs: 2500,
  });

  const navItems = [
    { icon: Home, label: 'Home', href: '/home' },
    { icon: Search, label: 'Discover', href: '/discover' },
    { icon: Bell, label: 'Notifications', href: '/notifications' },
    { icon: MessageSquare, label: 'Messages', href: '/messages' },
  ];

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r border-gray-100 bg-white flex flex-col w-72 transition-[width,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        'md:translate-x-0',
        collapsed ? 'md:w-20' : 'md:w-72'
      )}
    >
      <button
        type="button"
        onClick={onToggleCollapse}
        className="absolute -right-3 top-6 z-40 hidden md:inline-flex size-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-all duration-300 hover:scale-105 hover:text-primary-500"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-pressed={collapsed}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="1em"
          height="1em"
          fill="none"
          viewBox="0 0 24 24"
          className={cn('size-4 transition-transform duration-300', !collapsed && 'rotate-180')}
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            fillRule="evenodd"
            d="M13.78 5.47a.75.75 0 0 1 1.06 0l5.25 5.25a1.8 1.8 0 0 1 0 2.56l-5.25 5.25a.75.75 0 0 1-1.06-1.06l5.25-5.25a.3.3 0 0 0 0-.44l-5.25-5.25a.75.75 0 0 1 0-1.06m-8 0a.75.75 0 0 1 1.06 0l5.25 5.25a1.8 1.8 0 0 1 0 2.56l-5.25 5.25a.75.75 0 1 1-1.06-1.06l5.25-5.25a.3.3 0 0 0 0-.44L5.78 6.53a.75.75 0 0 1 0-1.06"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <button
        type="button"
        onClick={onCloseMobile}
        className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 md:hidden"
        aria-label="Close sidebar"
      >
        ✕
      </button>

      <div className={cn('transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]', collapsed ? 'p-3' : 'p-6')}>
        <div className={cn('relative flex items-center gap-2', collapsed ? 'justify-center' : 'justify-between')}>
          <Link href="/" className={cn('flex items-center min-w-0', collapsed ? 'justify-center' : 'gap-2')}>
            <div className={cn(
              'bg-gradient-to-br from-primary-400 to-primary-500 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
              collapsed ? 'w-11 h-11 shadow-soft' : 'w-10 h-10'
            )}>
              <span className={cn('text-white font-bold transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]', collapsed ? 'text-xl' : 'text-lg')}>M</span>
            </div>
            <span
              className={cn(
                'text-xl font-bold text-dark truncate transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                collapsed ? 'max-w-0 opacity-0 -translate-x-2' : 'max-w-[10rem] opacity-100 translate-x-0'
              )}
            >
              Metabased
            </span>
          </Link>
        </div>
      </div>

      <nav className={cn('flex-1 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]', collapsed ? 'px-2' : 'px-4')}>
        <ul className={cn('space-y-1', collapsed && 'pt-2')}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onCloseMobile}
                  className={cn(
                    'group relative flex items-center rounded-xl text-base font-medium transition-all duration-300',
                    collapsed ? 'justify-center px-2 py-3.5' : 'gap-3 px-4 py-3',
                    isActive
                      ? 'bg-primary-50 text-primary-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-dark'
                  )}
                >
                  <span className="relative inline-flex">
                    <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                    {item.href === '/notifications' && unreadCount > 0 && collapsed && (
                      <span
                        className={cn(
                          'absolute flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white',
                          collapsed ? '-right-2 -top-2' : '-right-3 -top-2'
                        )}
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                    {item.href === '/messages' && messageUnreadCount > 0 && collapsed && (
                      <span
                        className={cn(
                          'absolute flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-primary-500 px-1 text-[10px] font-semibold leading-none text-white',
                          '-right-2 -top-2'
                        )}
                      >
                        {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'truncate transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                      collapsed ? 'max-w-0 opacity-0 -translate-x-1' : 'max-w-[8rem] opacity-100 translate-x-0'
                    )}
                  >
                    {item.label}
                  </span>
                  {item.href === '/notifications' && unreadCount > 0 && !collapsed && (
                    <span className="ml-auto inline-flex min-w-[22px] h-[22px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                  {item.href === '/messages' && messageUnreadCount > 0 && !collapsed && (
                    <span className="ml-auto inline-flex min-w-[22px] h-[22px] items-center justify-center rounded-full bg-primary-500 px-1.5 text-xs font-semibold text-white">
                      {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                    </span>
                  )}
                  {collapsed && (
                    <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 -translate-x-1 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 z-50">
                      {item.label}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className={cn('mt-6', collapsed ? 'px-0' : 'px-2')}>
          <Link
            href="/create"
            onClick={onCloseMobile}
            className={cn(
              'group relative w-full bg-primary-400 hover:bg-primary-500 text-white rounded-xl font-semibold transition-colors inline-flex items-center justify-center',
              collapsed ? 'py-3.5' : 'gap-2 py-3'
            )}
          >
            <Plus size={20} />
            <span
              className={cn(
                'truncate transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                collapsed ? 'max-w-0 opacity-0 -translate-x-1' : 'max-w-[8rem] opacity-100 translate-x-0'
              )}
            >
              Create Post
            </span>
            {collapsed && (
              <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 -translate-x-1 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 z-50">
                Create Post
              </span>
            )}
          </Link>
        </div>
      </nav>

      <div className={cn('border-t border-gray-100', collapsed ? 'p-2 pt-3' : 'p-4')}>
        <Link
          href="/profile"
          onClick={onCloseMobile}
          className={cn(
            'group relative rounded-xl hover:bg-gray-50 transition-colors flex items-center',
            collapsed ? 'justify-center p-3' : 'gap-3 p-3'
          )}
        >
          <Avatar
            src={user?.avatar_url}
            alt={user?.display_name || 'User'}
            size="sm"
          />
          <div
            className={cn(
              'min-w-0 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
              collapsed ? 'max-w-0 opacity-0 -translate-x-1' : 'max-w-[10rem] opacity-100 translate-x-0'
            )}
          >
            <p className="text-sm font-semibold text-dark truncate">{user?.display_name || 'Chưa đặt tên'}</p>
            <p className="text-xs text-gray-400 truncate">@{user?.username || 'username'}</p>
          </div>
          {collapsed && (
            <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 -translate-x-1 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 z-50">
              Profile
            </span>
          )}
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
