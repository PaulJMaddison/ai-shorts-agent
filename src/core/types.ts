export type ScriptTone = 'educational' | 'casual' | 'professional';

export interface Script {
  topic: string;
  niche: string;
  language: string;
  tone: ScriptTone;
  hook: string;
  body: string;
  cta: string;
  titleSuggestions: string[];
  description: string;
  tags: string[];
  durationSecTarget: number;
}

export interface AudioAsset {
  path: string;
  mimeType: string;
  durationSec?: number;
  meta?: Record<string, any>;
}

export interface VideoAsset {
  path: string;
  mimeType: string;
  width?: number;
  height?: number;
  durationSec?: number;
  meta?: Record<string, any>;
}

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface RenderJob {
  id: string;
  provider: 'stub' | 'heygen' | 'did';
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  error?: string;
  meta?: Record<string, any>;
  clientId: string;
}

export interface UploadResult {
  youtubeVideoId: string;
  url: string;
  provider: 'stub' | 'youtube';
  meta?: Record<string, any>;
}

export interface ClientProfile {
  id: string;
  displayName: string;
  niche: string; // e.g. "tech", "personal finance"
  language: string; // e.g. "en-GB"
  tone: ScriptTone;
  topicBank: string[]; // list of topics/prompts; can be empty
}
