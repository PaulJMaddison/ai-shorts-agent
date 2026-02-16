import { access, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

type Loaded = Awaited<ReturnType<typeof loadModules>>;

async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function toRuntimeClient(client: {
  id: string;
  name: string;
  niche: string;
  topics: string[];
  youtube: { provider: string };
}): {
  id: string;
  displayName: string;
  niche: string;
  language: string;
  tone: 'educational';
  topicBank: string[];
  topics: string[];
  youtube: { provider: string };
} {
  return {
    ...client,
    displayName: client.name,
    language: 'en-GB',
    tone: 'educational',
    topicBank: client.topics
  };
}

async function loadModules() {
  vi.resetModules();

  const [{ loadClients }, { runDailyShort }, { StubScriptWriter }, { StubVoiceSynth }, { StubAvatarRenderer }, { StubYouTubeUploader }, { jobStore }] = await Promise.all([
    import('../src/config/clients.js'),
    import('../src/workflows/runDailyShort.js'),
    import('../src/providers/stub/StubScriptWriter.js'),
    import('../src/providers/stub/StubVoiceSynth.js'),
    import('../src/providers/stub/StubAvatarRenderer.js'),
    import('../src/providers/stub/StubYouTubeUploader.js'),
    import('../src/storage/index.js')
  ]);

  return {
    loadClients,
    runDailyShort,
    providers: {
      writer: new StubScriptWriter(),
      voice: new StubVoiceSynth({ dataDir: 'data' }),
      renderer: new StubAvatarRenderer(),
      uploader: new StubYouTubeUploader()
    },
    jobStore
  };
}

describe('multi-client stub pipeline', () => {
  const repoRoot = process.cwd();
  let testRoot = '';
  let modules: Loaded;

  beforeAll(async () => {
    testRoot = await mkdtemp(path.join(os.tmpdir(), 'ai-shorts-agent-test-'));

    process.env.NODE_ENV = 'test';
    process.env.USE_STUBS = 'true';
    process.env.DATA_DIR = './data';
    process.env.STUB_RENDER_MS = '1000';

    process.chdir(testRoot);

    modules = await loadModules();
  });

  afterAll(async () => {
    process.chdir(repoRoot);

    if (testRoot) {
      await rm(testRoot, { recursive: true, force: true });
    }
  });

  test('runs runDailyShort for two clients and persists outputs/jobs', async () => {
    const clientsFilePath = path.join(repoRoot, 'data', 'clients.example.json');
    const loadedClients = await modules.loadClients(clientsFilePath);
    const clients = loadedClients.slice(0, 2).map((client) => toRuntimeClient(client));

    expect(clients).toHaveLength(2);

    for (const client of clients) {
      await modules.runDailyShort({
        client,
        providers: modules.providers,
        jobStore: modules.jobStore
      });

      const baseDir = path.join(testRoot, 'data', 'clients', client.id);
      const expectedDirs = ['audio', 'video', 'uploads', 'runs'];

      for (const dirName of expectedDirs) {
        const dirPath = path.join(baseDir, dirName);
        const dirStats = await stat(dirPath);

        expect(dirStats.isDirectory()).toBe(true);
      }

      const jobs = await modules.jobStore.listByClient(client.id, 10);

      expect(jobs.length).toBeGreaterThanOrEqual(1);
      expect(jobs[0]?.clientId).toBe(client.id);
      expect(jobs[0]?.status).toBe('completed');
    }

    const jobsFilePath = path.join(testRoot, 'data', 'jobs.json');
    expect(await pathExists(jobsFilePath)).toBe(true);

    const jobsFile = JSON.parse(await readFile(jobsFilePath, 'utf8')) as Record<string, { clientId: string }>;
    const jobClientIds = new Set(Object.values(jobsFile).map((job) => job.clientId));

    expect(jobClientIds.has(clients[0].id)).toBe(true);
    expect(jobClientIds.has(clients[1].id)).toBe(true);
  }, 20_000);
});
