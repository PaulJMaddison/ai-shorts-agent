# ai-shorts-agent

A clean TypeScript + Node.js starter repository for an AI shorts agent project.

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
