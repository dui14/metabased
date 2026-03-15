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

  useEffect(() => {
    const stored = window.localStorage.getItem('sidebar-collapsed');
    if (stored === 'true') {
      setIsSidebarCollapsed(true);
    }
  }, []);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem('sidebar-collapsed', next ? 'true' : 'false');
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {showSidebar && (
        <Sidebar
          collapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
      )}
      
      <main
        className={`
          ${showSidebar ? (isSidebarCollapsed ? 'md:ml-20' : 'md:ml-72') : ''}
          ${showRightPanel ? 'lg:mr-[25%]' : ''}
          ${showBottomNav ? 'pb-20' : ''}
          min-h-screen transition-all duration-300
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
