'use client';

import { cn } from '@/lib/utils';
import { Home, User, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/providers';

const BottomNav = () => {
  const pathname = usePathname();
  const { t } = useTheme();

  const navItems = [
    { icon: Home, label: t('home'), href: '/home' },
    { icon: User, label: t('profile'), href: '/profile' },
    { icon: Settings, label: t('settings'), href: '/settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 z-40 transition-colors">
      <div className="flex items-center justify-center gap-2 px-6 py-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-8 py-2 rounded-xl transition-all duration-200',
                isActive
                  ? 'text-primary-500'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              )}
            >
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
