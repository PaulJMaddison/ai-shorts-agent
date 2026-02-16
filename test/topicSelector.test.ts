import { describe, expect, test } from 'vitest';

import type { ClientProfile } from '../src/core/types.js';
import { dayOfYear, seededPick, selectTopic } from '../src/workflows/topicSelector.js';

type TestClientProfile = ClientProfile & {
  topicSelectionMode?: 'rotate' | 'random' | 'calendar';
};

function createClient(overrides: Partial<TestClientProfile> = {}): TestClientProfile {
  return {
    id: 'client_1',
    displayName: 'Client One',
    niche: 'tech',
    language: 'en-US',
    tone: 'casual',
    topicBank: ['Topic A', 'Topic B', 'Topic C'],
    ...overrides
  };
}

describe('topic selector helpers', () => {
  test('dayOfYear uses UTC date boundaries', () => {
    expect(dayOfYear(new Date('2024-01-01T00:00:00Z'))).toBe(1);
    expect(dayOfYear(new Date('2024-02-29T12:00:00Z'))).toBe(60);
  });

  test('seededPick is deterministic for same seed and size', () => {
    const first = seededPick('client_1:2024-05-20', 7);
    const second = seededPick('client_1:2024-05-20', 7);

    expect(first).toBe(second);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(7);
  });
});

describe('selectTopic', () => {
  test('rotate strategy picks by day-of-year modulo topic bank length', () => {
    const client = createClient({ topicSelectionMode: 'rotate' });
    const date = new Date('2024-01-02T12:00:00Z'); // day 2, 2 % 3 => index 2

    expect(selectTopic(client, date)).toBe('Topic C');
  });

  test('random strategy uses deterministic selection from client id + date key', () => {
    const client = createClient({ topicSelectionMode: 'random' });
    const date = new Date('2024-05-20T03:45:00Z');

    const firstPick = selectTopic(client, date);
    const secondPick = selectTopic(client, date);

    expect(firstPick).toBe(secondPick);
  });

  test('calendar strategy prefers exact YYYY-MM-DD entries', () => {
    const client = createClient({
      topicSelectionMode: 'calendar',
      topicBank: ['Topic A', '2024-05-20|Launch day breakdown', 'Topic C']
    });

    expect(selectTopic(client, new Date('2024-05-20T23:59:00Z'))).toBe('Launch day breakdown');
  });

  test('calendar strategy falls back to rotate using plain-topic subset', () => {
    const client = createClient({
      topicSelectionMode: 'calendar',
      topicBank: ['2024-05-20|Launch day breakdown', 'Plain 1', 'Plain 2', '2024-06-01|Post launch']
    });

    const date = new Date('2024-01-03T00:00:00Z'); // day 3, 3 % 2 => index 1

    expect(selectTopic(client, date)).toBe('Plain 2');
  });

  test('falls back to devops defaults when topic bank is empty and niche includes devops', () => {
    const client = createClient({ niche: 'Platform DevOps', topicBank: [] });

    expect(selectTopic(client, new Date('2024-01-01T00:00:00Z'))).toBe('Blue-green deployments without downtime');
  });

  test('falls back to finance defaults when topic bank is empty and niche includes finance', () => {
    const client = createClient({ niche: 'Personal Finance', topicBank: [] });

    expect(selectTopic(client, new Date('2024-01-01T00:00:00Z'))).toBe('Budgeting with a zero-based framework');
  });

  test('falls back to tech defaults when topic bank is empty and niche does not match', () => {
    const client = createClient({ niche: 'wellness', topicBank: [] });

    expect(selectTopic(client, new Date('2024-01-01T00:00:00Z'))).toBe('How edge computing changes mobile apps');
  });
});
