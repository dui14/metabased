'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, Button, Avatar, Input } from '@/components/common';
import { User, Wallet, LogOut, Camera, Save, AlertCircle, CheckCircle, Sun, Moon, Globe, ArrowLeft } from 'lucide-react';
import { useAuth, useTheme } from '@/providers';
import { DynamicUserProfile, useDynamicContext } from '@dynamic-labs/sdk-react-core';

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const { theme, setTheme, language, setLanguage, t } = useTheme();
  const { setShowDynamicUserProfile } = useDynamicContext();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Profile form state
  const [formData, setFormData] = useState({
    username: '',
    display_name: '',
    bio: '',
  });

  // Load user data khi component mount hoặc user thay đổi
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        display_name: user.display_name || '',
        bio: user.bio || '',
      });
      setAvatarPreview(user.avatar_url || null);
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setMessage(null);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: language === 'vi' ? 'Ảnh không được vượt quá 5MB' : 'Image must be less than 5MB' });
        return;
      }
      
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setMessage(null);
    }
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    // TODO: Implement upload to Supabase Storage or other service
    // For now, return the base64 preview (temporary solution)
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSaveProfile = async () => {
    if (!user?.wallet_address) {
      setMessage({ type: 'error', text: language === 'vi' ? 'Vui lòng kết nối ví trước' : 'Please connect wallet first' });
      return;
    }

    // Validate username
    if (formData.username && !/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      setMessage({ type: 'error', text: t('usernameInvalid') });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      let avatar_url = user.avatar_url;
      
      // Upload avatar if changed
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar(avatarFile);
        if (uploadedUrl) {
          avatar_url = uploadedUrl;
        }
      }

      // Call API to update profile
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: user.wallet_address,
          username: formData.username || undefined,
          display_name: formData.display_name || undefined,
          bio: formData.bio || undefined,
          avatar_url: avatar_url || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || t('errorOccurred'));
      }

      // Refresh user data
      await refreshUser();
      
      setMessage({ type: 'success', text: t('profileUpdated') });
      setAvatarFile(null);
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : t('errorOccurred')
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-2xl font-bold text-dark dark:text-white">{t('settings')}</h1>
        </div>

        {/* Profile Edit Section */}
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-dark dark:text-white mb-4 flex items-center gap-2">
            <User size={20} />
            {t('personalInfo')}
          </h2>
          
          {/* Avatar */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Avatar 
                src={avatarPreview || user?.avatar_url} 
                alt={user?.display_name || 'Profile'} 
                size="xl" 
                className="border-4 border-gray-100 dark:border-gray-700"
              />
              <button
                onClick={handleAvatarClick}
                className="absolute bottom-0 right-0 w-10 h-10 bg-primary-400 hover:bg-primary-500 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
              >
                <Camera size={18} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            {/* Message */}
            {message && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}>
                {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                <span className="text-sm">{message.text}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('username')}
              </label>
              <Input
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="your_username"
                className="w-full"
              />
              <p className="text-xs text-gray-400 mt-1">
                {t('usernameOnly')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('displayName')}
              </label>
              <Input
                name="display_name"
                value={formData.display_name}
                onChange={handleInputChange}
                placeholder={language === 'vi' ? 'Tên của bạn' : 'Your name'}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('bio')}
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder={language === 'vi' ? 'Viết vài dòng giới thiệu về bạn...' : 'Write a short bio about yourself...'}
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                {formData.bio.length}/160 {t('characters')}
              </p>
            </div>

            <Button 
              variant="primary" 
              className="w-full"
              onClick={handleSaveProfile}
              disabled={isLoading}
            >
              <Save size={18} className="mr-2" />
              {isLoading ? t('saving') : t('save')}
            </Button>
          </div>
        </Card>

        {/* Appearance Section */}
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-dark dark:text-white mb-4 flex items-center gap-2">
            <Sun size={20} />
            {t('appearance')}
          </h2>
          
          <div className="flex gap-3">
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                theme === 'light' 
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <Sun size={24} className={`mx-auto mb-2 ${theme === 'light' ? 'text-primary-500' : 'text-gray-400'}`} />
              <p className={`text-sm font-medium ${theme === 'light' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400'}`}>
                {t('lightMode')}
              </p>
            </button>
            
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                theme === 'dark' 
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <Moon size={24} className={`mx-auto mb-2 ${theme === 'dark' ? 'text-primary-500' : 'text-gray-400'}`} />
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400'}`}>
                {t('darkMode')}
              </p>
            </button>
          </div>
        </Card>

        {/* Language Section */}
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-dark dark:text-white mb-4 flex items-center gap-2">
            <Globe size={20} />
            {t('language')}
          </h2>
          
          <div className="flex gap-3">
            <button
              onClick={() => setLanguage('en')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                language === 'en' 
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="text-2xl mb-2 block">🇺🇸</span>
              <p className={`text-sm font-medium ${language === 'en' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400'}`}>
                {t('english')}
              </p>
            </button>
            
            <button
              onClick={() => setLanguage('vi')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                language === 'vi' 
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="text-2xl mb-2 block">🇻🇳</span>
              <p className={`text-sm font-medium ${language === 'vi' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400'}`}>
                {t('vietnamese')}
              </p>
            </button>
          </div>
        </Card>

        {/* Wallet & Email Section - Using Dynamic */}
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-dark dark:text-white mb-4 flex items-center gap-2">
            <Wallet size={20} />
            {t('walletAndEmail')}
          </h2>
          
          <p className="text-gray-500 text-sm mb-4">
            {t('manageWalletEmail')}
          </p>

          {/* Current wallet display */}
          {user?.wallet_address && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl mb-4">
              <p className="text-xs text-gray-500 mb-1">{t('currentWallet')}</p>
              <p className="font-mono text-sm text-dark dark:text-white">
                {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
              </p>
            </div>
          )}

          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setShowDynamicUserProfile(true)}
          >
            <Wallet size={18} className="mr-2" />
            {t('manageWallet')}
          </Button>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200 dark:border-red-800">
          <h3 className="text-sm font-semibold text-red-500 uppercase tracking-wider mb-4">
            {t('logout')}
          </h3>
          <Button 
            variant="outline" 
            className="w-full border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300"
            onClick={logout}
          >
            <LogOut size={18} className="mr-2" />
            {t('logout')}
          </Button>
        </Card>

        {/* App Info */}
        <div className="mt-8 text-center text-sm text-gray-400">
          <p>Metabased v1.0.0</p>
          <p className="mt-1">Built on Base Sepolia</p>
        </div>
      </div>

      {/* Dynamic User Profile Modal */}
      <DynamicUserProfile />
    </MainLayout>
  );
}
