'use client';

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
  return (
    <div className="min-h-screen bg-white">
      {showSidebar && <Sidebar />}
      
      <main
        className={`
          ${showSidebar ? 'ml-[33.33%]' : ''}
          ${showRightPanel ? 'mr-[25%]' : ''}
          ${showBottomNav ? 'pb-20' : ''}
          min-h-screen
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
