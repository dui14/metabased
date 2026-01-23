'use client';

import { useEffect, useState, useRef } from 'react';
import { 
  useDynamicContext, 
  useIsLoggedIn,
  useDynamicModals,
  useUserWallets,
  useSwitchWallet
} from '@dynamic-labs/sdk-react-core';
import { Loader2, Wallet, AlertCircle } from 'lucide-react';
import { Card, Button } from './index';

interface AutoWalletConnectProps {
  // Callback khi connect thành công
  onConnected?: () => void;
  // Callback khi user từ chối/cancel
  onCancelled?: () => void;
}

/**
 * Component tự động kích hoạt connect wallet khi:
 * - User đã login (có email) nhưng chưa có wallet
 * - Hiển thị UI loading và tự động mở modal link wallet
 */
export const AutoWalletConnect = ({ 
  onConnected,
  onCancelled 
}: AutoWalletConnectProps) => {
  const { primaryWallet, user: dynamicUser, sdkHasLoaded } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const { setShowLinkNewWalletModal } = useDynamicModals();
  const userWallets = useUserWallets();
  const switchWallet = useSwitchWallet();
  
  const [status, setStatus] = useState<'idle' | 'connecting' | 'waiting' | 'error' | 'switching'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const hasTriggeredRef = useRef(false);
  const retryCountRef = useRef(0);
  const lastUserIdRef = useRef<string | null>(null);
  const hasSwitchedWalletRef = useRef(false);
  const maxRetries = 3;

  // Kiểm tra xem user đã có wallet nào được link chưa (từ userWallets hoặc primaryWallet)
  const hasAnyWallet = userWallets.length > 0 || !!primaryWallet;
  
  // Chỉ cần link wallet khi:
  // - User đã login (isLoggedIn = true)
  // - Có dynamicUser (đã auth qua email/social)
  // - CHƯA có bất kỳ wallet nào được link
  const needsWalletLink = isLoggedIn && dynamicUser && !hasAnyWallet;
  
  // Case đặc biệt: User đã có wallets nhưng chưa có primaryWallet
  // => Cần tự động switch đến wallet đầu tiên
  const needsWalletSwitch = isLoggedIn && dynamicUser && userWallets.length > 0 && !primaryWallet;
  
  // Lấy userId để track khi user thay đổi
  const currentUserId = dynamicUser?.userId || null;

  // Reset trigger khi user ID thay đổi (user mới login hoặc khác user)
  useEffect(() => {
    if (currentUserId !== lastUserIdRef.current) {
      hasTriggeredRef.current = false;
      hasSwitchedWalletRef.current = false;
      retryCountRef.current = 0;
      setStatus('idle');
      lastUserIdRef.current = currentUserId;
    }
  }, [currentUserId]);

  // Effect để tự động switch wallet nếu user đã có wallets nhưng chưa có primaryWallet
  useEffect(() => {
    if (!sdkHasLoaded) return;
    
    // Nếu cần switch wallet và chưa switch
    if (needsWalletSwitch && !hasSwitchedWalletRef.current) {
      const autoSwitchWallet = async () => {
        hasSwitchedWalletRef.current = true;
        setStatus('switching');
        
        try {
          // Switch đến wallet đầu tiên
          await switchWallet(userWallets[0].id);
          setStatus('idle');
          // Thông báo thành công
          onConnected?.();
        } catch (error) {
          console.error('❌ Không thể chọn ví:', error);
          setStatus('error');
          setErrorMessage('Không thể chọn ví. Vui lòng thử lại.');
          hasSwitchedWalletRef.current = false; // Allow retry
        }
      };
      
      autoSwitchWallet();
    }
  }, [sdkHasLoaded, needsWalletSwitch, userWallets, switchWallet, onConnected]);

  useEffect(() => {
    // Chờ SDK load xong
    if (!sdkHasLoaded) return;
    
    // Nếu không cần link wallet (đã có wallet rồi)
    if (!needsWalletLink) {
      if (hasAnyWallet && hasTriggeredRef.current) {
        // Wallet đã được connect thành công
        setStatus('idle');
        onConnected?.();
      }
      return;
    }

    // Chỉ trigger một lần per user session
    if (hasTriggeredRef.current) {
      return;
    }

    const triggerWalletConnect = async () => {
      hasTriggeredRef.current = true;
      setStatus('connecting');

      try {
        // Delay ngắn để UI ổn định
        await new Promise(resolve => setTimeout(resolve, 300));
        
        setStatus('waiting');
        
        // Mở modal link wallet của Dynamic
        setShowLinkNewWalletModal(true);
        
      } catch (error) {
        console.error('❌ Lỗi kết nối ví:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Không thể kết nối ví');
        
        // Retry logic
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          hasTriggeredRef.current = false; // Allow retry
        }
      }
    };

    // Delay để đảm bảo Dynamic SDK hoàn toàn sẵn sàng
    const timer = setTimeout(triggerWalletConnect, 800);
    
    return () => clearTimeout(timer);
  }, [
    sdkHasLoaded, 
    isLoggedIn,
    dynamicUser,
    needsWalletLink, 
    hasAnyWallet,
    primaryWallet, 
    userWallets.length,
    setShowLinkNewWalletModal,
    onConnected
  ]);

  // Reset hoàn toàn khi không còn user
  useEffect(() => {
    if (!dynamicUser) {
      hasTriggeredRef.current = false;
      hasSwitchedWalletRef.current = false;
      retryCountRef.current = 0;
      lastUserIdRef.current = null;
      setStatus('idle');
    }
  }, [dynamicUser]);

  // Theo dõi khi wallet được connect thành công
  useEffect(() => {
    if (hasAnyWallet && hasTriggeredRef.current && status === 'waiting') {
      setStatus('idle');
      onConnected?.();
    }
  }, [hasAnyWallet, userWallets.length, onConnected, status]);

  // Không render gì nếu không cần link wallet và không đang trong quá trình xử lý
  if (!needsWalletLink && status !== 'waiting' && status !== 'error' && status !== 'switching') {
    return null;
  }

  const handleRetry = () => {
    hasTriggeredRef.current = false;
    hasSwitchedWalletRef.current = false;
    retryCountRef.current = 0;
    setStatus('idle');
    setErrorMessage('');
  };

  const handleCancel = () => {
    setShowLinkNewWalletModal(false);
    onCancelled?.();
  };

  // Khi đang waiting, chỉ hiển thị overlay nhẹ với thông báo
  if (status === 'waiting') {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <Card className="p-4 shadow-lg flex items-center gap-3 bg-white/95 backdrop-blur-sm">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <p className="font-medium text-dark text-sm">Kết nối ví</p>
            <p className="text-xs text-gray-500">Chọn ví để tiếp tục</p>
          </div>
        </Card>
      </div>
    );
  }

  // Hiển thị error với option retry
  if (status === 'error') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-dark mb-2">
            Không thể kết nối ví
          </h2>
          <p className="text-gray-500 mb-4">
            {errorMessage || 'Có lỗi xảy ra khi kết nối ví. Vui lòng thử lại.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={handleCancel}>
              Hủy
            </Button>
            <Button onClick={handleRetry}>
              Thử lại
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Hiển thị loading khi đang connecting hoặc switching
  if (status === 'connecting' || status === 'switching') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-dark mb-2">
            {status === 'switching' ? 'Đang chọn ví...' : 'Đang kết nối ví...'}
          </h2>
          <p className="text-gray-500">
            Vui lòng đợi trong giây lát
          </p>
        </Card>
      </div>
    );
  }

  return null;
};

export default AutoWalletConnect;
