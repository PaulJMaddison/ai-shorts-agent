import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import type { RunDailyShortClient } from '../src/workflows/runDailyShort.js';

type Loaded = Awaited<ReturnType<typeof loadModules>>;

async function loadModules() {
  vi.resetModules();

  const [{ runDailyShort }, { StubScriptWriter }, { StubVoiceSynth }, { StubAvatarRenderer }, { StubYouTubeUploader }, { jobStore }] = await Promise.all([
    import('../src/workflows/runDailyShort.js'),
    import('../src/providers/stub/StubScriptWriter.js'),
    import('../src/providers/stub/StubVoiceSynth.js'),
    import('../src/providers/stub/StubAvatarRenderer.js'),
    import('../src/providers/stub/StubYouTubeUploader.js'),
    import('../src/storage/index.js')
  ]);

  return {
    runDailyShort,
    providers: {
      writer: new StubScriptWriter(),
      voice: new StubVoiceSynth({ dataDir: 'data' }),
      renderer: new StubAvatarRenderer(),
      uploader: new StubYouTubeUploader({ dataDir: 'data' })
    },
    jobStore
  };
}

describe('quota enforced in workflow', () => {
  const repoRoot = process.cwd();
  let testRoot = '';
  let modules: Loaded;

  beforeAll(async () => {
    testRoot = await mkdtemp(path.join(os.tmpdir(), 'ai-shorts-quota-enforced-'));

    process.env.NODE_ENV = 'test';
    process.env.USE_STUBS = 'true';
    process.env.STUB_RENDER_MS = '150';
    process.env.STUB_FAIL_RATE = '0';
    process.env.DATA_DIR = './data';

    process.chdir(testRoot);

    modules = await loadModules();
  });

  afterAll(async () => {
    process.chdir(repoRoot);

    if (testRoot) {
      await rm(testRoot, { recursive: true, force: true });
    }
  });

  test('second run on same day fails when maxUploadsPerDay is 1 and emits run_failed', async () => {
    const client: RunDailyShortClient = {
      id: 'quota-client',
      displayName: 'Quota Client',
      niche: 'tech',
      language: 'en-GB',
      tone: 'educational',
      topicBank: ['AI updates'],
      limits: {
        maxUploadsPerDay: 1
      }
    } as RunDailyShortClient & { limits: { maxUploadsPerDay: number } };

    await expect(
      modules.runDailyShort({
        client,
        providers: modules.providers,
        jobStore: modules.jobStore,
        dataDir: './data'
      })
    ).resolves.toMatchObject({ status: 'completed' });

    await expect(
      modules.runDailyShort({
        client,
        providers: modules.providers,
        jobStore: modules.jobStore,
        dataDir: './data'
      })
    ).rejects.toThrow(/Daily upload quota exceeded/);

    const metricsPath = path.join(testRoot, 'data', 'metrics.json');
    const metrics = JSON.parse(await readFile(metricsPath, 'utf8')) as Array<{
      event: string;
      clientId?: string;
      error?: string;
    }>;

    const failedForClient = metrics.filter(
      (metric) => metric.event === 'run_failed' && metric.clientId === client.id
    );

    expect(failedForClient).toHaveLength(1);
    expect(failedForClient[0]?.error).toContain('Daily upload quota exceeded');
  }, 20_000);
});
