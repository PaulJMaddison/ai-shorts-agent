import type { ClientProfile } from '../core/types.js';

type TopicSelectionMode = 'rotate' | 'random';
type TopicSelectorClient = ClientProfile & {
  topicSelectionMode?: TopicSelectionMode;
};

const DEFAULT_TECH_TOPICS = [
  'AI tools for everyday productivity',
  'Cybersecurity habits everyone should know',
  'Beginner-friendly cloud computing concepts',
  'How APIs power modern apps',
  'Top software development trends this year'
];

const DEFAULT_GENERAL_TOPICS = [
  '5 practical habits for better focus',
  'Simple ways to improve daily routines',
  'Common mistakes beginners should avoid',
  'How to stay consistent with long-term goals',
  'Quick tips to learn new skills faster'
];

function getDayOfYear(date: Date): number {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1);
  const currentDate = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

  return Math.floor((currentDate - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
}

function formatDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function stringToSeed(value: string): number {
  let hash = 2166136261;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seededRandom(seed: number): number {
  const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0;

  return next / 0x100000000;
}

function getFallbackTopics(niche: string): string[] {
  if (niche.toLowerCase().includes('tech')) {
    return DEFAULT_TECH_TOPICS;
  }

  return DEFAULT_GENERAL_TOPICS;
}

function getTopicSelectionMode(client: TopicSelectorClient): TopicSelectionMode {
  if (client.topicSelectionMode === 'random') {
    return 'random';
  }

  return 'rotate';
}

export function selectTopic(client: ClientProfile, date: Date): string {
  const selectorClient = client as TopicSelectorClient;
  const topics = selectorClient.topicBank.length > 0 ? selectorClient.topicBank : getFallbackTopics(selectorClient.niche);

  if (topics.length === 0) {
    return 'Daily insights';
  }

  if (getTopicSelectionMode(selectorClient) === 'rotate') {
    const dayOfYear = getDayOfYear(date);
    const index = dayOfYear % topics.length;

    return topics[index];
  }

  const seedInput = `${selectorClient.id}:${formatDateKey(date)}`;
  const seed = stringToSeed(seedInput);
  const index = Math.floor(seededRandom(seed) * topics.length);

  return topics[index];
}
