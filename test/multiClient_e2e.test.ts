import { access, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import type { RunDailyShortClient } from '../src/workflows/runDailyShort.js';

type Loaded = Awaited<ReturnType<typeof loadModules>>;

async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

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

describe('multi-client e2e workflow', () => {
  const repoRoot = process.cwd();
  let testRoot = '';
  let modules: Loaded;

  beforeAll(async () => {
    testRoot = await mkdtemp(path.join(os.tmpdir(), 'ai-shorts-multi-client-e2e-'));

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

  test('runs two clients and persists files + run_completed metrics', async () => {
    const clients: RunDailyShortClient[] = [
      {
        id: 'client-a',
        displayName: 'Client A',
        niche: 'tech',
        language: 'en-GB',
        tone: 'educational',
        topicBank: ['AI news']
      },
      {
        id: 'client-b',
        displayName: 'Client B',
        niche: 'fitness',
        language: 'en-GB',
        tone: 'educational',
        topicBank: ['Mobility tips']
      }
    ];

    for (const client of clients) {
      await modules.runDailyShort({
        client,
        providers: modules.providers,
        jobStore: modules.jobStore,
        dataDir: './data'
      });

      const clientBaseDir = path.join(testRoot, 'data', 'clients', client.id);
      const expectedDirs = ['audio', 'video', 'uploads', 'runs'];

      for (const dirName of expectedDirs) {
        const dirPath = path.join(clientBaseDir, dirName);
        expect(await pathExists(dirPath)).toBe(true);

        const dirStats = await stat(dirPath);
        expect(dirStats.isDirectory()).toBe(true);
      }
    }

    const metricsPath = path.join(testRoot, 'data', 'metrics.json');
    expect(await pathExists(metricsPath)).toBe(true);

    const metrics = JSON.parse(await readFile(metricsPath, 'utf8')) as Array<{
      event: string;
      clientId?: string;
    }>;

    for (const client of clients) {
      expect(
        metrics.some((metric) => metric.event === 'run_completed' && metric.clientId === client.id)
      ).toBe(true);
    }
  }, 20_000);
});
