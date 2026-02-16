# ai-shorts-agent

A clean TypeScript + Node.js starter repository for an AI shorts agent project.

## No API keys required (stub mode)

You can run the full local pipeline with **no external API keys** by keeping stubs enabled:

- `USE_STUBS=true` (default)
- Stub providers in `data/clients.json` (`voice.provider`, `avatar.provider`, `youtube.provider` all set to `"stub"` in the example)

In this mode, the app writes local artifacts/logs instead of calling OpenAI/ElevenLabs/HeyGen/D-ID/YouTube APIs.

## Stack

- Node.js 20+
- TypeScript (ESM)
- pnpm
- ESLint + Prettier
- Vitest
- dotenv + zod for environment parsing and validation
- tsx for local development execution

## Getting started

```bash
pnpm install
cp .env.example .env
pnpm dev
```

## Client profiles (`clients.json`)

Client profiles are loaded from `CLIENTS_FILE` (default: `./data/clients.json`) and must be a JSON array of objects in this shape:

- `id`: unique client identifier
- `name`: display name
- `niche`: content niche
- `topics`: non-empty list of content topics
- `voice`: `{ provider, voiceId }`
- `avatar`: `{ provider, avatarId }`
- `youtube`: `{ provider, channelId }`

### Multi-client support

`clients.json` is an **array**, so a single run environment can manage multiple client profiles (for example one tech channel + one finance channel). The repo ships with two stub clients in `data/clients.example.json`.

Quick start:

```bash
cp data/clients.example.json data/clients.json
```

If `clients.json` is missing, the app now auto-copies `data/clients.example.json` on first run via `ensureDefaultClientsFile` in `src/config/clients.ts`.

### How to add a new client profile

1. Open `data/clients.json`.
2. Add a new object to the array with a unique `id`, your niche, topics, and provider blocks (`voice`, `avatar`, `youtube`).
3. Keep at least one topic in `topics` so the runner can pick content ideas.
4. Run `pnpm dev -- clients` to verify the new client loads correctly.

### Plug in real avatar/voice IDs later

The starter uses stub providers/IDs in the example file so you can run locally first.
When you're ready for production providers, replace:

- `voice.provider` and `voice.voiceId` (for example, ElevenLabs voice IDs)
- `avatar.provider` and `avatar.avatarId` (for example, HeyGen/D-ID avatar IDs)
- `youtube.provider` and `youtube.channelId`

You can migrate one client at a time by updating its provider fields without changing the rest of the schema.

## Topic selection strategies (rotate / random / calendar)

The topic selector supports three strategies through `topicSelectionMode`:

- `rotate` (default): cycles through topic list by day-of-year.
- `random`: deterministic daily random pick (stable for a client/date).
- `calendar`: lets you pin specific dates using `YYYY-MM-DD|Topic`, with fallback rotation for other entries.

### Strategy examples

```json
{
  "id": "tech_en_gb_stub",
  "displayName": "Tech UK Stub Channel",
  "niche": "technology",
  "language": "en-GB",
  "tone": "educational",
  "topicSelectionMode": "rotate",
  "topicBank": ["ai tools", "developer productivity", "startup launches"]
}
```

```json
{
  "id": "finance_en_gb_stub",
  "displayName": "Finance UK Stub Channel",
  "niche": "personal finance",
  "language": "en-GB",
  "tone": "educational",
  "topicSelectionMode": "random",
  "topicBank": ["budgeting", "index funds", "retirement planning"]
}
```

```json
{
  "id": "launch_channel",
  "displayName": "Launch Updates",
  "niche": "tech",
  "language": "en-GB",
  "tone": "professional",
  "topicSelectionMode": "calendar",
  "topicBank": [
    "2026-04-01|Q2 roadmap kickoff",
    "2026-04-15|Launch day breakdown",
    "plain fallback topic"
  ]
}
```

## Quality gates + auto-fix

Before rendering/upload, generated scripts pass through quality validation:

- word count range check
- hook word cap
- duration cap
- CTA presence + CTA verb check

If validation fails, an automatic `fixupScript(...)` pass rewrites key fields (hook/body/cta + metadata) so the run can continue with a compliant script.

## Failure simulation (environment variables)

You can stress-test retry and failure handling in local/stub mode:

- `STUB_FAIL_RATE` (`0..1`, default `0`): probabilistic failures for renderer status checks and stub uploads.
- `STUB_RENDER_MS` (default `5000`): simulated render completion time.

Example:

```bash
STUB_FAIL_RATE=0.4 STUB_RENDER_MS=12000 pnpm dev -- run --client tech_en_gb_stub
```

## Local quota simulation

Stub uploads enforce a per-client daily quota:

- reads limit from `limits.maxUploadsPerDay` (or `schedule.maxPerDay` fallback) on the client profile
- tracks usage in `data/clients/<clientId>/uploads/quota_YYYY-MM-DD.json`

Use the CLI to inspect current usage:

```bash
pnpm dev -- quota --client tech_en_gb_stub
```

## Run logs and metrics

Each run writes structured local observability artifacts:

- Run logs: `data/clients/<clientId>/runs/run_<runId>.json`
- Metrics stream: `data/metrics.json`

CLI helpers:

```bash
pnpm dev -- runs --client tech_en_gb_stub --limit 10
pnpm dev -- metrics --limit 50
```

## Webhook server scaffolding

Webhook scaffolding is included for avatar providers:

- `POST /webhooks/heygen`
- `POST /webhooks/did`

Start it with:

```bash
pnpm webhooks
```

Incoming payloads are persisted to:

- `data/webhooks/heygen_<timestamp>.json`
- `data/webhooks/did_<timestamp>.json`

If a payload includes `jobId`/`id`/`video_id`/`talk_id`, the server also attempts to map it to a known local job.

## Scripts

- `pnpm dev` – watch mode CLI runner (`tsx watch src/cli/index.ts`)
- `pnpm run` – run CLI command (`tsx src/cli/index.ts run`)
- `pnpm build` – compile TypeScript to `dist/`
- `pnpm webhooks` – start webhook server (`tsx src/cli/index.ts webhooks --port 8080`)
- `pnpm start` – run compiled CLI
- `pnpm lint` – run ESLint
- `pnpm format` – run Prettier
- `pnpm test` – run Vitest test suite

### Running

```bash
pnpm dev -- run --client tech_en_gb_stub
pnpm dev -- schedule
```

## Project structure

```text
src/
  cli/
  config/
  core/
  providers/
  server/
  storage/
  utils/
  workflows/
test/
data/
```
