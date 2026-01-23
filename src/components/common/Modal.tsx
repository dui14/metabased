'use client';

import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { ReactNode, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

const Modal = ({ isOpen, onClose, title, children, size = 'md' }: ModalProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-dark/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal content */}
      <div
        className={cn(
          'relative w-full mx-4 bg-white rounded-2xl shadow-elevated animate-fadeIn',
          sizeMap[size]
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-dark">{title}</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-dark hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        )}
        
        {/* Body */}
        <div className={cn('p-6', !title && 'pt-8')}>
          {!title && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-dark hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>
          )}
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
