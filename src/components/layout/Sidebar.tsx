'use client';

import { cn } from '@/lib/utils';
import { Home, Search, Bell, Plus, Settings, User, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, useTheme } from '@/providers';

const Sidebar = () => {
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuth();
  const { t } = useTheme();

  const navItems = [
    { icon: Home, label: t('home'), href: '/home' },
    { icon: Search, label: t('discover'), href: '/discover' },
    { icon: Bell, label: t('notifications'), href: '/notifications' },
    { icon: Settings, label: t('settings'), href: '/settings' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-[25%] border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col transition-colors">
      {/* Logo */}
      <div className="p-6">
        <Link href="/home" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-500 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <span className="text-xl font-bold text-dark dark:text-white">Metabased</span>
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
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-500'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-dark dark:hover:text-white'
                  )}
                >
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{item.label}</span>
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
            <span>{t('create')}</span>
          </Link>
        </div>
      </nav>

      {/* User Profile Quick Access */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800">
        <Link
          href="/profile"
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-primary-300 to-primary-500 rounded-full flex items-center justify-center">
            <User size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-dark dark:text-white truncate">
              {user?.username ? `@${user.username}` : '@username'}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {user?.wallet_address 
                ? `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}`
                : '0x1234...5678'
              }
            </p>
          </div>
        </Link>
        
        {/* Logout button */}
        {isAuthenticated && (
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full p-3 mt-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">{t('logout')}</span>
          </button>
        )}

        {/* Quick Navigation */}
        <div className="flex items-center justify-center gap-1 pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
          {[
            { icon: Home, label: t('home'), href: '/home' },
            { icon: User, label: t('profile'), href: '/profile' },
            { icon: Settings, label: t('settings'), href: '/settings' },
          ].map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200',
                  isActive
                    ? 'text-primary-500'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                )}
              >
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
