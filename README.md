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

If `clients.json` is missing, the app can create a default file with one stub client via `ensureDefaultClientsFile` in `src/config/clients.ts`.

## Scripts

- `pnpm dev` – watch mode CLI runner (`tsx watch src/cli/index.ts`)
- `pnpm run` – run CLI command (`tsx src/cli/index.ts run`)
- `pnpm build` – compile TypeScript to `dist/`
- `pnpm webhooks` – start webhook server (`tsx src/cli/index.ts webhooks --port 8080`)
- `pnpm start` – run compiled CLI
- `pnpm lint` – run ESLint
- `pnpm format` – run Prettier
- `pnpm test` – run Vitest test suite

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
