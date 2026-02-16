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

## Scripts

- `pnpm dev` – watch mode CLI runner (`tsx watch src/cli/index.ts`)
- `pnpm run` – run CLI command (`tsx src/cli/index.ts run`)
- `pnpm build` – compile TypeScript to `dist/`
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
