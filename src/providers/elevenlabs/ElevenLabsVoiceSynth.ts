import type { VoiceSynth } from '../../core/interfaces.js';

import { NotImplementedError } from '../shared/NotImplementedError.js';

type ClientWithVoiceSettings = Parameters<VoiceSynth['synthesize']>[0]['client'] & {
  voice?: { provider?: string; voiceId?: string };
};

function scriptToText(script: Parameters<VoiceSynth['synthesize']>[0]['script']): string {
  return [script.hook, script.body, script.cta].filter(Boolean).join('\n\n');
}

export class ElevenLabsVoiceSynth implements VoiceSynth {
  async synthesize(input: Parameters<VoiceSynth['synthesize']>[0]): ReturnType<VoiceSynth['synthesize']> {
    const client = input.client as ClientWithVoiceSettings;

    const request = {
      voiceId: client.voice?.voiceId,
      modelId: 'eleven_multilingual_v2',
      text: scriptToText(input.script),
      client: {
        id: client.id,
        voiceProvider: client.voice?.provider
      },
      outputFormat: 'mp3_44100_128'
    };

    console.info('[ElevenLabsVoiceSynth] Prepared request shape', request);

    throw new NotImplementedError(
      'ElevenLabsVoiceSynth.synthesize is not implemented yet. Wire this to ElevenLabs when API keys are available.'
    );
  }
}
