import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

import { env } from '../../config/env.js';
import type { Uploader } from '../../core/interfaces.js';
import type { UploadResult } from '../../core/types.js';
import { getDailyCount, incrementDailyCount } from '../../storage/quotaStore.js';

interface StubYouTubeUploaderOptions {
  dataDir?: string;
}

function getMaxUploadsPerDay(client: Parameters<Uploader['uploadShort']>[0]['client']): number {
  const typedClient = client as Parameters<Uploader['uploadShort']>[0]['client'] & {
    limits?: { maxUploadsPerDay?: number };
    schedule?: { maxPerDay?: number };
  };

  return typedClient.limits?.maxUploadsPerDay ?? typedClient.schedule?.maxPerDay ?? 1;
}

function shouldFail(failRate: number): boolean {
  return Math.random() < failRate;
}

export class StubYouTubeUploader implements Uploader {
  private readonly dataDir: string;

  constructor(options: StubYouTubeUploaderOptions = {}) {
    this.dataDir = options.dataDir ?? 'data';
  }

  async uploadShort(input: Parameters<Uploader['uploadShort']>[0]): Promise<UploadResult> {
    const timestamp = new Date();
    const dateISO = timestamp.toISOString().slice(0, 10);
    const maxUploadsPerDay = getMaxUploadsPerDay(input.client);
    const dailyCount = getDailyCount(this.dataDir, input.client.id, dateISO);

    if (dailyCount >= maxUploadsPerDay) {
      throw new Error(
        `Daily upload quota exceeded for client ${input.client.id} (${dailyCount}/${maxUploadsPerDay})`
      );
    }

    const uploadsDir = path.join(this.dataDir, 'clients', input.client.id, 'uploads');

    await mkdir(uploadsDir, { recursive: true });

    const effectiveOpts = {
      privacyStatus: input.opts?.privacyStatus ?? 'private',
      madeForKids: input.opts?.madeForKids ?? false
    };

    const payload = {
      clientId: input.client.id,
      title: input.script.titleSuggestions[0] ?? 'Untitled Short',
      description: input.script.description,
      tags: input.script.tags,
      videoPath: input.video.path,
      opts: effectiveOpts
    };

    const filenameSafeTimestamp = timestamp.toISOString().replace(/[:.]/g, '-');
    const uploadLogPath = path.join(uploadsDir, `uploaded_${filenameSafeTimestamp}.json`);

    await writeFile(uploadLogPath, JSON.stringify(payload, null, 2), 'utf8');
    const nextDailyCount = incrementDailyCount(this.dataDir, input.client.id, dateISO);

    if (shouldFail(env.STUB_FAIL_RATE)) {
      throw new Error(
        `Simulated uploader failure for client ${input.client.id} at fail rate ${env.STUB_FAIL_RATE}`
      );
    }

    const youtubeVideoId = `stub_${crypto.randomBytes(8).toString('hex')}`;

    return {
      youtubeVideoId,
      url: `https://youtube.com/watch?v=${youtubeVideoId}`,
      provider: 'stub',
      meta: {
        uploadLogPath,
        dailyUploadCount: nextDailyCount,
        maxUploadsPerDay
      }
    };
  }
}
