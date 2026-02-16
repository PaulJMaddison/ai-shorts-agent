import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const MAX_METRICS = 2000;

type MetricEventBase = {
  event: string;
  timestamp: string;
};

export type MetricEvent = MetricEventBase & Record<string, unknown>;

function getMetricsPath(dataDir: string): string {
  return path.resolve(process.cwd(), dataDir, 'metrics.json');
}

async function readAllMetrics(dataDir: string): Promise<MetricEvent[]> {
  const metricsPath = getMetricsPath(dataDir);

  try {
    const raw = await readFile(metricsPath, 'utf8');

    return JSON.parse(raw) as MetricEvent[];
  } catch (error) {
    const isMissingFile =
      error instanceof Error && 'code' in error && (error as { code?: string }).code === 'ENOENT';

    if (isMissingFile) {
      return [];
    }

    throw error;
  }
}

export async function appendMetric(dataDir: string, event: MetricEvent): Promise<void> {
  const metricsPath = getMetricsPath(dataDir);
  const existing = await readAllMetrics(dataDir);
  const next = [...existing, event].slice(-MAX_METRICS);

  await mkdir(path.dirname(metricsPath), { recursive: true });
  await writeFile(metricsPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
}

export async function readMetrics(dataDir: string, limit = 200): Promise<MetricEvent[]> {
  const existing = await readAllMetrics(dataDir);

  return existing.slice(-limit).reverse();
}
