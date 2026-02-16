import type { ScriptWriter } from '../../core/interfaces.js';

import { NotImplementedError } from '../shared/NotImplementedError.js';

type ClientWithSettings = Parameters<ScriptWriter['writeScript']>[0]['client'] & {
  name?: string;
  topics?: string[];
  voice?: { provider?: string; voiceId?: string };
  avatar?: { provider?: string; avatarId?: string };
  youtube?: { provider?: string; channelId?: string };
};

export class OpenAIScriptWriter implements ScriptWriter {
  async writeScript(input: Parameters<ScriptWriter['writeScript']>[0]): ReturnType<ScriptWriter['writeScript']> {
    const client = input.client as ClientWithSettings;

    const request = {
      model: 'gpt-4o-mini',
      input: {
        clientId: client.id,
        clientName: client.name,
        topic: input.topic,
        niche: client.niche,
        topics: client.topics,
        voice: {
          provider: client.voice?.provider,
          voiceId: client.voice?.voiceId
        },
        avatar: {
          provider: client.avatar?.provider,
          avatarId: client.avatar?.avatarId
        }
      }
    };

    console.info('[OpenAIScriptWriter] Prepared request shape', request);

    throw new NotImplementedError(
      'OpenAIScriptWriter.writeScript is not implemented yet. Wire this to OpenAI when API keys are available.'
    );
  }
}
