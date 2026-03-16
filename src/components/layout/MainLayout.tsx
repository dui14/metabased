'use client';

import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import RightPanel from './RightPanel';
import BottomNav from './BottomNav';

interface MainLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  showRightPanel?: boolean;
  showBottomNav?: boolean;
}

const MainLayout = ({
  children,
  showSidebar = true,
  showRightPanel = false,
  showBottomNav = true,
}: MainLayoutProps) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem('sidebar-collapsed');
    if (stored === 'true') {
      setIsSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncViewport = () => {
      const isMobile = mediaQuery.matches;
      setIsMobileViewport(isMobile);
      if (!isMobile) {
        setIsMobileSidebarOpen(false);
      }
    };
    syncViewport();
    mediaQuery.addEventListener('change', syncViewport);
    return () => {
      mediaQuery.removeEventListener('change', syncViewport);
    };
  }, []);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem('sidebar-collapsed', next ? 'true' : 'false');
      return next;
    });
  };

  const effectiveCollapsed = isMobileViewport ? false : isSidebarCollapsed;

  return (
    <div className="min-h-screen bg-white">
      {showSidebar && (
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
          className={`fixed left-4 top-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-xl text-gray-700 shadow-sm md:hidden ${
            isMobileSidebarOpen ? 'hidden' : ''
          }`}
          aria-label={isMobileSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          aria-expanded={isMobileSidebarOpen}
        >
          ☰
        </button>
      )}

      {showSidebar && isMobileSidebarOpen && (
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          aria-label="Close sidebar overlay"
        />
      )}

      {showSidebar && (
        <Sidebar
          collapsed={effectiveCollapsed}
          onToggleCollapse={handleToggleSidebar}
          mobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />
      )}
      
      <main
        className={`
          ${showSidebar ? (isSidebarCollapsed ? 'md:ml-20' : 'md:ml-72') : ''}
          ${showRightPanel ? 'lg:mr-[25%]' : ''}
          ${showBottomNav ? 'pb-20' : ''}
          min-h-screen transition-[margin] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
        `}
      >
        {children}
      </main>

      {showRightPanel && <RightPanel />}
      {showBottomNav && <BottomNav />}
    </div>
  );
};

export default MainLayout;
