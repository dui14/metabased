'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useDynamicContext, useIsLoggedIn } from '@dynamic-labs/sdk-react-core';
import { ProfileSetupModal, AutoWalletConnect } from '@/components/common';
import type { DbUser } from '@/lib/supabase';

interface AuthContextType {
  user: DbUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper để set cookie
const setCookie = (name: string, value: string, days: number = 7) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
};

// Helper để xóa cookie
const deleteCookie = (name: string) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const { user: dynamicUser, primaryWallet, handleLogOut, sdkHasLoaded } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const [user, setUser] = useState<DbUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [showAutoWalletConnect, setShowAutoWalletConnect] = useState(false);
  const hasRedirectedRef = useRef(false); // Track if we've already redirected
  const previousAddressRef = useRef<string | null>(null); // Track previous wallet address

  const fetchUserProfile = useCallback(async (address: string, shouldRedirect: boolean = false) => {
    try {
      const response = await fetch(`/api/users/profile?wallet=${encodeURIComponent(address)}`);
      const data = await response.json();

      // Get email from Dynamic user hoặc localStorage
      const dynamicEmail = dynamicUser?.email;
      const storedEmail = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null;
      const userEmail = dynamicEmail || storedEmail;

      if (data.is_new || !data.user) {
        // User mới chưa có trong DB
        // Tạo record với wallet và email (nếu có)
        await fetch('/api/users/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            wallet_address: address,
            email: userEmail || undefined
          }),
        });
        
        // Fetch lại để lấy user mới tạo
        const newUserResponse = await fetch(`/api/users/profile?wallet=${encodeURIComponent(address)}`);
        const newUserData = await newUserResponse.json();
        
        // Hiển thị popup setup profile (yêu cầu username, display_name)
        setWalletAddress(address);
        setShowProfileSetup(true);
        setUser(newUserData.user);
        deleteCookie('user_role');
      } else {
        const existingUser = data.user;
        
        // Update email nếu user chưa có email nhưng hiện tại có
        if (userEmail && !existingUser.email) {
          await fetch('/api/users/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              wallet_address: address,
              email: userEmail
            }),
          });
          existingUser.email = userEmail;
        }
        
        // Kiểm tra profile đã đầy đủ chưa: wallet, email, username, display_name
        const hasAllInfo = existingUser.wallet_address && existingUser.email && 
                          existingUser.username && existingUser.display_name;
        
        if (!hasAllInfo) {
          // User đã có trong DB nhưng chưa đầy đủ thông tin
          // Hiển thị popup yêu cầu điền thông tin còn thiếu
          setWalletAddress(address);
          setShowProfileSetup(true);
          setUser(existingUser);
          if (existingUser.role) {
            setCookie('user_role', existingUser.role);
          }
        } else {
          // User đã có và đã có đầy đủ thông tin
          setUser(existingUser);
          setShowProfileSetup(false);
          
          if (existingUser.role) {
            setCookie('user_role', existingUser.role);
          }
          
          // Redirect nếu đang ở trang login VÀ chưa redirect lần nào
          if (shouldRedirect && window.location.pathname === '/login' && !hasRedirectedRef.current) {
            hasRedirectedRef.current = true;
            
            setTimeout(() => {
              window.location.href = '/home';
            }, 100);
          }
        }
      }
      
      // Clear stored email after use
      if (storedEmail) {
        localStorage.removeItem('user_email');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dynamicUser]);

  // Hàm verify auth trước khi fetch user
  const verifyAndFetchUser = useCallback(async (address: string, shouldRedirect: boolean = false) => {
    try {
      const email = dynamicUser?.email;
      
      // Nếu không có email, chỉ cần fetch user profile bình thường
      if (!email) {
        await fetchUserProfile(address, shouldRedirect);
        return;
      }

      // Có cả email và wallet => verify chúng khớp với DB
      const verifyResponse = await fetch('/api/users/verify-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          wallet_address: address
        }),
      });

      const verifyData = await verifyResponse.json();

      if (verifyData.conflict) {
        // Email và wallet không thuộc cùng 1 user
        alert(verifyData.message || 'Email và ví không khớp với tài khoản đã có. Vui lòng đăng nhập lại với thông tin đúng.');
        handleLogOut();
        return;
      }

      if (verifyData.is_new || verifyData.needs_creation) {
        // User mới, tạo trong DB
        await fetchUserProfile(address, shouldRedirect);
        return;
      }

      // User đã tồn tại và verified
      if (verifyData.verified && verifyData.user) {
        const existingUser = verifyData.user;
        
        // Kiểm tra có đầy đủ thông tin chưa: wallet, email, username, display_name
        const hasAllInfo = existingUser.wallet_address && existingUser.email && 
                          existingUser.username && existingUser.display_name;
        
        if (!hasAllInfo || verifyData.needs_profile_setup) {
          // User chưa có đầy đủ thông tin
          setWalletAddress(address);
          setShowProfileSetup(true);
          setUser(existingUser);
          if (existingUser.role) {
            setCookie('user_role', existingUser.role);
          }
        } else {
          // User đã có đầy đủ thông tin
          setUser(existingUser);
          setShowProfileSetup(false);
          
          if (existingUser.role) {
            setCookie('user_role', existingUser.role);
          }
          
          if (shouldRedirect && window.location.pathname === '/login' && !hasRedirectedRef.current) {
            hasRedirectedRef.current = true;
            setTimeout(() => {
              window.location.href = '/home';
            }, 100);
          }
        }
      }
    } catch (error) {
      console.error('Error verifying auth:', error);
      // Fallback to normal flow
      await fetchUserProfile(address, shouldRedirect);
    } finally {
      setIsLoading(false);
    }
  }, [dynamicUser?.email, fetchUserProfile, handleLogOut]);

  const refreshUser = useCallback(async () => {
    if (primaryWallet?.address) {
      setIsLoading(true);
      await verifyAndFetchUser(primaryWallet.address, false);
    }
  }, [primaryWallet?.address, verifyAndFetchUser]);

  const logout = useCallback(() => {
    setUser(null);
    setShowProfileSetup(false);
    setShowAutoWalletConnect(false);
    deleteCookie('user_role');
    hasRedirectedRef.current = false; // Reset redirect flag khi logout
    previousAddressRef.current = null; // Reset previous address
    handleLogOut();
  }, [handleLogOut]);

  // Effect để kiểm tra và hiển thị AutoWalletConnect
  // Khi user đã login (có email) nhưng chưa có wallet
  useEffect(() => {
    if (!sdkHasLoaded) return;
    
    // Case 1: User đã login với email nhưng chưa có wallet
    // => Hiển thị AutoWalletConnect để yêu cầu link wallet
    if (isLoggedIn && dynamicUser && dynamicUser.email && !primaryWallet) {
      setShowAutoWalletConnect(true);
      return;
    }

    // Case 2: User đã có wallet
    if (primaryWallet) {
      setShowAutoWalletConnect(false);
    }
  }, [sdkHasLoaded, isLoggedIn, dynamicUser, primaryWallet]);

  // Khi wallet thay đổi
  useEffect(() => {
    if (!sdkHasLoaded) return; // Đợi SDK load xong
    
    if (primaryWallet?.address) {
      // Check if this is a new wallet address (different from previous)
      const isNewConnection = previousAddressRef.current !== primaryWallet.address;
      
      if (isNewConnection) {
        hasRedirectedRef.current = false; // Reset redirect flag for new connection
        previousAddressRef.current = primaryWallet.address;
        
        // Verify auth: kiểm tra email và wallet có khớp với DB không
        verifyAndFetchUser(primaryWallet.address, true);
      }
      // Nếu không phải wallet mới, không fetch lại để tránh infinite loop
    } else {
      setUser(null);
      setIsLoading(false);
      setShowProfileSetup(false);
      deleteCookie('user_role');
      hasRedirectedRef.current = false; // Reset khi disconnect
      previousAddressRef.current = null;
    }
  }, [primaryWallet?.address, sdkHasLoaded, verifyAndFetchUser]);

  const handleProfileComplete = async (username: string, displayName: string) => {
    setShowProfileSetup(false);
    // Refresh user data
    if (primaryWallet?.address) {
      await fetchUserProfile(primaryWallet.address);
    }
    // Redirect đến home sau khi setup profile xong
    window.location.href = '/home';
  };

  // Handler khi wallet connect thành công
  const handleWalletConnected = () => {
    setShowAutoWalletConnect(false);
  };

  // Handler khi user hủy connect wallet
  const handleWalletConnectCancelled = () => {
    setShowAutoWalletConnect(false);
    // Có thể logout hoặc giữ user ở trạng thái hiện tại
    // Tùy thuộc vào yêu cầu business logic
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!dynamicUser && !!primaryWallet,
    // Profile complete khi có đầy đủ: wallet, email, username, display_name
    isProfileComplete: !!(user?.wallet_address && user?.email && user?.username && user?.display_name),
    isAdmin: user?.role === 'admin',
    refreshUser,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      
      {/* Auto Wallet Connect - hiển thị khi user đã login email nhưng chưa có wallet */}
      {showAutoWalletConnect && (
        <AutoWalletConnect
          onConnected={handleWalletConnected}
          onCancelled={handleWalletConnectCancelled}
        />
      )}
      
      {/* Profile Setup Modal - hiển thị khi user mới hoặc chưa setup profile */}
      {showProfileSetup && walletAddress && (
        <ProfileSetupModal
          isOpen={showProfileSetup}
          onComplete={handleProfileComplete}
          walletAddress={walletAddress}
        />
      )}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
