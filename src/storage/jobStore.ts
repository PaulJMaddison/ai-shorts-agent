import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { env } from '../config/env.js';
import type { RenderJob } from '../core/types.js';

const JOBS_FILE_PATH = path.resolve(process.cwd(), env.DATA_DIR, 'jobs.json');

type ListRecentInput = {
  limit: number;
  clientId?: string;
};

const jobsById = new Map<string, RenderJob>();
const jobsByClientId = new Map<string, Set<string>>();

let isLoaded = false;

function sortByMostRecent(a: RenderJob, b: RenderJob): number {
  return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
}

function upsertClientIndex(job: RenderJob): void {
  const existingForClient = jobsByClientId.get(job.clientId);

  if (existingForClient) {
    existingForClient.add(job.id);
    return;
  }

  jobsByClientId.set(job.clientId, new Set([job.id]));
}

function removeClientIndex(job: RenderJob): void {
  const existingForClient = jobsByClientId.get(job.clientId);

  if (!existingForClient) {
    return;
  }

  existingForClient.delete(job.id);

  if (existingForClient.size === 0) {
    jobsByClientId.delete(job.clientId);
  }
}

async function persistJobs(): Promise<void> {
  await mkdir(path.dirname(JOBS_FILE_PATH), { recursive: true });

  const serializedJobs = Object.fromEntries(jobsById.entries());

  await writeFile(JOBS_FILE_PATH, JSON.stringify(serializedJobs, null, 2), 'utf8');
}

async function ensureLoaded(): Promise<void> {
  if (isLoaded) {
    return;
  }

  try {
    const fileContent = await readFile(JOBS_FILE_PATH, 'utf8');
    const parsedJobs = JSON.parse(fileContent) as Record<string, RenderJob>;

    for (const [jobId, job] of Object.entries(parsedJobs)) {
      jobsById.set(jobId, job);
      upsertClientIndex(job);
    }
  } catch (error) {
    const isMissingFile =
      error instanceof Error && 'code' in error && (error as { code?: string }).code === 'ENOENT';

    if (!isMissingFile) {
      throw error;
    }
  }

  isLoaded = true;
}

export async function save(job: RenderJob): Promise<RenderJob> {
  await ensureLoaded();

  if (jobsById.has(job.id)) {
    throw new Error(`Render job already exists: ${job.id}`);
  }

  jobsById.set(job.id, job);
  upsertClientIndex(job);

  await persistJobs();

  return job;
}

export async function update(job: RenderJob): Promise<RenderJob> {
  await ensureLoaded();

  const existingJob = jobsById.get(job.id);

  if (!existingJob) {
    throw new Error(`Render job not found: ${job.id}`);
  }

  if (existingJob.clientId !== job.clientId) {
    removeClientIndex(existingJob);
    upsertClientIndex(job);
  }

  jobsById.set(job.id, job);

  await persistJobs();

  return job;
}

export async function get(jobId: string): Promise<RenderJob | undefined> {
  await ensureLoaded();

  return jobsById.get(jobId);
}

export async function listRecent({ limit, clientId }: ListRecentInput): Promise<RenderJob[]> {
  await ensureLoaded();

  if (clientId) {
    return listByClient(clientId, limit);
  }

  return [...jobsById.values()].sort(sortByMostRecent).slice(0, limit);
}

export async function listByClient(clientId: string, limit: number): Promise<RenderJob[]> {
  await ensureLoaded();

  const jobIdsForClient = jobsByClientId.get(clientId);

  if (!jobIdsForClient) {
    return [];
  }

  const jobs = [...jobIdsForClient]
    .map((jobId) => jobsById.get(jobId))
    .filter((job): job is RenderJob => job !== undefined)
    .sort(sortByMostRecent)
    .slice(0, limit);

  return jobs;
}
