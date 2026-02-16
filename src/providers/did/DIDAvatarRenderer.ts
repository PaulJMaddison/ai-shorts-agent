import type { AvatarRenderer } from '../../core/interfaces.js';

import { NotImplementedError } from '../shared/NotImplementedError.js';

type ClientWithAvatarSettings = Parameters<AvatarRenderer['render']>[0]['client'] & {
  avatar?: { provider?: string; avatarId?: string };
};

export class DIDAvatarRenderer implements AvatarRenderer {
  async render(input: Parameters<AvatarRenderer['render']>[0]): ReturnType<AvatarRenderer['render']> {
    const client = input.client as ClientWithAvatarSettings;

    const request = {
      sourceUrl: input.audio.path,
      presenterId: client.avatar?.avatarId,
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

    console.info('[DIDAvatarRenderer] Prepared render request shape', request);

    throw new NotImplementedError(
      'DIDAvatarRenderer.render is not implemented yet. Wire this to D-ID when API keys are available.'
    );
  }

  async getStatus(input: Parameters<AvatarRenderer['getStatus']>[0]): ReturnType<AvatarRenderer['getStatus']> {
    const client = input.client as ClientWithAvatarSettings;

    const request = {
      talkId: input.jobId,
      client: {
        id: client.id,
        presenterId: client.avatar?.avatarId
      }
    };

    console.info('[DIDAvatarRenderer] Prepared status request shape', request);

    throw new NotImplementedError(
      'DIDAvatarRenderer.getStatus is not implemented yet. Wire this to D-ID when API keys are available.'
    );
  }

  async download(input: Parameters<AvatarRenderer['download']>[0]): ReturnType<AvatarRenderer['download']> {
    const client = input.client as ClientWithAvatarSettings;

    const request = {
      talkId: input.jobId,
      client: {
        id: client.id,
        presenterId: client.avatar?.avatarId
      }
    };

    console.info('[DIDAvatarRenderer] Prepared download request shape', request);

    throw new NotImplementedError(
      'DIDAvatarRenderer.download is not implemented yet. Wire this to D-ID when API keys are available.'
    );
  }
}
