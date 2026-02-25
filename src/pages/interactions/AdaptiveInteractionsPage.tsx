import { useIsMobile } from '../../hooks/useMediaQuery';
import { InteractionsPage } from './InteractionsPage';
import { HistoryTabPage } from '../mobile/history/HistoryTabPage';

/**
 * Adaptive Interactions Page - renders different layouts for mobile and desktop
 */
export function AdaptiveInteractionsPage() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <HistoryTabPage />;
  }

  return <InteractionsPage />;
}
