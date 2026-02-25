import { useIsMobile } from '../../hooks/useMediaQuery';
import { CustomersPage } from './CustomersPage';
import { CustomersTabPage } from '../mobile/customers/CustomersTabPage';

/**
 * Adaptive Customers Page - renders different layouts for mobile and desktop
 */
export function AdaptiveCustomersPage() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <CustomersTabPage />;
  }

  return <CustomersPage />;
}
