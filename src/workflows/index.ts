export { runDailyShort } from './runDailyShort.js';

export function listWorkflows(): string[] {
  return ['generate-short']
  return ['generate-short', 'run-daily-short'];
}

export { runAllNow, startScheduler } from './scheduler.js'
