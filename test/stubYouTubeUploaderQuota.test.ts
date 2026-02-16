import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import { StubYouTubeUploader } from '../src/providers/stub/StubYouTubeUploader.js';

describe('StubYouTubeUploader daily quota', () => {
  let dataDir = '';

  beforeAll(async () => {
    dataDir = await mkdtemp(path.join(os.tmpdir(), 'stub-uploader-quota-'));
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-20T12:00:00.000Z'));
  });

  afterAll(async () => {
    vi.useRealTimers();

    if (dataDir) {
      await rm(dataDir, { recursive: true, force: true });
    }
  });

  test('second upload in same day fails when maxUploadsPerDay is 1', async () => {
    const uploader = new StubYouTubeUploader({ dataDir });
    const client = {
      id: 'client-one',
      displayName: 'Client One',
      niche: 'tech',
      language: 'en',
      tone: 'educational' as const,
      topicBank: ['AI'],
      schedule: { maxPerDay: 3 },
      limits: { maxUploadsPerDay: 1 }
    };

    const script = {
      topic: 'AI',
      niche: 'tech',
      language: 'en',
      tone: 'educational' as const,
      hook: 'Hook',
      body: 'Body',
      cta: 'CTA',
      titleSuggestions: ['Title'],
      description: 'Desc',
      tags: ['ai'],
      durationSecTarget: 30
    };

    const video = {
      path: '/tmp/video.mp4',
      mimeType: 'video/mp4'
    };

    await expect(uploader.uploadShort({ client, script, video })).resolves.toMatchObject({
      provider: 'stub'
    });

    await expect(uploader.uploadShort({ client, script, video })).rejects.toThrow(/Daily upload quota exceeded/);

    const quotaPath = path.join(dataDir, 'clients', client.id, 'uploads', 'quota_2026-01-20.json');
    const quota = JSON.parse(await readFile(quotaPath, 'utf8')) as { date: string; count: number };

    expect(quota).toEqual({
      date: '2026-01-20',
      count: 1
    });
  });
});
