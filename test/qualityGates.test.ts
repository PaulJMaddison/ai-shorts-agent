import { describe, expect, test } from 'vitest';

import type { Script } from '../src/core/types.js';
import { countWords, fixupScript, validateScript } from '../src/workflows/qualityGates.js';

function createScript(overrides: Partial<Script> = {}): Script {
  const baseBody = [
    'This intro gives context and keeps the message clear for busy viewers.',
    'It adds practical guidance so people can apply the idea immediately.',
    'Each point is short, concrete, and easy to remember after watching once.',
    'Examples keep the explanation grounded in realistic day-to-day decisions.',
    'The pacing remains fast while still giving enough depth to be useful.',
    'A final recap reinforces the key lesson and invites quick action today.',
    'Extra insight helps the script reach the required word target naturally.',
    'Another useful tip improves clarity and keeps momentum high throughout.',
    'This sentence supports retention with a simple memorable phrasing pattern.',
    'Closing context ensures the audience understands why the topic matters now.',
    'The final educational point adds value without introducing complexity.'
  ].join(' ');

  return {
    topic: 'Prompt Engineering Basics',
    niche: 'AI productivity',
    language: 'en-US',
    tone: 'educational',
    hook: 'Master prompts faster with this simple framework today.',
    body: baseBody,
    cta: 'Follow for more practical AI productivity lessons and save this.',
    titleSuggestions: ['A', 'B', 'C'],
    description: 'Desc',
    tags: ['shorts'],
    durationSecTarget: 55,
    ...overrides
  };
}

describe('countWords', () => {
  test('counts words in noisy whitespace', () => {
    expect(countWords('  One   two\nthree\t four  ')).toBe(4);
  });
});

describe('validateScript', () => {
  test('passes when script meets all quality gates and computes missing wordCount', () => {
    const result = validateScript(createScript());

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  test('reports rule violations', () => {
    const result = validateScript({
      ...createScript({
        hook: 'This hook is intentionally too long to violate the strict sixteen word maximum in the quality gate.',
        cta: 'Great explanation here.',
        durationSecTarget: 75,
        body: 'Too short.'
      }),
      wordCount: 42
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual([
      'wordCount must be between 130 and 190 words (got 42)',
      'hook must be 16 words or fewer (got 17)',
      'durationSecTarget must be 60 seconds or fewer (got 75)',
      'cta must include at least one call-to-action verb (follow, subscribe, learn, save)'
    ]);
  });
});

describe('fixupScript', () => {
  test('returns original script when there are no issues', () => {
    const script = createScript();

    expect(fixupScript(script, [])).toBe(script);
  });

  test('builds a safe fallback script that passes validation', () => {
    const brokenScript = createScript({
      hook: 'This hook is intentionally too long to violate the strict sixteen word maximum in the quality gate.',
      body: 'Too short.',
      cta: 'Thanks for watching.',
      durationSecTarget: 75
    });

    const fixed = fixupScript(brokenScript, ['some issue']);
    const validation = validateScript(fixed);

    expect(fixed.topic).toBe(brokenScript.topic);
    expect(fixed.niche).toBe(brokenScript.niche);
    expect(fixed.tone).toBe(brokenScript.tone);
    expect(fixed.language).toBe(brokenScript.language);
    expect(countWords(fixed.hook)).toBeLessThanOrEqual(16);
    expect(fixed.durationSecTarget).toBeLessThanOrEqual(60);
    expect(fixed.cta.toLowerCase()).toMatch(/\b(follow|subscribe|learn|save)\b/);
    expect(fixed.body.split('. ').length).toBe(6);
    expect(fixed.titleSuggestions.length).toBe(3);
    expect(fixed.description).toContain(brokenScript.topic);
    expect(fixed.tags).toContain(brokenScript.niche.toLowerCase());
    expect(validation.ok).toBe(true);
  });
});
