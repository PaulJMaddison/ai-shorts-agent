# Provider Integration Notes

This document summarizes what you need for each provider when moving from stubs to real APIs.

## ElevenLabs (Voice)

### Required credentials

- `ELEVENLABS_API_KEY`

### Where to put them

- `.env`:
  - `ELEVENLABS_API_KEY`
- `data/clients.json`:
  - `voice.provider`: `elevenlabs`
  - `voice.voiceId`: your target voice ID

### IDs needed

- `voiceId`

### Webhook notes

- Usually not required for straightforward text-to-speech conversion.
- Optional for async workflows if you later adopt enterprise/event-driven flows.

### Request/response shape sketch

- Request:
  - text/script input
  - voice ID
  - optional model/settings
- Response:
  - audio payload (binary/stream/url depending on endpoint usage)
  - metadata about generation

Official docs:
- https://elevenlabs.io/docs/api-reference/text-to-speech/convert

## HeyGen (Avatar)

### Required credentials

- `HEYGEN_API_KEY`

### Where to put them

- `.env`:
  - `HEYGEN_API_KEY`
- `data/clients.json`:
  - `avatar.provider`: `heygen`
  - `avatar.avatarId` or `avatar.imageUrl`

### IDs needed

- `avatarId` (recommended), or image URL for compatible flows

### Webhook notes

- Recommended to reduce polling load and receive completion notifications.

### Request/response shape sketch

- Create video request:
  - script/audio reference
  - avatar/presenter ID or source image
  - render parameters
- Create video response:
  - job/video ID
  - initial status
- Status check response:
  - processing/completed/failed
  - output video URL when done

Official docs:
- https://docs.heygen.com/reference/create-an-avatar-video-v2
- https://docs.heygen.com/reference/get-video-status
- https://docs.heygen.com/reference/post_webhook-endpoint

## D-ID (Avatar)

### Required credentials

- `DID_API_KEY`

### Where to put them

- `.env`:
  - `DID_API_KEY`
- `data/clients.json`:
  - `avatar.provider`: `did`
  - `avatar.avatarId` or `avatar.imageUrl`

### IDs needed

- `avatarId` for presenter-based setups, or `imageUrl` when driving a talk from an image source

### Webhook notes

- Optional but recommended for production to avoid tight polling loops.

### Request/response shape sketch

- Create talk request:
  - script/audio
  - presenter/avatar or image source
  - render options
- Create talk response:
  - talk ID/job ID
  - status
- Status/output:
  - processing/completed/failed
  - rendered video URL

Official docs:
- https://docs.d-id.com/reference/talks-overview
- https://docs.d-id.com/reference/create-talk

## YouTube Data API (Upload)

### Required credentials

- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `YOUTUBE_REDIRECT_URI`
- `YOUTUBE_REFRESH_TOKEN`

### Where to put them

- `.env`:
  - `YOUTUBE_CLIENT_ID`
  - `YOUTUBE_CLIENT_SECRET`
  - `YOUTUBE_REDIRECT_URI`
  - `YOUTUBE_REFRESH_TOKEN`
- `data/clients.json`:
  - `youtube.provider`: live (non-`stub`) provider value
  - `youtube.authRef`: identifier for auth/account mapping
  - `youtube.channelId`: optional local metadata for your channel mapping

### IDs needed

- OAuth client ID
- Refresh token
- Channel context (via config and/or token scopes)

### Webhook notes

- YouTube upload flow is commonly polling-based from your side.
- Use internal job tracking and retries for resilience.

### Request/response shape sketch

- Auth/token exchange:
  - client credentials + refresh token
  - access token response
- Video upload request:
  - metadata (title/description/privacy)
  - media file stream
- Upload response:
  - video ID
  - public/watch URL

Official docs:
- https://developers.google.com/youtube/v3/guides/authentication
- https://developers.google.com/youtube/v3/guides/uploading_a_video
