# Go Live with Real Providers

This guide is for running the project against real APIs after cloning the repo.

## Checklist

- [ ] Install prerequisites:
  - Node.js 20+
  - pnpm
  - ffmpeg
- [ ] Copy `.env.example` to `.env`.
- [ ] Set `USE_STUBS=false` in `.env`.
- [ ] Add or verify client profiles in `data/clients.json`.
- [ ] Create and configure provider accounts + credentials:
  - ElevenLabs (API key + `voiceId`)
  - HeyGen **or** D-ID (API key + `avatarId` or `imageUrl`, depending on your setup)
  - YouTube Data API (Google Cloud project, OAuth client, refresh token)

## Important: Real provider classes are scaffolded, not implemented

The repo currently ships with stub providers by default. Going live requires implementing real API behavior in the scaffolded provider classes below.

Files to modify:

- `src/providers/elevenlabs/ElevenLabsVoiceSynth.ts`
- `src/providers/heygen/HeyGenAvatarRenderer.ts` **or** `src/providers/did/DIDAvatarRenderer.ts`
- `src/providers/youtube/YouTubeUploader.ts`
- `src/providers/openai/OpenAIScriptWriter.ts` (optional, only if you want real script generation)

## First real run

1. Validate your setup:

   ```bash
   pnpm dev -- doctor --client <id>
   ```

2. Run exactly one client manually first:

   ```bash
   pnpm dev -- run --client <id> --privacy unlisted
   ```

3. Keep `privacyStatus` as `unlisted` for initial verification.
4. Validate output artifacts and logs under:

   - `data/clients/<id>/`

## Provider account and key setup

### A) ElevenLabs

- Create an ElevenLabs account and API key.
- Add `ELEVENLABS_API_KEY` to `.env`.
- Set `voice.provider` to `elevenlabs` and add `voice.voiceId` in `data/clients.json`.

### B) HeyGen or D-ID

- Create your avatar provider account and API key.
- Use one avatar provider per client profile:
  - HeyGen: set `avatar.provider` to `heygen`
  - D-ID: set `avatar.provider` to `did`
- In `data/clients.json`, set at least one avatar source field per client:
  - `avatar.avatarId` (recommended when available)
  - or `avatar.imageUrl` (if your provider flow supports image-based presenters)

### C) YouTube Data API

- Create a Google Cloud project.
- Enable YouTube Data API.
- Configure OAuth client credentials and redirect URI.
- Generate and securely store a refresh token.
- Set these `.env` values:
  - `YOUTUBE_CLIENT_ID`
  - `YOUTUBE_CLIENT_SECRET`
  - `YOUTUBE_REDIRECT_URI`
  - `YOUTUBE_REFRESH_TOKEN`
- In `data/clients.json`, use `youtube.provider` (non-stub for live mode) and set `youtube.authRef`.

## Troubleshooting

### OAuth issues

- Missing refresh token: generate OAuth consent flow with offline access and confirm token persistence.
- Wrong redirect URI: ensure the URI in Google Cloud exactly matches your app config.

### Avatar job stuck in processing

- Add robust polling with timeout/backoff in renderer providers.
- Add webhooks later for faster completion updates and less polling pressure.

### Quota and limits

- YouTube has upload and API quota constraints.
- Avatar and voice providers also enforce usage limits.
- Implement retry/backoff and clear error mapping for quota responses.

### ffmpeg missing

- Install ffmpeg before enabling post-processing/captions workflows.

## Security

- Never commit `.env`.
- Rotate keys immediately if leaked.
- Store refresh tokens carefully (treat as high-value secrets).
- Use least-privilege credentials and separate keys per environment (dev/staging/prod).
