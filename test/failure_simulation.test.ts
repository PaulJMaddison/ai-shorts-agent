import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
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

describe('renderer failure simulation', () => {
  const repoRoot = process.cwd();
  let testRoot = '';
  let modules: Loaded;

  beforeAll(async () => {
    testRoot = await mkdtemp(path.join(os.tmpdir(), 'ai-shorts-failure-simulation-'));

    process.env.NODE_ENV = 'test';
    process.env.USE_STUBS = 'true';
    process.env.STUB_RENDER_MS = '150';
    process.env.STUB_FAIL_RATE = '1';
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

  test('STUB_FAIL_RATE=1 causes failed run metric and failed run log', async () => {
    const client: RunDailyShortClient = {
      id: 'fail-client',
      displayName: 'Fail Client',
      niche: 'tech',
      language: 'en-GB',
      tone: 'educational',
      topicBank: ['Renderer reliability']
    };

    await expect(
      modules.runDailyShort({
        client,
        providers: modules.providers,
        jobStore: modules.jobStore,
        dataDir: './data'
      })
    ).rejects.toThrow(/Daily short run failed/);

    const metricsPath = path.join(testRoot, 'data', 'metrics.json');
    const metrics = JSON.parse(await readFile(metricsPath, 'utf8')) as Array<{
      event: string;
      clientId?: string;
    }>;

    expect(
      metrics.some((metric) => metric.event === 'run_failed' && metric.clientId === client.id)
    ).toBe(true);

    const runsDir = path.join(testRoot, 'data', 'clients', client.id, 'runs');
    const runFiles = (await readdir(runsDir)).filter((fileName) => fileName.endsWith('.json'));

    expect(runFiles.length).toBeGreaterThan(0);

    const latestRunPath = path.join(runsDir, runFiles.sort().at(-1) ?? runFiles[0] ?? '');
    const latestRun = JSON.parse(await readFile(latestRunPath, 'utf8')) as { status: string };

    expect(latestRun.status).toBe('failed');
  }, 20_000);
});
