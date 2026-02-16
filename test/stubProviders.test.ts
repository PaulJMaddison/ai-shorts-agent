import { afterEach, describe, expect, test, vi } from 'vitest';

async function loadStubAvatarRenderer() {
  vi.resetModules();
  const module = await import('../src/providers/stub/StubAvatarRenderer.js');

  return module.StubAvatarRenderer;
}

async function loadStubYouTubeUploader() {
  vi.resetModules();
  const module = await import('../src/providers/stub/StubYouTubeUploader.js');

  return module.StubYouTubeUploader;
}

describe('stub providers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.STUB_FAIL_RATE;
    delete process.env.STUB_RENDER_MS;
    delete process.env.DATA_DIR;
    process.env.NODE_ENV = 'test';
  });

  test('renderer completes after configured STUB_RENDER_MS', async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATA_DIR = './data';
    process.env.STUB_FAIL_RATE = '0';
    process.env.STUB_RENDER_MS = '200';

    const StubAvatarRenderer = await loadStubAvatarRenderer();
    const renderer = new StubAvatarRenderer();

    const client = {
      id: 'renderer-client',
      displayName: 'Renderer Client',
      niche: 'tech',
      language: 'en-GB',
      tone: 'educational' as const,
      topicBank: ['one']
    };

    const job = await renderer.render({
      client,
      audio: { path: '/tmp/audio.mp3', mimeType: 'audio/mpeg' },
      script: {
        topic: 'Topic',
        niche: 'tech',
        language: 'en-GB',
        tone: 'educational',
        hook: 'Hook',
        body: 'Body',
        cta: 'CTA',
        titleSuggestions: ['Title'],
        description: 'Description',
        tags: ['tag'],
        durationSecTarget: 30
      }
    });

    expect(job.status).toBe('processing');

    const beforeDelay = await renderer.getStatus({ client, jobId: job.id });
    expect(beforeDelay.status).toBe('processing');

    await new Promise((resolve) => setTimeout(resolve, 250));

    const afterDelay = await renderer.getStatus({ client, jobId: job.id });
    expect(afterDelay.status).toBe('completed');
  });

  test('renderer fails when random draw is below STUB_FAIL_RATE', async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATA_DIR = './data';
    process.env.STUB_FAIL_RATE = '1';
    process.env.STUB_RENDER_MS = '200';

    const StubAvatarRenderer = await loadStubAvatarRenderer();
    const renderer = new StubAvatarRenderer();

    const client = {
      id: 'renderer-failure-client',
      displayName: 'Renderer Failure Client',
      niche: 'tech',
      language: 'en-GB',
      tone: 'educational' as const,
      topicBank: ['one']
    };

    const job = await renderer.render({
      client,
      audio: { path: '/tmp/audio.mp3', mimeType: 'audio/mpeg' },
      script: {
        topic: 'Topic',
        niche: 'tech',
        language: 'en-GB',
        tone: 'educational',
        hook: 'Hook',
        body: 'Body',
        cta: 'CTA',
        titleSuggestions: ['Title'],
        description: 'Description',
        tags: ['tag'],
        durationSecTarget: 30
      }
    });

    const failed = await renderer.getStatus({ client, jobId: job.id });

    expect(failed.status).toBe('failed');
    expect(failed.error).toContain('Simulated renderer failure');
  });

  test('uploader fails with simulated error when random draw is below STUB_FAIL_RATE', async () => {
    process.env.NODE_ENV = 'test';
    process.env.STUB_FAIL_RATE = '0.5';

    vi.spyOn(Math, 'random').mockReturnValue(0.1);

    const StubYouTubeUploader = await loadStubYouTubeUploader();
    const uploader = new StubYouTubeUploader();

    const client = {
      id: 'uploader-failure-client',
      displayName: 'Uploader Failure Client',
      niche: 'tech',
      language: 'en-GB',
      tone: 'educational' as const,
      topicBank: ['one']
    };

    await expect(
      uploader.uploadShort({
        client,
        script: {
          topic: 'Topic',
          niche: 'tech',
          language: 'en-GB',
          tone: 'educational',
          hook: 'Hook',
          body: 'Body',
          cta: 'CTA',
          titleSuggestions: ['Title'],
          description: 'Description',
          tags: ['tag'],
          durationSecTarget: 30
        },
        video: { path: '/tmp/video.mp4', mimeType: 'video/mp4' }
      })
    ).rejects.toThrowError(/Simulated uploader failure/);
  });
});
