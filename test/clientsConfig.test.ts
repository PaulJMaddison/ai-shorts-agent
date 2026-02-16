import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import { ensureDefaultClientsFile } from '../src/config/clients.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.map(async (dir) => {
      await rm(dir, { recursive: true, force: true });
    })
  );
  tempDirs.length = 0;
});

describe('ensureDefaultClientsFile', () => {
  test('copies from matching .example file when clients file is missing', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'clients-config-'));
    tempDirs.push(tempDir);

    const clientsFile = path.join(tempDir, 'clients.json');
    const exampleFile = path.join(tempDir, 'clients.example.json');
    const exampleContent = '[{"id":"sample"}]\n';

    await writeFile(exampleFile, exampleContent, 'utf8');

    await ensureDefaultClientsFile(clientsFile);

    const copiedContent = await readFile(clientsFile, 'utf8');
    expect(copiedContent).toBe(exampleContent);
  });
});
