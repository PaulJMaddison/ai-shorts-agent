import type { ScriptWriter } from '../../core/interfaces.js';
import type { ClientProfile, Script } from '../../core/types.js';

const DEFAULT_STYLE = 'YouTube Shorts tech explainer';

function hashString(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function pick<T>(items: readonly T[], seed: number, offset = 0): T {
  const index = (seed + offset) % items.length;
  return items[index];
}

function toTopicSlug(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, '-');
}

function toNicheHashtags(niche: string): string[] {
  const words = niche
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return ['#Tech'];
  }

  const merged = `#${words.map((word) => word[0]?.toUpperCase() + word.slice(1)).join('')}`;
  const singles = words.map((word) => `#${word[0]?.toUpperCase() + word.slice(1)}`);

  return [merged, ...singles].slice(0, 3);
}

function normalizeLanguage(language: string): string {
  const [prefix] = language.split('-');

  if (!prefix) {
    return language;
  }

  const labels: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    pt: 'Portuguese',
    hi: 'Hindi',
    ja: 'Japanese',
  };

  return labels[prefix.toLowerCase()] ?? language;
}

export class StubScriptWriter implements ScriptWriter {
  async writeScript(input: { client: ClientProfile; topic: string }): Promise<Script> {
    const { client, topic } = input;
    const seed = hashString(`${client.id}${topic}`);
    const nicheHashtags = toNicheHashtags(client.niche);
    const normalizedLanguage = normalizeLanguage(client.language);

    const hookTemplates = [
      `Stop scrolling: here's ${topic} explained in under a minute using a ${DEFAULT_STYLE} vibe.`,
      `In the next 55 seconds, you'll finally understand ${topic} like a pro creator.`,
      `If ${topic} sounds confusing, this quick breakdown will make it click fast.`,
      `Let's decode ${topic} with a fast, practical ${DEFAULT_STYLE} format.`,
    ] as const;

    const bodyLineSets = [
      [
        `${topic} matters because it directly shapes how modern apps feel and perform.`,
        `Think of it as a shortcut that removes friction before users even notice it.`,
        `Step one is identifying the core problem instead of chasing flashy tools.`,
        `Step two is applying a simple rule you can repeat every single project.`,
        `Step three is validating results with one metric that actually reflects user impact.`,
        `That sequence turns ${topic} from theory into a practical habit.`,
      ],
      [
        `Most people overcomplicate ${topic}, but the core idea is surprisingly simple.`,
        `You start by mapping inputs, then outputs, then the bottleneck in between.`,
        `Once that bottleneck is visible, the right fix becomes much easier to choose.`,
        `A tiny improvement here can create a huge difference at scale.`,
        `The real win is consistency, not perfection on day one.`,
        `Run this loop weekly and you'll build serious momentum with ${topic}.`,
      ],
      [
        `${topic} is basically the bridge between good ideas and real-world execution.`,
        `First, define success in one sentence so decisions stay focused.`,
        `Then remove one unnecessary step from your current workflow.`,
        `Next, automate one repetitive action to save time every day.`,
        `Finally, review outcomes and keep only what clearly improves results.`,
        `That's how creators and teams level up ${topic} quickly.`,
      ],
    ] as const;

    const ctaTemplates = [
      `Follow for more ${client.niche} explainers and drop your next topic in the comments.`,
      `Like and subscribe for daily ${client.niche} Shorts that turn complex ideas into action.`,
      `Save this Short, share it with a friend, and follow for more ${client.niche} breakdowns.`,
    ] as const;

    const titleA = `${topic} in 55 Seconds (${client.niche} Edition)`;
    const titleB = `The Fastest Way to Understand ${topic}`;
    const titleC = `${topic}: Quick ${DEFAULT_STYLE} Guide`;

    const tags = [
      'shorts',
      'youtube shorts',
      'tech explainer',
      topic.toLowerCase(),
      toTopicSlug(topic),
      client.niche.toLowerCase(),
      client.tone,
      normalizedLanguage.toLowerCase(),
      'content creator',
      'learn tech fast',
    ].filter((value, index, arr) => value.length > 0 && arr.indexOf(value) === index);

    return {
      topic,
      niche: client.niche,
      language: client.language,
      tone: client.tone,
      hook: pick(hookTemplates, seed),
      body: pick(bodyLineSets, seed, 3).join(' '),
      cta: pick(ctaTemplates, seed, 7),
      titleSuggestions: [titleA, titleB, titleC],
      description: `${topic} explained in a ${DEFAULT_STYLE} format for ${client.niche} learners. #Shorts ${nicheHashtags.join(' ')}`,
      tags: tags.slice(0, 12),
      durationSecTarget: 55,
    };
  }
}
