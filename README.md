# ai-shorts-agent

`ai-shorts-agent` is a TypeScript automation pipeline for generating, rendering, and publishing short-form video content. It is designed to be runnable end-to-end in local stub mode first, then swapped onto real providers later.

Turn one codebase into many short-form channels.

This project helps creators, agencies, and product teams launch an AI-powered Shorts engine with a practical local-first workflow: test everything in stub mode, then switch on real providers when you are ready to ship.

This repo is intentionally opinionated about reliability: provider boundaries are explicit, runs are logged, metrics are persisted, failures can be simulated, quotas are enforced, and the core workflow is covered by tests.

## Why use this project

- Ship faster: start with no API keys and no external dependencies, then progressively connect OpenAI, voice, avatar, and YouTube providers.
- Scale safely: run one profile or many client channels from the same environment.
- Production-minded by default: includes retry behavior, quality gates, quota simulation, logs, metrics, and webhook scaffolding.
- Developer-friendly stack: TypeScript, clean interfaces, test coverage, and a CLI that keeps iteration fast.

## Who this is for

- Indie creators building a repeatable Shorts workflow without vendor lock-in.
- Agencies managing multiple client channels with consistent automation.
- Startups and media teams validating AI video pipelines before investing in full production infrastructure.
- Developers who want a strong reference architecture for AI content operations.

## What you can do with it

- Run daily short generation per client profile.
- Enforce script quality constraints automatically.
- Simulate rendering and upload failures before going live.
- Simulate upload quotas and operational limits locally.
- Track run artifacts, metrics, and webhook events for visibility and debugging.

## Value proposition in one line

**From idea to publishable short, with guardrails, observability, and multi-client control, without needing to build the whole system from scratch.**

## Why this project is interesting

This is not just a "call an LLM and hope" demo. The repo shows a few engineering choices that matter in real automation systems:

- local-first development with zero API keys required
- pluggable providers for script writing, voice, avatar rendering, and uploads
- deterministic testability via stub providers and failure injection
- structured run logs and append-only metrics for observability
- quota enforcement and retry logic around failure-prone steps
- multi-client support from a single runtime

## Go live with real APIs

- Read `docs/GO_LIVE.md` for the production-readiness checklist.
- Read `docs/PROVIDERS.md` for provider setup notes.
- Stubs are enabled by default and are safe for local development.
- Multi-client configuration is managed in `data/clients.json`.

Commands:

```bash
pnpm dev -- clients
pnpm dev -- doctor
pnpm dev -- run --client <id> --privacy unlisted
```

## Architecture

The main workflow is:

1. Select a client profile and topic.
2. Generate a script.
3. Synthesize voice audio.
4. Submit an avatar render job and poll until completion.
5. Download the rendered video.
6. Upload the short.
7. Persist logs, metrics, and job state throughout the run.

Core modules:

- `src/cli`: operator-facing commands
- `src/config`: environment parsing and client config loading
- `src/providers`: provider adapters plus local stubs
- `src/storage`: job, quota, metric, and run-log persistence
- `src/workflows`: orchestration, topic selection, scheduling, quality gates, and health checks
- `src/server`: webhook endpoints for provider callbacks
- `test`: unit and workflow coverage

## Local-first quick start

```bash
pnpm install
cp .env.example .env
cp data/clients.example.json data/clients.json
pnpm dev -- clients
pnpm dev -- run --client tech_en_gb_stub
```

By default the repo runs in stub mode:

- `USE_STUBS=true`
- `voice.provider=stub`
- `avatar.provider=stub`
- `youtube.provider=stub`

That means you can exercise the pipeline without OpenAI, ElevenLabs, HeyGen, D-ID, or YouTube credentials.

## CLI commands

```bash
pnpm dev -- clients
pnpm dev -- client:add --id gaming_en_gb_stub --name "Gaming UK" --niche gaming
pnpm dev -- doctor
pnpm dev -- run --client tech_en_gb_stub
pnpm dev -- run-all
pnpm dev -- schedule
pnpm dev -- jobs --limit 10
pnpm dev -- job <jobId>
pnpm dev -- runs --client tech_en_gb_stub --limit 10
pnpm dev -- metrics --limit 50
pnpm dev -- quota --client tech_en_gb_stub
pnpm webhooks
```

## Example client profile

```json
{
  "id": "tech_en_gb_stub",
  "name": "Tech UK Stub Channel",
  "niche": "technology",
  "topics": ["ai tools", "developer productivity", "startup launches"],
  "voice": {
    "provider": "stub",
    "voiceId": "stub_voice_en_gb_tech"
  },
  "avatar": {
    "provider": "stub",
    "avatarId": "stub_avatar_tech_host"
  },
  "youtube": {
    "provider": "stub",
    "channelId": "stub_tech_channel"
  }
}
```

If `data/clients.json` is missing, the app will automatically copy `data/clients.example.json` on first run.

## Reliability features

### Quality gates

Generated scripts are validated before rendering and upload. The workflow checks:

- word-count range
- hook length
- duration cap
- CTA presence and CTA verb usage

If validation fails, `fixupScript(...)` rewrites the script so the run can continue with a compliant payload.

### Failure simulation

You can stress-test the pipeline in stub mode:

```bash
STUB_FAIL_RATE=0.4 STUB_RENDER_MS=12000 pnpm dev -- run --client tech_en_gb_stub
```

- `STUB_FAIL_RATE`: probability of stub failures
- `STUB_RENDER_MS`: simulated render duration

### Quota simulation

Stub uploads enforce a per-client daily quota and persist usage to:

```text
data/clients/<clientId>/uploads/quota_YYYY-MM-DD.json
```

Inspect quota usage with:

```bash
pnpm dev -- quota --client tech_en_gb_stub
```

### Observability

Each workflow run writes artifacts locally:

- run logs: `data/clients/<clientId>/runs/run_<runId>.json`
- metrics: `data/metrics.json`
- webhook payloads: `data/webhooks/*.json`

This makes the system easy to debug without external dashboards.

## Webhook scaffolding

Webhook endpoints are included for avatar providers:

- `POST /webhooks/heygen`
- `POST /webhooks/did`

Run the server with:

```bash
pnpm webhooks
```

If a payload includes identifiers such as `jobId`, `id`, `video_id`, or `talk_id`, the server attempts to map it back to a known local job.

## Development workflow

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm check
```

The repository also includes a GitHub Actions CI workflow that runs the full validation suite on pushes and pull requests.

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
docs/
vendor/
```

## Next extensions

Natural next steps if you want to take this beyond stub mode:

- implement real OpenAI, ElevenLabs, HeyGen, D-ID, and YouTube provider integrations
- add idempotency keys and resumable workflow execution
- persist state in SQLite or Postgres instead of JSON files
- add richer scheduling rules and backoff policies
- expose run metrics in a lightweight dashboard

## Notes

The repo currently uses local JSON persistence and stubbed providers by design. That tradeoff keeps the project easy to understand, easy to test, and safe to run on a fresh machine without cloud credentials.
