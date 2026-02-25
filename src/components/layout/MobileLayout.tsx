import { Outlet } from 'react-router-dom';
import { MobileTabBar } from '../mobile/MobileTabBar';

interface MobileLayoutProps {
  children?: React.ReactNode;
}

/**
 * Mobile layout wrapper for all mobile pages
 * Provides consistent spacing and bottom tab navigation
 */
export function MobileLayout({ children }: MobileLayoutProps) {
  return (
    <div className="min-h-screen bg-background pb-20">
      {children || <Outlet />}
      <MobileTabBar />
    </div>
  );
}
