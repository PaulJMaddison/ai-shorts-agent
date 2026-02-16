import { env } from '../config/env.js';

export function getServerConfig(): { port: number } {
  return { port: env.APP_PORT };
}
