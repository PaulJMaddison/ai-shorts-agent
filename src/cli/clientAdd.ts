import { readFile, writeFile } from 'node:fs/promises';

import { ensureDefaultClientsFile, type ClientProfile } from '../config/clients.js';

export type ScriptTone = 'educational' | 'casual' | 'professional';

type ClientAddInput = {
  id: string;
  name: string;
  niche: string;
  tone?: ScriptTone;
};

type PersistedClientProfile = ClientProfile & {
  tone: ScriptTone;
  topicBank: string[];
  schedule: {
    runDailyAt: string;
    timezone: string;
    maxPerDay: number;
  };
};

const TOPIC_LIBRARY = {
  tech: [
    'AI productivity tools for developers',
    'How APIs power modern apps',
    'Cloud cost optimization basics',
    'Zero-trust security explained',
    'What is edge computing?',
    'Git workflows that scale teams',
    'Microservices vs monoliths',
    'Feature flags for safe releases',
    'How to choose a backend framework',
    'Prompt engineering for builders',
    'Observability essentials for apps',
    'Database indexing made simple',
    'When to use serverless',
    'CI pipelines in plain English',
    'Caching strategies for speed',
    'How CDNs reduce latency',
    'Containerization for beginners',
    'A/B testing for product teams',
    'Roadmapping technical debt',
    'Web performance core metrics',
    'Design systems for fast UI',
    'Authentication vs authorization',
    'API versioning best practices',
    'Choosing SQL or NoSQL',
    'Build vs buy tech decisions',
    'SRE habits for reliability',
    'Intro to event-driven architecture',
    'Data privacy for startups',
    'Release notes users actually read',
    'How to ship MVPs faster'
  ],
  devops: [
    'Kubernetes in simple terms',
    'CI/CD pipeline essentials',
    'Infrastructure as code 101',
    'Monitoring vs observability',
    'Incident response playbook basics',
    'Blue-green deployment explained',
    'Canary releases without stress',
    'Secrets management best practices',
    'GitOps workflow intro',
    'Disaster recovery planning',
    'Log aggregation for teams',
    'SLOs and error budgets',
    'Docker networking fundamentals',
    'How to reduce cloud spend in ops',
    'Automating rollback strategies',
    'Postmortems that improve systems',
    'Managing multi-environment configs',
    'Platform engineering fundamentals',
    'Load testing quickstart',
    'Service mesh: when it helps',
    'Scaling background workers',
    'Immutable infrastructure concept',
    'Linux troubleshooting checklist',
    'On-call handover best practices',
    'Policy as code introduction',
    'Artifact repositories explained',
    'Release automation guardrails',
    'Build caching in CI systems',
    'Container image security scanning',
    'Change management for fast teams'
  ],
  finance: [
    'Budgeting system that actually sticks',
    'Emergency fund target by lifestyle',
    'How compound interest really works',
    'Index funds for beginners',
    'Debt snowball vs debt avalanche',
    'How credit scores are calculated',
    'Monthly money review routine',
    'Sinking funds made simple',
    'Retirement account basics',
    'Dollar-cost averaging explained',
    'Avoiding common investing mistakes',
    'How to read expense ratios',
    'Tax-efficient saving habits',
    'Paycheck allocation framework',
    'Financial goals you can measure',
    'Building a first investment plan',
    'Cash flow management for beginners',
    'Common budgeting app mistakes',
    'Insurance coverage essentials',
    'How to start side-income tracking',
    'Risk tolerance in plain language',
    'Buying vs renting decision math',
    'Setting up automatic savings',
    'Understanding inflation impact',
    'Personal finance myths to ignore',
    'Long-term wealth building habits',
    'How to compare loan offers',
    'Protecting yourself from fraud',
    'Beginner portfolio diversification',
    'Financial check-in questions monthly'
  ]
} as const;

function pickTopicSet(niche: string): readonly string[] {
  const normalized = niche.trim().toLowerCase();

  if (normalized.includes('devops')) {
    return TOPIC_LIBRARY.devops;
  }

  if (normalized.includes('finance') || normalized.includes('money') || normalized.includes('invest')) {
    return TOPIC_LIBRARY.finance;
  }

  if (normalized.includes('tech') || normalized.includes('software') || normalized.includes('developer')) {
    return TOPIC_LIBRARY.tech;
  }

  return TOPIC_LIBRARY.tech;
}

export function createStarterTopicBank(niche: string): string[] {
  const topics = pickTopicSet(niche);

  return topics.map((topic) => `${niche.trim()}: ${topic}`);
}

export function createStubClientProfile(input: ClientAddInput): PersistedClientProfile {
  const tone = input.tone ?? 'educational';
  const topicBank = createStarterTopicBank(input.niche);

  return {
    id: input.id,
    name: input.name,
    niche: input.niche,
    topics: topicBank,
    tone,
    topicBank,
    schedule: {
      runDailyAt: '0 9 * * *',
      timezone: 'UTC',
      maxPerDay: 1
    },
    voice: {
      provider: 'stub',
      voiceId: `stub_voice_${input.id}`
    },
    avatar: {
      provider: 'stub',
      avatarId: `stub_avatar_${input.id}`
    },
    youtube: {
      provider: 'stub',
      channelId: `stub_channel_${input.id}`
    }
  };
}

export async function addClientToFile(filePath: string, input: ClientAddInput): Promise<PersistedClientProfile> {
  await ensureDefaultClientsFile(filePath);

  const parsed = JSON.parse(await readFile(filePath, 'utf8')) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error(`Invalid clients file. Expected an array in ${filePath}.`);
  }

  if (parsed.some((entry) => typeof entry === 'object' && entry !== null && 'id' in entry && entry.id === input.id)) {
    throw new Error(`Client with id ${input.id} already exists.`);
  }

  const client = createStubClientProfile(input);
  const nextClients = [...parsed, client];

  await writeFile(filePath, `${JSON.stringify(nextClients, null, 2)}\n`, 'utf8');

  return client;
}
