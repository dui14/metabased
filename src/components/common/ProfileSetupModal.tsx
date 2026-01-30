'use client';

import { useState, useEffect } from 'react';
import { Modal, Input, Button } from '@/components/common';
import { User, AtSign, Mail, Wallet, RefreshCw } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { getRandomAvatarUrl, AVAILABLE_AVATARS } from '@/lib/avatar-utils';
import Image from 'next/image';

interface ProfileSetupModalProps {
  isOpen: boolean;
  onComplete: (username: string, displayName: string) => void;
  walletAddress: string;
}

const ProfileSetupModal = ({ isOpen, onComplete, walletAddress }: ProfileSetupModalProps) => {
  const { user } = useAuth();
  const { user: dynamicUser } = useDynamicContext();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [usernameError, setUsernameError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  // Lấy email từ user DB hoặc Dynamic
  const userEmail = user?.email || dynamicUser?.email || '';

  // Random avatar khi mount
  useEffect(() => {
    if (!avatarUrl) {
      setAvatarUrl(getRandomAvatarUrl());
    }
  }, []);

  // Function để random lại avatar
  const randomizeAvatar = () => {
    setAvatarUrl(getRandomAvatarUrl());
  };

  // Validate username format
  const validateUsername = (value: string): boolean => {
    // Username chỉ chấp nhận chữ thường, số và underscore, 3-30 ký tự
    const usernameRegex = /^[a-z0-9_]{3,30}$/;
    return usernameRegex.test(value);
  };

  // Check if username is available
  const checkUsernameAvailable = async (value: string) => {
    if (!validateUsername(value)) {
      setUsernameError('Username phải có 3-30 ký tự, chỉ bao gồm chữ thường, số và dấu gạch dưới');
      return false;
    }

    setIsCheckingUsername(true);
    try {
      const response = await fetch(`/api/users/check-username?username=${encodeURIComponent(value)}`);
      const data = await response.json();
      
      if (!data.available) {
        setUsernameError('Username này đã được sử dụng');
        return false;
      }
      
      setUsernameError('');
      return true;
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameError('Không thể kiểm tra username');
      return false;
    } finally {
      setIsCheckingUsername(false);
    }
  };

  // Debounce username check
  useEffect(() => {
    if (username.length === 0) {
      setUsernameError('');
      return;
    }

    const timer = setTimeout(() => {
      checkUsernameAvailable(username);
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !displayName || !avatarUrl) {
      return;
    }

    // Final validation
    const isValid = await checkUsernameAvailable(username);
    if (!isValid) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          username: username.toLowerCase(),
          display_name: displayName,
          avatar_url: avatarUrl, // Thêm avatar_url
          email: userEmail || undefined,
        }),
      });

      if (response.ok) {
        onComplete(username, displayName);
      } else {
        const error = await response.json();
        setUsernameError(error.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setUsernameError('Không thể lưu profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="Thiết lập Profile" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center mb-6">
          {/* Avatar preview với nút random */}
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary-400 shadow-lg">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Avatar"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary-400 to-primary-500 flex items-center justify-center">
                  <User size={48} className="text-white" />
                </div>
              )}
            </div>
            
            {/* Nút random avatar */}
            <button
              type="button"
              onClick={randomizeAvatar}
              className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full shadow-lg border-2 border-primary-400 flex items-center justify-center hover:bg-primary-50 transition-all duration-200 group"
              title="Đổi avatar"
            >
              <RefreshCw size={18} className="text-primary-500 group-hover:rotate-180 transition-transform duration-300" />
            </button>
          </div>
          
          <h2 className="text-xl font-bold text-dark">Chào mừng đến Metabased!</h2>
          <p className="text-gray-500 text-sm mt-2">
            Vui lòng điền đầy đủ thông tin để hoàn tất đăng ký
          </p>
        </div>

        {/* Hiển thị thông tin wallet và email đã có */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Wallet size={16} className="text-blue-600" />
            <span className="text-gray-600 font-medium">Ví:</span>
            <span className="text-dark truncate flex-1">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
          </div>
          
          {userEmail && (
            <div className="flex items-center gap-2 text-sm">
              <Mail size={16} className="text-blue-600" />
              <span className="text-gray-600 font-medium">Email:</span>
              <span className="text-dark truncate flex-1">{userEmail}</span>
            </div>
          )}
        </div>

        {/* Username input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Username <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <AtSign size={18} />
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="your_username"
              className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-xl text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all duration-200 ${
                usernameError ? 'border-red-500' : 'border-gray-200'
              }`}
              maxLength={30}
              required
            />
          </div>
          {isCheckingUsername && (
            <p className="mt-1.5 text-sm text-gray-400">Đang kiểm tra...</p>
          )}
          {usernameError && (
            <p className="mt-1.5 text-sm text-red-500">{usernameError}</p>
          )}
          {username && !usernameError && !isCheckingUsername && (
            <p className="mt-1.5 text-sm text-greeavatarUrl || !n-500">Username có sẵn ✓</p>
          )}
        </div>

        {/* Display Name input */}
        <Input
          label="Tên hiển thị"
          placeholder="John Doe"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          icon={<User size={18} />}
          required
        />

        {/* Info message */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
          <p className="text-sm text-gray-700">
            ⚠️ Bạn cần có đầy đủ <strong>Wallet, Email, Username và Tên hiển thị</strong> để vào trang chủ.
          </p>
        </div>

        {/* Submit button */}
        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={!username || !displayName || !!usernameError || isLoading || isCheckingUsername}
        >
          {isLoading ? 'Đang lưu...' : 'Hoàn tất'}
        </Button>
      </form>
    </Modal>
  );
};

export default ProfileSetupModal;
