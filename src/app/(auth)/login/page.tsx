'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DynamicWidget, useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { Card } from '@/components/common';
import { Sparkles, Wallet, Shield, Loader2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

const LoginPage = () => {
  const router = useRouter();
  const { isAuthenticated, primaryWallet, sdkHasLoaded } = useDynamicContext();
  const { user, isLoading: authLoading, isProfileComplete } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!sdkHasLoaded) return; // Đợi SDK load xong
    
    if (isAuthenticated && primaryWallet && !authLoading) {
      // User đã authenticated và có profile complete
      if (user && isProfileComplete) {
        setIsRedirecting(true);
        // Đợi 1 chút để UI hiển thị loading
        const timer = setTimeout(() => {
          if (user.role === 'admin') {
            router.push('/admin');
          } else {
            router.push('/home');
          }
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [isAuthenticated, primaryWallet, sdkHasLoaded, user, authLoading, isProfileComplete, router]);

  // Hiển thị loading khi đang redirect
  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-primary-50 to-orange-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
            <div>
              <h2 className="text-xl font-semibold text-dark">Đang chuyển hướng...</h2>
              <p className="text-gray-500 mt-1">Vui lòng đợi trong giây lát</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-primary-50 to-orange-50 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 py-12">
        <div className="max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-500 rounded-2xl flex items-center justify-center shadow-elevated">
              <span className="text-white font-bold text-2xl">M</span>
            </div>
            <span className="text-3xl font-bold text-dark">Metabased</span>
          </div>

          <h1 className="text-4xl font-bold text-dark leading-tight mb-4">
            Share moments,
            <br />
            <span className="text-primary-500">Own memories</span>
          </h1>

          <p className="text-gray-600 text-lg mb-8">
            The social platform where your photos become NFTs. Connect, share, and trade on Base Sepolia.
          </p>

          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-soft">
                <Sparkles className="text-primary-500" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-dark">Mint as NFT</h3>
                <p className="text-sm text-gray-500">Turn your photos into unique digital assets</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-soft">
                <Wallet className="text-primary-500" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-dark">Built on Base</h3>
                <p className="text-sm text-gray-500">Low fees, fast transactions on Coinbase's L2</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-soft">
                <Shield className="text-primary-500" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-dark">Secure & Decentralized</h3>
                <p className="text-sm text-gray-500">Your assets, your control</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md p-8 shadow-elevated">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <span className="text-2xl font-bold text-dark">Metabased</span>
          </div>

          <h2 className="text-2xl font-bold text-dark text-center mb-2">
            Welcome Back
          </h2>
          <p className="text-gray-500 text-center mb-8">
            Connect your wallet to continue
          </p>

          {/* Dynamic Labs Widget */}
          <div className="flex justify-center">
            <DynamicWidget />
          </div>

          {/* Network Badge */}
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Base Sepolia Network</span>
          </div>

          {/* Terms */}
          <p className="text-xs text-gray-400 text-center mt-6">
            By connecting, you agree to our{' '}
            <a href="#" className="text-primary-500 hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-primary-500 hover:underline">Privacy Policy</a>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
