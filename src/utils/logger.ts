import { env } from '../config/env.js';

export function logInfo(message: string): void {
  if (['debug', 'info'].includes(env.LOG_LEVEL)) {
    console.info(`[info] ${message}`);
  }
}
