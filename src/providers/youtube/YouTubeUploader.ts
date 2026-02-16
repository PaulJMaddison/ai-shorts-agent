import type { Uploader } from '../../core/interfaces.js';

import { NotImplementedError } from '../shared/NotImplementedError.js';

type ClientWithYouTubeSettings = Parameters<Uploader['uploadShort']>[0]['client'] & {
  youtube?: { provider?: string; channelId?: string };
};

export class YouTubeUploader implements Uploader {
  async uploadShort(input: Parameters<Uploader['uploadShort']>[0]): ReturnType<Uploader['uploadShort']> {
    const client = input.client as ClientWithYouTubeSettings;

    const request = {
      channelId: client.youtube?.channelId,
      title: input.script.titleSuggestions[0] ?? input.script.topic,
      description: input.script.description,
      tags: input.script.tags,
      videoPath: input.video.path,
      options: {
        privacyStatus: input.opts?.privacyStatus ?? 'private',
        publishAt: input.opts?.publishAt,
        madeForKids: input.opts?.madeForKids ?? false
      },
      client: {
        id: client.id,
        youtubeProvider: client.youtube?.provider
      }
    };

    console.info('[YouTubeUploader] Prepared upload request shape', request);

    throw new NotImplementedError(
      'YouTubeUploader.uploadShort is not implemented yet. Wire this to YouTube when OAuth credentials are available.'
    );
  }
}
