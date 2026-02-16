import { describe, expect, test } from 'vitest';

import type { ClientProfile } from '../src/core/types.js';
import { selectTopic } from '../src/workflows/topicSelector.js';

type TestClientProfile = ClientProfile & {
  topicSelectionMode?: 'rotate' | 'random';
};

function createClient(overrides: Partial<TestClientProfile> = {}): TestClientProfile {
  return {
    id: 'client_1',
    displayName: 'Client One',
    niche: 'general',
    language: 'en-US',
    tone: 'casual',
    topicBank: ['Topic A', 'Topic B', 'Topic C'],
    ...overrides
  };
}

describe('selectTopic', () => {
  test('rotates by day-of-year modulo topic bank length', () => {
    const client = createClient({ topicSelectionMode: 'rotate' });
    const date = new Date('2024-01-02T12:00:00Z'); // day 2, 2 % 3 => index 2

    expect(selectTopic(client, date)).toBe('Topic C');
  });

  test('uses deterministic random selection from client id and YYYY-MM-DD', () => {
    const client = createClient({ topicSelectionMode: 'random' });
    const date = new Date('2024-05-20T03:45:00Z');

    const firstPick = selectTopic(client, date);
    const secondPick = selectTopic(client, date);

    expect(firstPick).toBe(secondPick);
  });

  test('falls back to tech defaults when topic bank is empty and niche includes tech', () => {
    const client = createClient({ niche: 'B2B Tech', topicBank: [] });

    expect(selectTopic(client, new Date('2024-07-01T00:00:00Z'))).toBe('How APIs power modern apps');
  });

  test('falls back to general defaults when topic bank is empty and niche is not tech', () => {
    const client = createClient({ niche: 'fitness', topicBank: [] });

    expect(selectTopic(client, new Date('2024-01-01T00:00:00Z'))).toBe('Simple ways to improve daily routines');
  });
});
