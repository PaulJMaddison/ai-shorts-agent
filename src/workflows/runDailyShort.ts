import { setTimeout as delay } from 'node:timers/promises';

import type { Providers } from '../core/interfaces.js';
import type { AudioAsset, ClientProfile, RenderJob, Script, UploadResult, VideoAsset } from '../core/types.js';
import { env } from '../config/env.js';
import { appendMetric } from '../storage/metricsStore.js';
import { writeRunLog } from '../storage/runStore.js';
import { retry } from '../utils/retry.js';
import { logInfo } from '../utils/logger.js';
import { fixupScript, validateScript } from './qualityGates.js';

type PrivacyStatus = 'public' | 'unlisted' | 'private';

type SchedulerConfig = {
  timezone?: string;
};

type YouTubePublishingConfig = {
  defaultPrivacyStatus?: PrivacyStatus;
  madeForKids?: boolean;
};

export type RunDailyShortClient = ClientProfile & {
  schedule?: SchedulerConfig;
  youtube?: YouTubePublishingConfig;
  topics?: string[];
};

export type JobStoreLike = Partial<{
  save: (job: RenderJob) => Promise<RenderJob>;
  update: (job: RenderJob) => Promise<RenderJob>;
}>;

export type DailyRunResult = {
  status: 'completed' | 'failed';
  clientId: string;
  topic: string;
  startedAt: string;
  finishedAt: string;
  script?: Script;
  audio?: AudioAsset;
  job?: RenderJob;
  video?: VideoAsset;
  upload?: UploadResult;
  error?: {
    message: string;
    stack?: string;
  };
  runLogPath: string;
};

export async function runDailyShort(input: {
  client: RunDailyShortClient;
  providers: Providers;
  jobStore: JobStoreLike;
  topicOverride?: string;
  privacyOverride?: PrivacyStatus;
  dataDir?: string;
}): Promise<DailyRunResult> {
  const { client, providers, jobStore, topicOverride, privacyOverride } = input;
  const dataDir = input.dataDir ?? env.DATA_DIR;

  const startedAt = new Date().toISOString();
  const runId = startedAt.replace(/:/g, '-').replace(/\..+$/, '');
  const timezone = client.schedule?.timezone ?? 'UTC';
  const todayInTimezone = getTodayInTimezone(timezone);

  const runContext: Omit<DailyRunResult, 'status' | 'finishedAt' | 'runLogPath'> = {
    clientId: client.id,
    topic: topicOverride ?? selectTopic(client, todayInTimezone),
    startedAt
  };

  logInfo(`runDailyShort started for client=${client.id} startedAt=${startedAt}`);

  await appendMetric(dataDir, {
    event: 'run_started',
    timestamp: startedAt,
    clientId: client.id,
    runId,
    topic: runContext.topic
  });

  try {
    logInfo(`Selecting topic for client=${client.id} timezone=${timezone}`);

    logInfo(`Writing script for client=${client.id} topic="${runContext.topic}"`);
    runContext.script = await providers.writer.writeScript({
      client,
      topic: runContext.topic
    });

    const scriptValidation = validateScript(runContext.script);
    if (!scriptValidation.ok) {
      runContext.script = fixupScript(runContext.script, scriptValidation.issues);
    }

    logInfo(`Synthesizing voice for client=${client.id}`);
    runContext.audio = await retry(
      () =>
        providers.voice.synthesize({
          client,
          script: runContext.script as Script
        }),
      {
        tries: 3,
        minDelayMs: 250,
        maxDelayMs: 2_000
      }
    );

    logInfo(`Submitting render job for client=${client.id}`);
    runContext.job = await retry(
      () =>
        providers.renderer.render({
          client,
          audio: runContext.audio as AudioAsset,
          script: runContext.script as Script
        }),
      {
        tries: 2,
        minDelayMs: 500,
        maxDelayMs: 2_000
      }
    });

    if (jobStore.save) {
      await jobStore.save(runContext.job);
    }

    logInfo(`Polling render job status jobId=${runContext.job.id}`);
    runContext.job = await pollForCompletedJob({
      providers,
      client,
      jobId: runContext.job.id,
      jobStore
    });

    logInfo(`Downloading rendered video jobId=${runContext.job.id}`);
    runContext.video = await providers.renderer.download({
      client,
      jobId: runContext.job.id
    });

    logInfo(`Uploading short for client=${client.id}`);

    await appendMetric(dataDir, {
      event: 'upload_attempted',
      timestamp: new Date().toISOString(),
      clientId: client.id,
      runId,
      topic: runContext.topic
    });

    runContext.upload = await retry(
      () =>
        providers.uploader.uploadShort({
          client,
          video: runContext.video as VideoAsset,
          script: runContext.script as Script,
          opts: {
            privacyStatus: privacyOverride ?? client.youtube?.defaultPrivacyStatus ?? 'private',
            madeForKids: client.youtube?.madeForKids ?? false
          }
        }),
      {
        tries: 2,
        minDelayMs: 500,
        maxDelayMs: 2_000,
        shouldRetry: (error) => !isQuotaExceededError(error)
      }
    );

    const finishedAt = new Date().toISOString();

    const result: DailyRunResult = {
      ...runContext,
      status: 'completed',
      finishedAt,
      runLogPath: ''
    };

    const durationMs = Date.parse(finishedAt) - Date.parse(startedAt);

    result.runLogPath = await writeRunLog(dataDir, client.id, {
      ...result,
      runId,
      timestamp: finishedAt,
      durationMs
    });

    await appendMetric(dataDir, {
      event: 'run_completed',
      timestamp: finishedAt,
      clientId: client.id,
      runId,
      topic: runContext.topic,
      durationMs
    });

    logInfo(`runDailyShort completed for client=${client.id} finishedAt=${finishedAt}`);

    return result;
  } catch (error) {
    const finishedAt = new Date().toISOString();

    const failedResult: DailyRunResult = {
      ...runContext,
      status: 'failed',
      finishedAt,
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      runLogPath: ''
    };

    const errorMessage = failedResult.error?.message ?? 'Unknown error';
    const durationMs = Date.parse(finishedAt) - Date.parse(startedAt);

    failedResult.runLogPath = await writeRunLog(dataDir, client.id, {
      ...failedResult,
      runId,
      timestamp: finishedAt,
      durationMs
    });

    await appendMetric(dataDir, {
      event: 'run_failed',
      timestamp: finishedAt,
      clientId: client.id,
      runId,
      topic: runContext.topic,
      durationMs,
      error: errorMessage
    });

    logInfo(
      `runDailyShort failed for client=${client.id} finishedAt=${finishedAt} error="${errorMessage}"`
    );

    throw new Error(
      `Daily short run failed for client ${client.id}. Run log: ${failedResult.runLogPath}`,
      { cause: error }
    );
  }
}

