import { env } from '../config/env.js';

export function runAgent(): string {
  return `ai-shorts-agent running in ${env.NODE_ENV} mode on port ${env.APP_PORT}`;
}
