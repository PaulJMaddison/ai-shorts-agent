import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { env } from '../../config/env.js';
import type { AvatarRenderer } from '../../core/interfaces.js';
import type { AudioAsset, ClientProfile, RenderJob, Script, VideoAsset } from '../../core/types.js';
import { jobStore } from '../../storage/index.js';
import { getVideoDir } from '../../utils/paths.js';

const DEFAULT_COMPLETION_DELAY_MS = 5_000;

function shouldFail(failRate: number): boolean {
  return Math.random() < failRate;
}

export class StubAvatarRenderer implements AvatarRenderer {
  private readonly completionDelayMs: number;
  private readonly failRate: number;

  constructor() {
    this.completionDelayMs = env.STUB_RENDER_MS ?? DEFAULT_COMPLETION_DELAY_MS;
    this.failRate = env.STUB_FAIL_RATE;
  }
  async render(input: {
    client: ClientProfile;
    audio: AudioAsset;
    script: Script;
  }): Promise<RenderJob> {
    const now = new Date().toISOString();
    const job: RenderJob = {
      id: randomUUID(),
      clientId: input.client.id,
      provider: 'stub',
      status: 'processing',
      createdAt: now,
      updatedAt: now
    };

    await jobStore.save(job);

    return job;
  }

  async getStatus(input: { client: ClientProfile; jobId: string }): Promise<RenderJob> {
    const job = await this.getOwnedJob(input.client.id, input.jobId);

    if (job.status !== 'processing') {
      return job;
    }

    if (shouldFail(this.failRate)) {
      const failedJob: RenderJob = {
        ...job,
        status: 'failed',
        updatedAt: new Date().toISOString(),
        error: `Simulated renderer failure at fail rate ${this.failRate}`
      };

      return jobStore.update(failedJob);
    }

    if (Date.now() - Date.parse(job.createdAt) >= this.completionDelayMs) {
      const completedJob: RenderJob = {
        ...job,
        status: 'completed',
        updatedAt: new Date().toISOString()
      };

      return jobStore.update(completedJob);
    }

    return job;
  }

  async download(input: { client: ClientProfile; jobId: string }): Promise<VideoAsset> {
    const job = await this.getOwnedJob(input.client.id, input.jobId);
    const videoDir = getVideoDir(path.resolve(process.cwd(), env.DATA_DIR), input.client.id);

    await mkdir(videoDir, { recursive: true });

    const filePath = path.join(videoDir, `video_${job.id}.mp4`);

    await writeFile(filePath, 'stub video placeholder', 'utf8');

    return {
      path: filePath,
      mimeType: 'video/mp4',
      width: 1080,
      height: 1920,
      durationSec: 55
    };
  }

  private async getOwnedJob(clientId: string, jobId: string): Promise<RenderJob> {
    const job = await jobStore.get(jobId);

    if (!job || job.clientId !== clientId) {
      throw new Error(`Render job not found for client ${clientId}: ${jobId}`);
    }

    return job;
  }
}
