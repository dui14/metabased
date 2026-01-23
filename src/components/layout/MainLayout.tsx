'use client';

import dynamic from 'next/dynamic';
import { Suspense, memo } from 'react';

// Lazy load các components nặng để cải thiện initial load time
const Sidebar = dynamic(() => import('./Sidebar'), {
  ssr: false,
  loading: () => <div className="fixed left-0 top-0 h-screen w-[25%] bg-white dark:bg-gray-900 animate-pulse" />,
});

const RightPanel = dynamic(() => import('./RightPanel'), {
  ssr: false,
  loading: () => <div className="fixed right-0 top-0 h-screen w-[25%] bg-white dark:bg-gray-900 animate-pulse" />,
});

const BottomNav = dynamic(() => import('./BottomNav'), {
  ssr: false,
});

interface MainLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  showRightPanel?: boolean;
  showBottomNav?: boolean;
}

const MainLayout = memo(({
  children,
  showSidebar = true,
  showRightPanel = true,
  showBottomNav = true,
}: MainLayoutProps) => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors">
      {showSidebar && (
        <Suspense fallback={<div className="fixed left-0 top-0 h-screen w-[25%] bg-white dark:bg-gray-900" />}>
          <Sidebar />
        </Suspense>
      )}
      
      <main
        className={`
          ${showSidebar ? 'ml-[25%]' : ''}
          ${showRightPanel ? 'mr-[25%]' : ''}
          ${showBottomNav ? 'pb-20' : ''}
          min-h-screen
        `}
      >
        {children}
      </main>

      {showRightPanel && (
        <Suspense fallback={<div className="fixed right-0 top-0 h-screen w-[25%] bg-white dark:bg-gray-900" />}>
          <RightPanel />
        </Suspense>
      )}
      {showBottomNav && <BottomNav />}
    </div>
  );
});

MainLayout.displayName = 'MainLayout';

export default MainLayout;
