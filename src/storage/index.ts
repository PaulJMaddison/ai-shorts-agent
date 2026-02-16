export interface StorageAdapter {
  kind: string;
}

export * as jobStore from './jobStore.js';
export * as metricsStore from './metricsStore.js';
export * as runStore from './runStore.js';
export * as quotaStore from './quotaStore.js';
