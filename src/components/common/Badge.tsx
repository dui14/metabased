'use client';

import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'nft';
  size?: 'sm' | 'md';
  className?: string;
}

const Badge = ({ children, variant = 'default', size = 'sm', className }: BadgeProps) => {
  const variants = {
    default: 'bg-gray-100 text-gray-600',
    primary: 'bg-primary-100 text-primary-600',
    success: 'bg-green-100 text-green-600',
    warning: 'bg-yellow-100 text-yellow-600',
    error: 'bg-red-100 text-red-600',
    nft: 'bg-gradient-to-r from-primary-400 to-primary-500 text-white',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
};

export default Badge;
