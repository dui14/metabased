'use client';

import { cn } from '@/lib/utils';
import { X, Home, Search, Bell, Plus, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileDrawer = ({ isOpen, onClose }: MobileDrawerProps) => {
  const pathname = usePathname();

  const navItems = [
    { icon: Home, label: 'Home', href: '/' },
    { icon: Search, label: 'Discover', href: '/discover' },
    { icon: Bell, label: 'Notifications', href: '/notifications' },
    { icon: Plus, label: 'Create Post', href: '/create' },
    { icon: User, label: 'Profile', href: '/profile' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-dark/50 backdrop-blur-sm z-50 lg:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed left-0 top-0 h-screen w-72 bg-white z-50 animate-slideIn lg:hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="text-xl font-bold text-dark">Metabased</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary-50 text-primary-500'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-dark'
                    )}
                  >
                    <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
          <Link
            href="/profile"
            onClick={onClose}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-primary-300 to-primary-500 rounded-full flex items-center justify-center">
              <User size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-dark truncate">@username</p>
              <p className="text-xs text-gray-400 truncate">0x1234...5678</p>
            </div>
          </Link>
        </div>
      </div>
    </>
  );
};

export default MobileDrawer;
