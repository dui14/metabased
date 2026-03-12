'use client';

import { cn } from '@/lib/utils';
import { Home, User, Settings, Bell } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTheme } from '@/providers';

const BottomNav = () => {
  const pathname = usePathname();
  const { t } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/notifications/unread-count', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        if (mounted) setUnreadCount(data.unread_count || 0);
      } catch {
        // silent fail — badge just stays 0
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
    { icon: Home, label: t('home'), href: '/home', badge: 0 },
    { icon: Bell, label: 'Notifications', href: '/notifications', badge: unreadCount },
    { icon: User, label: t('profile'), href: '/profile', badge: 0 },
    { icon: Settings, label: t('settings'), href: '/settings', badge: 0 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 z-40 transition-colors lg:hidden">
      <div className="flex items-center justify-around px-2 py-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200',
                isActive
                  ? 'text-primary-500'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              )}
            >
              <div className="relative">
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 bg-primary-500 text-white text-[10px] rounded-full flex items-center justify-center leading-none">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
