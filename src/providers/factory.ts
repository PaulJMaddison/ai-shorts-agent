import { StubAvatarRenderer } from './stub/StubAvatarRenderer.js';
import { StubScriptWriter } from './stub/StubScriptWriter.js';
import { StubVoiceSynth } from './stub/StubVoiceSynth.js';
import { StubYouTubeUploader } from './stub/StubYouTubeUploader.js';

import type { ClientProfile } from '../config/clients.js';
import type { AvatarRenderer, Providers, ScriptWriter, Uploader, VoiceSynth } from '../core/interfaces.js';
import type { RenderJob, UploadResult } from '../core/types.js';

interface ProviderFactoryConfig {
  USE_STUBS: boolean;
  DATA_DIR?: string;
}

interface JobStoreLike {
  save(job: RenderJob): Promise<RenderJob>;
  update(job: RenderJob): Promise<RenderJob>;
  get(jobId: string): Promise<RenderJob | undefined>;
}

class RealScriptWriter implements ScriptWriter {
  async writeScript(_input: Parameters<ScriptWriter['writeScript']>[0]): ReturnType<ScriptWriter['writeScript']> {
    throw new Error('RealScriptWriter is not implemented yet.');
  }
}

class RealVoiceSynth implements VoiceSynth {
  async synthesize(_input: Parameters<VoiceSynth['synthesize']>[0]): ReturnType<VoiceSynth['synthesize']> {
    throw new Error('RealVoiceSynth is not implemented yet.');
  }
}

class RealAvatarRenderer implements AvatarRenderer {
  constructor(private readonly _jobStore: JobStoreLike) {}

  async render(
    _input: Parameters<AvatarRenderer['render']>[0]
  ): ReturnType<AvatarRenderer['render']> {
    throw new Error('RealAvatarRenderer.render is not implemented yet.');
  }

  async getStatus(
    _input: Parameters<AvatarRenderer['getStatus']>[0]
  ): ReturnType<AvatarRenderer['getStatus']> {
    throw new Error('RealAvatarRenderer.getStatus is not implemented yet.');
  }

  async download(
    _input: Parameters<AvatarRenderer['download']>[0]
  ): ReturnType<AvatarRenderer['download']> {
    throw new Error('RealAvatarRenderer.download is not implemented yet.');
  }
}

class RealYouTubeUploader implements Uploader {
  async uploadShort(_input: Parameters<Uploader['uploadShort']>[0]): Promise<UploadResult> {
    throw new Error('RealYouTubeUploader is not implemented yet.');
  }
}

function shouldUseStubForProvider(useStubs: boolean, provider: string): boolean {
  return useStubs || provider === 'stub';
}

export function createProviders(config: ProviderFactoryConfig, jobStore: JobStoreLike) {
  const stubProviders: Providers = {
    writer: new StubScriptWriter(),
    voice: new StubVoiceSynth({ dataDir: config.DATA_DIR }),
    renderer: new StubAvatarRenderer(),
    uploader: new StubYouTubeUploader()
  };

  const realProviders: Providers = {
    writer: new RealScriptWriter(),
    voice: new RealVoiceSynth(),
    renderer: new RealAvatarRenderer(jobStore),
    uploader: new RealYouTubeUploader()
  };

  return function getProvidersForClient(client: ClientProfile): Providers {
    const useStubs = config.USE_STUBS;

    return {
      writer: useStubs ? stubProviders.writer : realProviders.writer,
      voice: shouldUseStubForProvider(useStubs, client.voice.provider)
        ? stubProviders.voice
        : realProviders.voice,
      renderer: shouldUseStubForProvider(useStubs, client.avatar.provider)
        ? stubProviders.renderer
        : realProviders.renderer,
      uploader: shouldUseStubForProvider(useStubs, client.youtube.provider)
        ? stubProviders.uploader
        : realProviders.uploader
    };
  };
}
