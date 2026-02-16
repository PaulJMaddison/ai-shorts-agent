import type { Script } from '../core/types.js';

const CTA_VERBS = ['follow', 'subscribe', 'learn', 'save'];
const MIN_WORD_COUNT = 130;
const MAX_WORD_COUNT = 190;
const MAX_HOOK_WORDS = 16;
const MAX_DURATION_SEC = 60;

type ScriptWithWordCount = Script & { wordCount?: number };

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

function computeScriptWordCount(script: Pick<Script, 'hook' | 'body' | 'cta'>): number {
  return countWords(`${script.hook} ${script.body} ${script.cta}`);
}

function buildTitleSuggestions(topic: string, niche: string): string[] {
  return [
    `${topic}: Fast ${niche} Breakdown`,
    `${topic} Explained in Under a Minute`,
    `How ${topic} Works (${niche} Edition)`
  ];
}

function buildDescription(script: Script): string {
  return `${script.topic} in plain language for ${script.niche} audiences with a ${script.tone} tone. #Shorts #${script.niche.replace(/\s+/g, '')}`;
}

function buildTags(script: Script): string[] {
  const base = [
    'shorts',
    'youtube shorts',
    script.topic.toLowerCase(),
    script.niche.toLowerCase(),
    script.tone,
    script.language.toLowerCase(),
    'learn fast'
  ];

  return base.filter((tag, index) => tag.length > 0 && base.indexOf(tag) === index);
}

function hasCtaVerb(cta: string): boolean {
  return CTA_VERBS.some((verb) => new RegExp(`\\b${verb}\\b`, 'i').test(cta));
}

function limitWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);

  return words.slice(0, maxWords).join(' ');
}

export function validateScript(script: ScriptWithWordCount): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  const wordCount = script.wordCount ?? computeScriptWordCount(script);

  if (wordCount < MIN_WORD_COUNT || wordCount > MAX_WORD_COUNT) {
    issues.push(`wordCount must be between ${MIN_WORD_COUNT} and ${MAX_WORD_COUNT} words (got ${wordCount})`);
  }

  const hookWordCount = countWords(script.hook);

  if (hookWordCount > MAX_HOOK_WORDS) {
    issues.push(`hook must be ${MAX_HOOK_WORDS} words or fewer (got ${hookWordCount})`);
  }

  if (script.durationSecTarget > MAX_DURATION_SEC) {
    issues.push(`durationSecTarget must be ${MAX_DURATION_SEC} seconds or fewer (got ${script.durationSecTarget})`);
  }

  if (!script.cta.trim()) {
    issues.push('cta must be non-empty');
  } else if (!hasCtaVerb(script.cta)) {
    issues.push(`cta must include at least one call-to-action verb (${CTA_VERBS.join(', ')})`);
  }

  return { ok: issues.length === 0, issues };
}

export function fixupScript(script: Script, issues: string[]): Script {
  if (issues.length === 0) {
    return script;
  }

  const hook = limitWords(`${script.topic} made simple for ${script.niche} creators.`, MAX_HOOK_WORDS);
  const bodySentences = [
    `${script.topic} matters in ${script.niche} because clear fundamentals help people make better decisions quickly and avoid expensive mistakes early.`,
    `Start by defining one practical goal, then choose one signal that proves progress so your process stays grounded and measurable.`,
    `Next, break the topic into small actions your audience can repeat this week, even with limited time, tools, or prior experience.`,
    `Use a ${script.tone} explanation style with concrete examples so abstract ideas become memorable, useful, and easy to apply immediately.`,
    `Keep each step focused on outcomes, remove unnecessary jargon, and connect every point to real situations your viewers recognize daily.`,
    `Close by summarizing the key takeaway in one line so the lesson feels complete and your audience knows exactly what to do next.`
  ];
  const cta = `Follow and save this short to learn more ${script.niche} lessons on ${script.topic}.`;

  const fixedScript: Script = {
    ...script,
    hook,
    body: bodySentences.join(' '),
    cta,
    durationSecTarget: Math.min(script.durationSecTarget, MAX_DURATION_SEC),
  };

  return {
    ...fixedScript,
    titleSuggestions: buildTitleSuggestions(fixedScript.topic, fixedScript.niche),
    description: buildDescription(fixedScript),
    tags: buildTags(fixedScript)
  };
}
