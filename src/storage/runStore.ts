import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type RunLogRecord = {
  runId: string;
  timestamp: string;
} & Record<string, unknown>;

function getRunsDir(dataDir: string, clientId: string): string {
  return path.resolve(process.cwd(), dataDir, 'clients', clientId, 'runs');
}

function getRunLogPath(dataDir: string, clientId: string, runId: string): string {
  return path.join(getRunsDir(dataDir, clientId), `run_${runId}.json`);
}

function sortByTimestampDesc(a: RunLogRecord, b: RunLogRecord): number {
  return Date.parse(b.timestamp) - Date.parse(a.timestamp);
}

export async function writeRunLog(
  dataDir: string,
  clientId: string,
  run: RunLogRecord
): Promise<string> {
  const runLogPath = getRunLogPath(dataDir, clientId, run.runId);

  await mkdir(path.dirname(runLogPath), { recursive: true });
  await writeFile(runLogPath, `${JSON.stringify(run, null, 2)}\n`, 'utf8');

  return runLogPath;
}

export async function listRuns(
  dataDir: string,
  clientId: string,
  limit = 20
): Promise<RunLogRecord[]> {
  const runsDir = getRunsDir(dataDir, clientId);

  try {
    const entries = await readdir(runsDir, { withFileTypes: true });

    const runFiles = entries
      .filter((entry) => entry.isFile() && entry.name.startsWith('run_') && entry.name.endsWith('.json'))
      .map((entry) => path.join(runsDir, entry.name));

    const runs = await Promise.all(
      runFiles.map(async (runFile) => JSON.parse(await readFile(runFile, 'utf8')) as RunLogRecord)
    );

    return runs.sort(sortByTimestampDesc).slice(0, limit);
  } catch (error) {
    const isMissingFile =
      error instanceof Error && 'code' in error && (error as { code?: string }).code === 'ENOENT';

    if (isMissingFile) {
      return [];
    }

    throw error;
  }
}
