import type {
  AudioAsset,
  ClientProfile,
  RenderJob,
  Script,
  UploadResult,
  VideoAsset,
} from './types.js';

export interface ScriptWriter {
  writeScript(input: { client: ClientProfile; topic: string }): Promise<Script>;
}

export interface VoiceSynth {
  synthesize(input: { client: ClientProfile; script: Script }): Promise<AudioAsset>;
}

export interface AvatarRenderer {
  render(input: {
    client: ClientProfile;
    audio: AudioAsset;
    script: Script;
  }): Promise<RenderJob>;
  getStatus(input: { client: ClientProfile; jobId: string }): Promise<RenderJob>;
  download(input: { client: ClientProfile; jobId: string }): Promise<VideoAsset>;
}

export interface Uploader {
  uploadShort(input: {
    client: ClientProfile;
    video: VideoAsset;
    script: Script;
    opts?: Partial<{
      privacyStatus: 'public' | 'unlisted' | 'private';
      publishAt?: string;
      madeForKids?: boolean;
    }>;
  }): Promise<UploadResult>;
}

export type Providers = {
  writer: ScriptWriter;
  voice: VoiceSynth;
  renderer: AvatarRenderer;
  uploader: Uploader;
};
