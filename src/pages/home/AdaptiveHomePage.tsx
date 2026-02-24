import { useIsMobile } from '../../hooks/useMediaQuery';
import { DesktopHomePage } from './HomePage';
import { MobileHomePage } from '../mobile/MobileHomePage';

/**
 * Adaptive home page that automatically switches between
 * desktop and mobile layouts based on screen width
 */
export function AdaptiveHomePage() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileHomePage />;
  }

  return <DesktopHomePage />;
}
