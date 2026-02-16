import dotenv from 'dotenv';
import path from 'node:path';
import { z } from 'zod';

dotenv.config();

const booleanFromEnv = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  USE_STUBS: booleanFromEnv.default('true'),
  STUB_RENDER_MS: z.coerce.number().int().nonnegative().default(5_000),
  STUB_FAIL_RATE: z.coerce.number().min(0).max(1).default(0),
  DATA_DIR: z.string().trim().min(1).default('./data'),
  CLIENTS_FILE: z.string().trim().min(1).default('./data/clients.json'),
  DEFAULT_TIMEZONE: z.string().trim().min(1).default('Europe/London'),
  OPENAI_API_KEY: z.string().trim().min(1).optional(),
  ELEVENLABS_API_KEY: z.string().trim().min(1).optional(),
  HEYGEN_API_KEY: z.string().trim().min(1).optional(),
  DID_API_KEY: z.string().trim().min(1).optional(),
  YOUTUBE_CLIENT_ID: z.string().trim().min(1).optional(),
  YOUTUBE_CLIENT_SECRET: z.string().trim().min(1).optional(),
  YOUTUBE_REDIRECT_URI: z.string().trim().min(1).optional(),
  YOUTUBE_REFRESH_TOKEN: z.string().trim().min(1).optional()
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);

export function resolveClientsFilePath(): string {
  return path.resolve(process.cwd(), env.CLIENTS_FILE);
}
