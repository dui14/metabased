'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DynamicWidget, useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { Card } from '@/components/common';
import { Sparkles, Wallet, Shield, Loader2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers';

const LoginPage = () => {
  const router = useRouter();
  const { isAuthenticated, primaryWallet, sdkHasLoaded } = useDynamicContext();
  const { user, isLoading: authLoading, isProfileComplete } = useAuth();
  const { language } = useTheme();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const isVi = language === 'vi';

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!sdkHasLoaded) return; // Đợi SDK load xong
    
    if (isAuthenticated && primaryWallet && !authLoading) {
      // User đã authenticated và có profile complete
      if (user && isProfileComplete) {
        setIsRedirecting(true);
        // Đợi 1 chút để UI hiển thị loading
        const timer = setTimeout(() => {
          router.push('/home');
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [isAuthenticated, primaryWallet, sdkHasLoaded, user, authLoading, isProfileComplete, router]);

  // Hiển thị loading khi đang redirect
  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-primary-50 to-orange-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
        <Card className="p-8 text-center bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
            <div>
              <h2 className="text-xl font-semibold text-dark dark:text-white">
                {isVi ? 'Dang chuyen huong...' : 'Redirecting...'}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {isVi ? 'Vui long doi trong giay lat' : 'Please wait a moment'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-primary-50 to-orange-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 py-12">
        <div className="max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-500 rounded-2xl flex items-center justify-center shadow-elevated">
              <span className="text-white font-bold text-2xl">M</span>
            </div>
            <span className="text-3xl font-bold text-dark dark:text-white">Metabased</span>
          </div>

          <h1 className="text-4xl font-bold text-dark dark:text-white leading-tight mb-4">
            {isVi ? 'Chia se khoanh khac,' : 'Share moments,'}
            <br />
            <span className="text-primary-500">{isVi ? 'So huu ky niem' : 'Own memories'}</span>
          </h1>

          <p className="text-gray-600 dark:text-gray-300 text-lg mb-8">
            {isVi
              ? 'Mang xa hoi noi anh cua ban tro thanh NFT. Ket noi, chia se va giao dich tren Base Sepolia.'
              : 'The social platform where your photos become NFTs. Connect, share, and trade on Base Sepolia.'}
          </p>

          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-soft">
                <Sparkles className="text-primary-500" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-dark dark:text-white">{isVi ? 'Mint thanh NFT' : 'Mint as NFT'}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isVi ? 'Bien anh cua ban thanh tai san so doc nhat' : 'Turn your photos into unique digital assets'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-soft">
                <Wallet className="text-primary-500" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-dark dark:text-white">{isVi ? 'Xay dung tren Base' : 'Built on Base'}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isVi ? 'Phi thap, giao dich nhanh tren L2 cua Coinbase' : "Low fees, fast transactions on Coinbase's L2"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-soft">
                <Shield className="text-primary-500" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-dark dark:text-white">{isVi ? 'An toan va phi tap trung' : 'Secure & Decentralized'}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{isVi ? 'Tai san cua ban, ban toan quyen kiem soat' : 'Your assets, your control'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md p-8 shadow-elevated bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <span className="text-2xl font-bold text-dark dark:text-white">Metabased</span>
          </div>

          <h2 className="text-2xl font-bold text-dark dark:text-white text-center mb-2">
            {isVi ? 'Chao mung quay tro lai' : 'Welcome Back'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-center mb-8">
            {isVi ? 'Ket noi vi cua ban de tiep tuc' : 'Connect your wallet to continue'}
          </p>

          {/* Dynamic Labs Widget */}
          <div className="flex justify-center">
            <DynamicWidget />
          </div>

          {/* Network Badge */}
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-400 dark:text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>{isVi ? 'Mang Base Sepolia' : 'Base Sepolia Network'}</span>
          </div>

          {/* Terms */}
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-6">
            {isVi ? 'Bang viec ket noi, ban dong y voi ' : 'By connecting, you agree to our '}
            <a href="#" className="text-primary-500 hover:underline">{isVi ? 'Dieu khoan dich vu' : 'Terms of Service'}</a>
            {isVi ? ' va ' : ' and '}
            <a href="#" className="text-primary-500 hover:underline">{isVi ? 'Chinh sach bao mat' : 'Privacy Policy'}</a>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
