import { describe, expect, test } from 'vitest';

import { runDoctor } from '../src/workflows/doctor.js';
import type { Env } from '../src/config/env.js';

function createEnv(overrides: Partial<Env> = {}): Env {
  return {
    NODE_ENV: 'test',
    APP_PORT: 3000,
    LOG_LEVEL: 'info',
    USE_STUBS: true,
    STUB_RENDER_MS: 1000,
    STUB_FAIL_RATE: 0,
    DATA_DIR: './data',
    CLIENTS_FILE: './data/clients.example.json',
    DEFAULT_TIMEZONE: 'Europe/London',
    OPENAI_API_KEY: undefined,
    ELEVENLABS_API_KEY: undefined,
    HEYGEN_API_KEY: undefined,
    DID_API_KEY: undefined,
    YOUTUBE_CLIENT_ID: undefined,
    YOUTUBE_CLIENT_SECRET: undefined,
    YOUTUBE_REDIRECT_URI: undefined,
    YOUTUBE_REFRESH_TOKEN: undefined,
    ...overrides
  };
}

describe('runDoctor', () => {
  test('passes in stubs mode using clients.example.json', async () => {
    const result = await runDoctor({
      env: createEnv(),
      clientsFile: './data/clients.example.json'
    });

    expect(result.ok).toBe(true);
    expect(result.mode).toBe('stubs');
    expect(result.clients.length).toBeGreaterThan(0);
    expect(result.errors).toEqual([]);
  });
});