async function pollForCompletedJob(input: {
  providers: Providers;
  client: RunDailyShortClient;
  jobId: string;
  jobStore: JobStoreLike;
}): Promise<RenderJob> {
  const timeoutMs = Math.max(120_000, env.STUB_RENDER_MS * 3);
  const pollIntervalMs = 1_000;
  const startedAtMs = Date.now();

  while (Date.now() - startedAtMs <= timeoutMs) {
    const job = await input.providers.renderer.getStatus({
      client: input.client,
      jobId: input.jobId
    });

    if (input.jobStore.update) {
      await input.jobStore.update(job);
    }

    if (job.status === 'completed') {
      return job;
    }

    if (job.status === 'failed') {
      throw new Error(`Render job failed: ${job.id}${job.error ? ` (${job.error})` : ''}`);
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(`Render job timed out after ${timeoutMs / 1000}s: ${input.jobId}`);
}

function selectTopic(client: RunDailyShortClient, today: Date): string {
  const topicCandidates = [
    ...(Array.isArray(client.topicBank) ? client.topicBank : []),
    ...(Array.isArray(client.topics) ? client.topics : [])
  ].filter((topic): topic is string => topic.trim().length > 0);

  if (topicCandidates.length === 0) {
    throw new Error(`No topics configured for client ${client.id}`);
  }

  const dayOfYear = getDayOfYear(today);
  const topicIndex = dayOfYear % topicCandidates.length;

  return topicCandidates[topicIndex];
}

function getTodayInTimezone(timezone: string): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const parts = formatter.formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    throw new Error(`Unable to compute date in timezone: ${timezone}`);
  }

  return new Date(Date.UTC(year, month - 1, day));
}

function getDayOfYear(date: Date): number {
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const currentDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

  return Math.floor((currentDay - yearStart) / 86_400_000) + 1;
}

async function sleep(durationMs: number): Promise<void> {
  await delay(durationMs);
}

function isQuotaExceededError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /quota exceeded/i.test(error.message);
}
