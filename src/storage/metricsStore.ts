import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const MAX_METRICS = 2000;
const metricsCache = new Map<string, MetricEvent[]>();

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

  const cached = metricsCache.get(metricsPath);
  if (cached) {
    return cached;
  }

  try {
    const raw = await readFile(metricsPath, 'utf8');
    const parsed = JSON.parse(raw) as MetricEvent[];
    metricsCache.set(metricsPath, parsed);

    return parsed;
  } catch (error) {
    const isMissingFile =
      error instanceof Error && 'code' in error && (error as { code?: string }).code === 'ENOENT';

    if (isMissingFile) {
      metricsCache.set(metricsPath, []);
      return [];
    }

    throw error;
  }
}

export async function appendMetric(dataDir: string, event: MetricEvent): Promise<void> {
  const metricsPath = getMetricsPath(dataDir);
  const existing = await readAllMetrics(dataDir);
  const next = [...existing, event].slice(-MAX_METRICS);
  metricsCache.set(metricsPath, next);

  await mkdir(path.dirname(metricsPath), { recursive: true });
  await writeFile(metricsPath, `${JSON.stringify(next)}\n`, 'utf8');
}

export async function readMetrics(dataDir: string, limit = 200): Promise<MetricEvent[]> {
  const existing = await readAllMetrics(dataDir);

  return existing.slice(-limit).reverse();
}
