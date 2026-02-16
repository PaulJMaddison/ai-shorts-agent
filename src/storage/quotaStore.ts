import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

interface QuotaRecord {
  date: string;
  count: number;
}

function getQuotaFilePath(dataDir: string, clientId: string, dateISO: string): string {
  const uploadsDir = path.join(dataDir, 'clients', clientId, 'uploads');
  mkdirSync(uploadsDir, { recursive: true });
  return path.join(uploadsDir, `quota_${dateISO}.json`);
}

function readQuotaFile(filePath: string): QuotaRecord | null {
  try {
    const raw = readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<QuotaRecord>;

    if (typeof parsed.date !== 'string' || typeof parsed.count !== 'number' || parsed.count < 0) {
      return null;
    }

    return {
      date: parsed.date,
      count: parsed.count
    };
  } catch {
    return null;
  }
}

export function getDailyCount(dataDir: string, clientId: string, dateISO: string): number {
  const filePath = getQuotaFilePath(dataDir, clientId, dateISO);
  const record = readQuotaFile(filePath);

  if (!record || record.date !== dateISO) {
    return 0;
  }

  return record.count;
}

export function incrementDailyCount(dataDir: string, clientId: string, dateISO: string): number {
  const filePath = getQuotaFilePath(dataDir, clientId, dateISO);
  const current = getDailyCount(dataDir, clientId, dateISO);
  const next = current + 1;

  writeFileSync(
    filePath,
    `${
      JSON.stringify(
        {
          date: dateISO,
          count: next
        },
        null,
        2
      )
    }\n`,
    'utf8'
  );

  return next;
}
