'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const Card = ({ children, className, padding = 'md', hover = false }: CardProps) => {
  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-soft',
        paddingMap[padding],
        hover && 'transition-all duration-200 hover:shadow-card hover:border-gray-200 dark:hover:border-gray-600',
        className
      )}
    >
      {children}
    </div>
  );
};

export default Card;
