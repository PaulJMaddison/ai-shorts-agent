import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import type { Providers } from '../src/core/interfaces.js';
import type { RunDailyShortClient } from '../src/workflows/runDailyShort.js';
import { runDailyShort } from '../src/workflows/runDailyShort.js';

const client: RunDailyShortClient = {
  id: 'client-fail',
  displayName: 'Fail Client',
  niche: 'tech',
  language: 'en',
  tone: 'educational',
  topicBank: ['Edge AI']
};

function createProvidersForFailure(): Providers {
  const script = {
    topic: 'Edge AI',
    niche: 'tech',
    language: 'en',
    tone: 'educational' as const,
    hook: 'Edge AI quick take',
    body: 'short body',
    cta: 'Learn more.',
    titleSuggestions: ['Edge AI quick take'],
    description: 'desc',
    tags: ['ai'],
    durationSecTarget: 30
  };

  return {
    writer: {
      writeScript: vi.fn(async () => script)
    },
    voice: {
      synthesize: vi.fn(async () => {
        throw new Error('voice synthesis exploded');
      })
    },
    renderer: {
      render: vi.fn(),
      getStatus: vi.fn(),
      download: vi.fn()
    },
    uploader: {
      uploadShort: vi.fn()
    }
  };
}

describe('runDailyShort failure handling', () => {
  const repoRoot = process.cwd();
  let testRoot = '';

  beforeAll(async () => {
    testRoot = await mkdtemp(path.join(os.tmpdir(), 'run-daily-short-failure-'));
    process.chdir(testRoot);
  });

  afterAll(async () => {
    process.chdir(repoRoot);

    if (testRoot) {
      await rm(testRoot, { recursive: true, force: true });
    }
  });

  test('writes failed run log and run_failed metric when workflow throws', async () => {
    const providers = createProvidersForFailure();

    await expect(
      runDailyShort({
        client,
        providers,
        jobStore: {},
        dataDir: './data'
      })
    ).rejects.toThrow(/Daily short run failed/);

    expect(providers.voice.synthesize).toHaveBeenCalledTimes(3);

    const runsDir = path.join(testRoot, 'data', 'clients', client.id, 'runs');
    const runFiles = (await readdir(runsDir)).filter((filename) => filename.endsWith('.json'));

    expect(runFiles.length).toBe(1);

    const runLogPath = path.join(runsDir, runFiles[0]);
    const runLog = JSON.parse(await readFile(runLogPath, 'utf8')) as {
      status: string;
      error?: { message: string };
    };

    expect(runLog.status).toBe('failed');
    expect(runLog.error?.message).toContain('voice synthesis exploded');

    const metricsPath = path.join(testRoot, 'data', 'metrics.json');
    const metrics = JSON.parse(await readFile(metricsPath, 'utf8')) as Array<{ event: string }>;

    expect(metrics.some((metric) => metric.event === 'run_failed')).toBe(true);
  });
});
