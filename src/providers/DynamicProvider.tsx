'use client';

import { DynamicContextProvider, DynamicMultiWalletPromptsWidget } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';
import { ReactNode } from 'react';
import { AuthProvider } from './AuthProvider';
import { ThemeProvider } from './ThemeProvider';

interface DynamicProviderProps {
  children: ReactNode;
}

export const DynamicProvider = ({ children }: DynamicProviderProps) => {
  return (
    <ThemeProvider>
      <DynamicContextProvider
        settings={{
          environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID || '',
          walletConnectors: [EthereumWalletConnectors],
          events: {
            onLogout: async (args) => {
              localStorage.removeItem('auth_token');
              
              // Clear cookies
              document.cookie = 'demo_authenticated=; path=/; max-age=0';
              document.cookie = 'dynamic_authentication_token=; path=/; max-age=0';
              
              // Redirect to login
              window.location.href = '/login';
            },
            
            // Khi connect ví thành công
            onAuthSuccess: async (args) => {
              
              // Get email from Dynamic user if available
              const email = args.user?.email;
              const walletAddress = args.primaryWallet?.address;
              
              if (args.authToken) {
                // Lưu JWT token
                localStorage.setItem('auth_token', args.authToken);
                
                // Store email và wallet temporarily cho AuthProvider xử lý
                if (email) {
                  localStorage.setItem('user_email', email);
                }
                if (walletAddress) {
                  localStorage.setItem('user_wallet', walletAddress);
                }
                
                // Set cookie cho middleware để có thể check ở server-side
                document.cookie = `dynamic_authentication_token=${args.authToken}; path=/; max-age=86400; SameSite=Lax`;
                
                // Không redirect ngay, để AuthProvider xử lý:
                // - Kiểm tra xem user đã có cả email và wallet trong DB chưa
                // - Nếu thiếu một trong hai, yêu cầu bổ sung
                // - Nếu chưa có username/display_name, hiển thị profile setup modal
                // - Sau khi hoàn tất, mới redirect
              }
            },
            
            onAuthFailure: (args) => {
              console.error('Wallet Connect Failed:', args);
              localStorage.removeItem('auth_token');
            },
          },
        }}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        {/* Widget để hiển thị modal link wallet khi gọi setShowLinkNewWalletModal */}
        <DynamicMultiWalletPromptsWidget />
      </DynamicContextProvider>
    </ThemeProvider>
  );
};

export default DynamicProvider;
