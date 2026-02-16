export type RetryOpts = {
  tries: number;
  minDelayMs: number;
  maxDelayMs: number;
  jitter?: number; // 0..1
  shouldRetry?: (err: unknown) => boolean;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function retry<T>(fn: () => Promise<T>, opts: RetryOpts): Promise<T> {
  const { tries, minDelayMs, maxDelayMs, shouldRetry } = opts;
  const jitter = opts.jitter ?? 0;

  if (tries < 1) {
    throw new RangeError('tries must be >= 1');
  }

  if (jitter < 0 || jitter > 1) {
    throw new RangeError('jitter must be between 0 and 1');
  }

  for (let attempt = 1; attempt <= tries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      if (shouldRetry && !shouldRetry(err)) {
        throw err;
      }

      if (attempt === tries) {
        throw err;
      }

      const baseDelay = Math.min(maxDelayMs, minDelayMs * 2 ** (attempt - 1));
      const jitterFactor = 1 - jitter / 2 + Math.random() * jitter;

      await sleep(baseDelay * jitterFactor);
    }
  }

  throw new Error('Retry failed unexpectedly');
}
