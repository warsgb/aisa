export interface TeamSyncChanges {
  hasChanges: boolean;
  changes: {
    ltcNodes: { added: number; updated: number; skipped: number };
    roleConfigs: { updated: number; skipped: number };
  };
}

export interface SyncResult {
  success: number;
  skipped: number;
  errors: number;
  details: Array<{
    teamId: string;
    teamName?: string;
    changes?: TeamSyncChanges;
    error?: string;
  }>;
}
