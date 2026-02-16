import type { ClientProfile } from '../core/types.js';

type TopicSelectionMode = 'rotate' | 'random' | 'calendar';
type TopicSelectorClient = ClientProfile & {
  topicSelectionMode?: TopicSelectionMode;
};

const FALLBACK_TOPICS_BY_NICHE: Record<'tech' | 'devops' | 'finance', string[]> = {
  tech: [
    'AI tools that save an hour a day',
    'How edge computing changes mobile apps',
    'Zero-trust security in plain English',
    'Modern API versioning strategies',
    'Web performance wins with small tweaks',
    'How recommendation systems really work',
    'Practical prompt engineering for teams',
    'Low-code vs full-code: when to choose each',
    'Feature flags for safer releases',
    'What product analytics should measure first',
    'The real cost of technical debt',
    'How to evaluate SaaS tools quickly',
    'Data privacy basics for non-lawyers',
    'Event-driven architecture explained simply',
    'A beginner guide to GraphQL tradeoffs',
    'Building reliable search experiences',
    'How caching improves user experience',
    'Accessibility fixes with highest impact',
    'What makes a great developer onboarding flow',
    'How to choose between SQL and NoSQL',
    'A practical intro to vector databases',
    'When to use serverless functions',
    'Observability signals that matter most',
    'How to reduce cloud costs without risk',
    'Designing for offline-first mobile apps',
    'Secure secret management for small teams',
    'The anatomy of a resilient webhook system',
    'How to run effective technical postmortems',
    'Microservices or monolith: a decision guide',
    'Using CI pipelines to catch regressions early'
  ],
  devops: [
    'CI/CD pipeline stages every team needs',
    'Blue-green deployments without downtime',
    'Canary releases for safer production changes',
    'Infrastructure as code: first principles',
    'Kubernetes readiness vs liveness probes',
    'SRE error budgets explained simply',
    'How to build actionable alerting rules',
    'Incident response roles and responsibilities',
    'Postmortems that improve systems',
    'Secrets management in cloud-native stacks',
    'GitOps workflows for multi-env delivery',
    'Container image hardening checklist',
    'Practical log retention strategies',
    'How to baseline service-level indicators',
    'Disaster recovery drills that actually help',
    'Cost optimization for persistent workloads',
    'Autoscaling pitfalls and fixes',
    'Progressive delivery with feature gates',
    'Monitoring queue health in distributed systems',
    'How to choose a deployment orchestration tool',
    'Managing multi-region failover confidence',
    'Reliable backups for stateful services',
    'How to prevent config drift at scale',
    'Build artifact provenance and supply-chain trust',
    'Optimizing build times in monorepos',
    'Creating golden paths for developer platforms',
    'Network policies for Kubernetes security',
    'Runbooks that reduce on-call stress',
    'Service dependency mapping techniques',
    'Capacity planning with historical metrics'
  ],
  finance: [
    'How compound interest builds long-term wealth',
    'Budgeting with a zero-based framework',
    'Emergency funds: how much is enough?',
    'Credit score factors you can improve now',
    'Index funds vs active funds explained',
    'Dollar-cost averaging for volatile markets',
    'How inflation impacts your savings plan',
    'Common investing mistakes beginners make',
    'Risk tolerance and portfolio allocation basics',
    'What to know before opening a brokerage account',
    'Debt snowball vs debt avalanche methods',
    'Understanding ETFs in simple terms',
    'How to evaluate expense ratios quickly',
    'Building a monthly cash-flow dashboard',
    'Retirement account options by employment type',
    'Tax-loss harvesting basics for investors',
    'How to set realistic financial goals',
    'Sinking funds for irregular expenses',
    'What diversification actually protects against',
    'Short-term vs long-term investing mindset',
    'How to automate healthy money habits',
    'Reading company earnings as a beginner',
    'Behavioral biases that hurt investment returns',
    'Understanding bond ladders for stability',
    'Planning for big purchases without panic',
    'How to compare mortgage options wisely',
    'Side-income ideas and tax considerations',
    'Protecting your finances from fraud',
    'Building net worth with deliberate systems',
    'Simple portfolio rebalancing strategies'
  ]
};

function formatDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function dayOfYear(date: Date): number {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1);
  const currentDate = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

  return Math.floor((currentDate - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
}

export function seededPick(seed: string, n: number): number {
  if (!Number.isInteger(n) || n <= 0) {
    return 0;
  }

  let hash = 2166136261;

  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) % n;
}

function getFallbackTopics(niche: string): string[] {
  const normalized = niche.toLowerCase();

  if (normalized.includes('devops')) {
    return FALLBACK_TOPICS_BY_NICHE.devops;
  }

  if (normalized.includes('finance')) {
    return FALLBACK_TOPICS_BY_NICHE.finance;
  }

  return FALLBACK_TOPICS_BY_NICHE.tech;
}

function getTopicSelectionMode(client: TopicSelectorClient): TopicSelectionMode {
  if (client.topicSelectionMode === 'random' || client.topicSelectionMode === 'calendar') {
    return client.topicSelectionMode;
  }

  return 'rotate';
}

function parseCalendarEntry(entry: string): { dateKey: string; topic: string } | null {
  const [candidateDate, ...topicParts] = entry.split('|');

  if (!candidateDate || topicParts.length === 0) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidateDate.trim())) {
    return null;
  }

  const topic = topicParts.join('|').trim();

  if (topic.length === 0) {
    return null;
  }

  return { dateKey: candidateDate.trim(), topic };
}

export function selectTopic(client: ClientProfile, date: Date): string {
  const selectorClient = client as TopicSelectorClient;
  const sourceTopics =
    selectorClient.topicBank.length > 0 ? selectorClient.topicBank : getFallbackTopics(selectorClient.niche);

  if (sourceTopics.length === 0) {
    return 'Daily insights';
  }

  const mode = getTopicSelectionMode(selectorClient);

  if (mode === 'rotate') {
    return sourceTopics[dayOfYear(date) % sourceTopics.length];
  }

  if (mode === 'random') {
    const seed = `${selectorClient.id}:${formatDateKey(date)}`;

    return sourceTopics[seededPick(seed, sourceTopics.length)];
  }

  const dateKey = formatDateKey(date);
  const plainTopics: string[] = [];

  for (const entry of sourceTopics) {
    const calendarEntry = parseCalendarEntry(entry);

    if (calendarEntry) {
      if (calendarEntry.dateKey === dateKey) {
        return calendarEntry.topic;
      }

      continue;
    }

    if (entry.trim().length > 0) {
      plainTopics.push(entry);
    }
  }

  if (plainTopics.length === 0) {
    return sourceTopics[dayOfYear(date) % sourceTopics.length];
  }

  return plainTopics[dayOfYear(date) % plainTopics.length];
}
