export function listWorkflows(): string[] {
  return ['generate-short']
}

export { runAllNow, startScheduler } from './scheduler.js'
