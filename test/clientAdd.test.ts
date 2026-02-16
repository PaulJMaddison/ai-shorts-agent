import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import { addClientToFile, createStarterTopicBank, createStubClientProfile } from '../src/cli/clientAdd.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.map(async (dir) => {
      await rm(dir, { recursive: true, force: true });
    })
  );
  tempDirs.length = 0;
});

describe('createStarterTopicBank', () => {
  test('returns 30 niche-prefixed topics for finance niches', () => {
    const topics = createStarterTopicBank('Personal Finance');

    expect(topics).toHaveLength(30);
    expect(topics.every((topic) => topic.startsWith('Personal Finance: '))).toBe(true);
  });

  test('falls back to tech topic bank for unknown niches', () => {
    const topics = createStarterTopicBank('wellness');

    expect(topics).toHaveLength(30);
    expect(topics[0]).toContain('AI productivity tools for developers');
  });
});

describe('createStubClientProfile', () => {
  test('builds a stub profile with default schedule and educational tone', () => {
    const client = createStubClientProfile({
      id: 'client_1',
      name: 'Client One',
      niche: 'devops'
    });

    expect(client.voice.provider).toBe('stub');
    expect(client.avatar.provider).toBe('stub');
    expect(client.youtube.provider).toBe('stub');
    expect(client.schedule).toEqual({
      runDailyAt: '0 9 * * *',
      timezone: 'UTC',
      maxPerDay: 1
    });
    expect(client.tone).toBe('educational');
    expect(client.topicBank).toHaveLength(30);
  });
});

describe('addClientToFile', () => {
  test('appends a new client and writes pretty formatted json', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'client-add-'));
    tempDirs.push(tempDir);

    const clientsFile = path.join(tempDir, 'clients.json');

    await writeFile(clientsFile, '[{"id":"existing","name":"Existing","niche":"tech","topics":["a"],"voice":{"provider":"stub","voiceId":"v"},"avatar":{"provider":"stub","avatarId":"a"},"youtube":{"provider":"stub","channelId":"y"}}]\n', 'utf8');

    const added = await addClientToFile(clientsFile, {
      id: 'new_client',
      name: 'New Client',
      niche: 'finance',
      tone: 'professional'
    });

    expect(added.id).toBe('new_client');
    expect(added.tone).toBe('professional');

    const saved = await readFile(clientsFile, 'utf8');
    const parsed = JSON.parse(saved) as Array<{ id: string; topicBank?: string[]; schedule?: { maxPerDay?: number } }>;

    expect(saved.endsWith('\n')).toBe(true);
    expect(parsed).toHaveLength(2);
    expect(parsed[1]?.id).toBe('new_client');
    expect(parsed[1]?.topicBank).toHaveLength(30);
    expect(parsed[1]?.schedule?.maxPerDay).toBe(1);
  });

  test('throws when id already exists', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'client-add-dup-'));
    tempDirs.push(tempDir);

    const clientsFile = path.join(tempDir, 'clients.json');

    await writeFile(clientsFile, '[{"id":"duplicate"}]\n', 'utf8');

    await expect(
      addClientToFile(clientsFile, {
        id: 'duplicate',
        name: 'Duplicate',
        niche: 'tech'
      })
    ).rejects.toThrow('already exists');
  });
});
