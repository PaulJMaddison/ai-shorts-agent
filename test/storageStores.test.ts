import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import { appendMetric, readMetrics } from '../src/storage/metricsStore.js';
import { listRuns, writeRunLog } from '../src/storage/runStore.js';

describe('storage stores', () => {
  const createdDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(createdDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  test('writeRunLog and listRuns persist and sort by timestamp desc', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'run-store-test-'));
    createdDirs.push(root);

    const dataDir = path.join(root, 'data');

    await writeRunLog(dataDir, 'clientA', {
      runId: 'run-1',
      timestamp: '2025-01-01T00:00:00.000Z',
      status: 'completed'
    });

    await writeRunLog(dataDir, 'clientA', {
      runId: 'run-2',
      timestamp: '2025-01-02T00:00:00.000Z',
      status: 'failed'
    });

    const runs = await listRuns(dataDir, 'clientA', 1);

    expect(runs).toHaveLength(1);
    expect(runs[0]?.runId).toBe('run-2');
  });

  test('appendMetric trims to last 2000 and readMetrics returns newest first', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'metrics-store-test-'));
    createdDirs.push(root);

    const dataDir = path.join(root, 'data');

    for (let index = 0; index < 2005; index += 1) {
      await appendMetric(dataDir, {
        event: 'run_started',
        timestamp: new Date(Date.UTC(2025, 0, 1, 0, 0, index)).toISOString(),
        index
      });
    }

    const latest = await readMetrics(dataDir, 200);
    const all = await readMetrics(dataDir, 5000);

    expect(all).toHaveLength(2000);
    expect(all.at(-1)?.index).toBe(5);
    expect(latest).toHaveLength(200);
    expect(latest[0]?.index).toBe(2004);
  });
});
