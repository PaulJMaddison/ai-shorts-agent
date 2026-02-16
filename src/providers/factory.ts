import { DIDAvatarRenderer } from './did/DIDAvatarRenderer.js';
import { ElevenLabsVoiceSynth } from './elevenlabs/ElevenLabsVoiceSynth.js';
import { HeyGenAvatarRenderer } from './heygen/HeyGenAvatarRenderer.js';
import { OpenAIScriptWriter } from './openai/OpenAIScriptWriter.js';
import { StubAvatarRenderer } from './stub/StubAvatarRenderer.js';
import { StubScriptWriter } from './stub/StubScriptWriter.js';
import { StubVoiceSynth } from './stub/StubVoiceSynth.js';
import { StubYouTubeUploader } from './stub/StubYouTubeUploader.js';
import { YouTubeUploader } from './youtube/YouTubeUploader.js';

import type { ClientProfile } from '../config/clients.js';
import type { Providers } from '../core/interfaces.js';
import type { RenderJob } from '../core/types.js';

interface ProviderFactoryConfig {
  USE_STUBS: boolean;
  DATA_DIR?: string;
}

interface JobStoreLike {
  save(job: RenderJob): Promise<RenderJob>;
  update(job: RenderJob): Promise<RenderJob>;
  get(jobId: string): Promise<RenderJob | undefined>;
}

function shouldUseStubForProvider(useStubs: boolean, provider: string): boolean {
  return useStubs || provider === 'stub';
}

export function createProviders(config: ProviderFactoryConfig, _jobStore: JobStoreLike) {
  const stubProviders: Providers = {
    writer: new StubScriptWriter(),
    voice: new StubVoiceSynth({ dataDir: config.DATA_DIR }),
    renderer: new StubAvatarRenderer(),
    uploader: new StubYouTubeUploader()
  };

  const openAIWriter = new OpenAIScriptWriter();
  const elevenLabsVoiceSynth = new ElevenLabsVoiceSynth();
  const heyGenAvatarRenderer = new HeyGenAvatarRenderer();
  const didAvatarRenderer = new DIDAvatarRenderer();
  const youTubeUploader = new YouTubeUploader();

  return function getProvidersForClient(client: ClientProfile): Providers {
    const useStubs = config.USE_STUBS;

    const renderer = shouldUseStubForProvider(useStubs, client.avatar.provider)
      ? stubProviders.renderer
      : client.avatar.provider === 'did'
        ? didAvatarRenderer
        : heyGenAvatarRenderer;

    return {
      writer: useStubs ? stubProviders.writer : openAIWriter,
      voice: shouldUseStubForProvider(useStubs, client.voice.provider)
        ? stubProviders.voice
        : elevenLabsVoiceSynth,
      renderer,
      uploader: shouldUseStubForProvider(useStubs, client.youtube.provider)
        ? stubProviders.uploader
        : youTubeUploader
    };
  };
}
