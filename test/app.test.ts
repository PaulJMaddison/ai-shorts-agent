import { describe, expect, test } from 'vitest';

import { runAgent } from '../src/core/app.js';

describe('runAgent', () => {
  test('returns startup text', () => {
    const output = runAgent();

    expect(output).toContain('ai-shorts-agent running');
  });
});
