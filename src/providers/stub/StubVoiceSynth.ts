import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { VoiceSynth } from '../../core/interfaces.js';
import type { AudioAsset, ClientProfile, Script } from '../../core/types.js';

interface VoiceInfo {
  provider?: string;
  voiceId?: string;
}

interface StubVoiceSynthOptions {
  dataDir?: string;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function getScriptText(script: Script): string {
  return [script.hook, script.body, script.cta].filter(Boolean).join('\n\n');
}

function getVoiceInfo(client: ClientProfile): VoiceInfo {
  const maybeVoice = (client as ClientProfile & { voice?: VoiceInfo }).voice;
  return {
    provider: maybeVoice?.provider,
    voiceId: maybeVoice?.voiceId
  };
}

export class StubVoiceSynth implements VoiceSynth {
  private readonly dataDir: string;

  constructor(options: StubVoiceSynthOptions = {}) {
    this.dataDir = options.dataDir ?? 'data';
  }

  async synthesize(input: { client: ClientProfile; script: Script }): Promise<AudioAsset> {
    const { client, script } = input;
    const timestamp = Date.now();
    const slug = slugify(script.topic || script.hook || 'script');
    const audioDir = path.join(this.dataDir, 'clients', client.id, 'audio');
    const fileName = `audio_${timestamp}_${slug}.mp3`;
    const audioPath = path.join(audioDir, fileName);
    const sidecarPath = path.join(audioDir, `${fileName}.json`);

    const scriptText = getScriptText(script);
    const voice = getVoiceInfo(client);

    await mkdir(audioDir, { recursive: true });

    const placeholderMp3Content = Buffer.from('ID3\u0004\u0000\u0000\u0000\u0000\u0000\u0000', 'binary');
    await writeFile(audioPath, placeholderMp3Content);

    await writeFile(
      sidecarPath,
      `${
        JSON.stringify(
          {
            clientId: client.id,
            voice: {
              provider: voice.provider,
              voiceId: voice.voiceId
            },
            script: scriptText
          },
          null,
          2
        )
      }\n`,
      'utf8'
    );

    return {
      path: audioPath,
      mimeType: 'audio/mpeg',
      meta: {
        stub: true,
        sidecarPath
      }
    };
  }
}
