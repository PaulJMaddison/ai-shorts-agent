import { afterEach, describe, expect, test, vi } from 'vitest';

import { retry } from '../src/utils/retry.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('retry', () => {
  test('retries the expected number of times', async () => {
    vi.useFakeTimers();

    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts += 1;
      if (attempts < 3) {
        throw new Error('temporary failure');
      }
      return 'ok';
    });

    const resultPromise = retry(fn, {
      tries: 5,
      minDelayMs: 10,
      maxDelayMs: 100,
      jitter: 0
    });

    await vi.runAllTimersAsync();

    await expect(resultPromise).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('does not retry when shouldRetry returns false', async () => {
    vi.useFakeTimers();

    const err = new Error('do not retry');
    const fn = vi.fn(async () => {
      throw err;
    });

    await expect(
      retry(fn, {
        tries: 5,
        minDelayMs: 10,
        maxDelayMs: 100,
        shouldRetry: () => false
      })
    ).rejects.toBe(err);

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
