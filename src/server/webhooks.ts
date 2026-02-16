import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import Fastify, { type FastifyReply, type FastifyRequest } from '../../vendor/fastify/index.js';

import { env } from '../config/env.js';
import { jobStore } from '../storage/index.js';
import { getWebhookDir } from '../utils/paths.js';
import { logInfo } from '../utils/logger.js';

type Provider = 'heygen' | 'did';

type WebhookPayload = Record<string, unknown>;

function createWebhookFilename(provider: Provider): string {
  return `${provider}_${Date.now()}.json`;
}

function extractJobId(payload: WebhookPayload): string | undefined {
  const jobIdCandidate = payload.jobId ?? payload.id ?? payload.video_id ?? payload.talk_id;

  return typeof jobIdCandidate === 'string' && jobIdCandidate.length > 0 ? jobIdCandidate : undefined;
}

async function persistWebhookPayload(provider: Provider, payload: WebhookPayload): Promise<string> {
  const webhookDir = getWebhookDir(path.resolve(process.cwd(), env.DATA_DIR));
  const filePath = path.join(webhookDir, createWebhookFilename(provider));

  await writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');

  return filePath;
}

async function handleWebhook(provider: Provider, payload: WebhookPayload): Promise<void> {
  const persistedPath = await persistWebhookPayload(provider, payload);
  logInfo(`Saved ${provider} webhook payload to ${persistedPath}`);

  const jobId = extractJobId(payload);

  if (!jobId) {
    logInfo(`No jobId found in ${provider} webhook payload.`);
    return;
  }

  const mappedJob = await jobStore.get(jobId);

  if (mappedJob) {
    logInfo(`Webhook ${provider} job ${jobId} mapped to clientId=${mappedJob.clientId}`);
    return;
  }

  logInfo(`Webhook ${provider} job ${jobId} has no mapped client.`);
}

function isObjectPayload(payload: unknown): payload is WebhookPayload {
  return typeof payload === 'object' && payload !== null && !Array.isArray(payload);
}

function registerWebhookRoute(app: ReturnType<typeof Fastify>, provider: Provider): void {
  app.post(
    `/webhooks/${provider}`,
    async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      const payload = isObjectPayload(request.body) ? request.body : {};

      await handleWebhook(provider, payload);

      return reply.code(200).send({ ok: true });
    }
  );
}

export function buildWebhooksServer() {
  const app = Fastify();

  registerWebhookRoute(app, 'heygen');
  registerWebhookRoute(app, 'did');

  return app;
}

export async function startWebhooksServer(port: number): Promise<void> {
  const app = buildWebhooksServer();
  await app.listen({ port, host: '0.0.0.0' });
  logInfo(`Webhooks server listening on port ${port}`);
}
