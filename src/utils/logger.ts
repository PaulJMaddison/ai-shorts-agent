import { env } from '../config/env.js';

export function logInfo(message: string): void {
  if (['debug', 'info'].includes(env.LOG_LEVEL)) {
    // eslint-disable-next-line no-console
    console.info(`[info] ${message}`);
  }
}
