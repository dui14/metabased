'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

const Avatar = ({ src, alt = 'Avatar', size = 'md', className }: AvatarProps) => {
  const initials = alt
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden bg-gradient-to-br from-primary-300 to-primary-500 flex items-center justify-center',
        sizeMap[size],
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
        />
      ) : (
        <span className="text-white font-semibold text-xs">
          {initials || '?'}
        </span>
      )}
    </div>
  );
};

export default Avatar;
