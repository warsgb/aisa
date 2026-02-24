import { useMobileTabStore } from '../../stores/mobileTab.store';
import { WorkspaceTabPage } from './workspace/WorkspaceTabPage';
import { CustomersTabPage } from './customers/CustomersTabPage';
import { HistoryTabPage } from './history/HistoryTabPage';

/**
 * Mobile home page container
 * Routes to different tab pages based on active tab state
 */
export function MobileHomePage() {
  const { activeTab } = useMobileTabStore();

  return (
    <div className="min-h-screen">
      {activeTab === 'workspace' && <WorkspaceTabPage />}
      {activeTab === 'customers' && <CustomersTabPage />}
      {activeTab === 'history' && <HistoryTabPage />}
    </div>
  );
}
