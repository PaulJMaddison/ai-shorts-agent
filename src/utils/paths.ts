import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

function ensureDir(dirPath: string): string {
  mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

export function ensureDataDirs(dataDir: string): void {
  ensureDir(dataDir);
  ensureDir(join(dataDir, 'clients'));
  ensureDir(join(dataDir, 'webhooks'));
  ensureDir(join(dataDir, 'runs'));
}

export function getClientDir(dataDir: string, clientId: string): string {
  ensureDataDirs(dataDir);
  return ensureDir(join(dataDir, 'clients', clientId));
}

export function getAudioDir(dataDir: string, clientId: string): string {
  return ensureDir(join(getClientDir(dataDir, clientId), 'audio'));
}

export function getVideoDir(dataDir: string, clientId: string): string {
  return ensureDir(join(getClientDir(dataDir, clientId), 'video'));
}

export function getWebhookDir(dataDir: string): string {
  ensureDataDirs(dataDir);
  return ensureDir(join(dataDir, 'webhooks'));
}

export function getRunsDir(dataDir: string): string {
  ensureDataDirs(dataDir);
  return ensureDir(join(dataDir, 'runs'));
}

export function getJobsFile(dataDir: string): string {
  ensureDataDirs(dataDir);
  return join(dataDir, 'jobs.json');
}
