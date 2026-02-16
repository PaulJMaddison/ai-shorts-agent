import type { AvatarRenderer } from '../../core/interfaces.js';

import { NotImplementedError } from '../shared/NotImplementedError.js';

type ClientWithAvatarSettings = Parameters<AvatarRenderer['render']>[0]['client'] & {
  avatar?: { provider?: string; avatarId?: string };
};

export class HeyGenAvatarRenderer implements AvatarRenderer {
  async render(input: Parameters<AvatarRenderer['render']>[0]): ReturnType<AvatarRenderer['render']> {
    const client = input.client as ClientWithAvatarSettings;

    const request = {
      avatarId: client.avatar?.avatarId,
      audioUrl: input.audio.path,
      script: {
        topic: input.script.topic,
        hook: input.script.hook,
        body: input.script.body,
        cta: input.script.cta
      },
      client: {
        id: client.id,
        avatarProvider: client.avatar?.provider
      }
    };

    console.info('[HeyGenAvatarRenderer] Prepared render request shape', request);

    throw new NotImplementedError(
      'HeyGenAvatarRenderer.render is not implemented yet. Wire this to HeyGen when API keys are available.'
    );
  }

  async getStatus(input: Parameters<AvatarRenderer['getStatus']>[0]): ReturnType<AvatarRenderer['getStatus']> {
    const client = input.client as ClientWithAvatarSettings;

    const request = {
      jobId: input.jobId,
      client: {
        id: client.id,
        avatarId: client.avatar?.avatarId
      }
    };

    console.info('[HeyGenAvatarRenderer] Prepared status request shape', request);

    throw new NotImplementedError(
      'HeyGenAvatarRenderer.getStatus is not implemented yet. Wire this to HeyGen when API keys are available.'
    );
  }

  async download(input: Parameters<AvatarRenderer['download']>[0]): ReturnType<AvatarRenderer['download']> {
    const client = input.client as ClientWithAvatarSettings;

    const request = {
      jobId: input.jobId,
      client: {
        id: client.id,
        avatarId: client.avatar?.avatarId
      }
    };

    console.info('[HeyGenAvatarRenderer] Prepared download request shape', request);

    throw new NotImplementedError(
      'HeyGenAvatarRenderer.download is not implemented yet. Wire this to HeyGen when API keys are available.'
    );
  }
}
