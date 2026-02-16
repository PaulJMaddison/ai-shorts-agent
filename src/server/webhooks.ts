import { Buffer } from 'node:buffer';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { env } from '../config/env.js';
import { getWebhookDir } from '../utils/paths.js';

type Provider = 'heygen' | 'did';

function createWebhookFilename(provider: Provider): string {
  return `${provider}_${Date.now()}.json`;
}

function getProviderFromPath(urlPath: string): Provider | null {
  if (urlPath === '/webhooks/heygen') {
    return 'heygen';
  }

  if (urlPath === '/webhooks/did') {
    return 'did';
  }

  return null;
}

function readRawBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    request.on('data', (chunk: Buffer | string) => {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    });

    request.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf-8'));
    });

    request.on('error', (error) => {
      reject(error);
    });
  });
}

async function persistWebhookPayload(provider: Provider, payload: string): Promise<string> {
  const webhookDir = getWebhookDir(path.resolve(process.cwd(), env.DATA_DIR));
  const filePath = path.join(webhookDir, createWebhookFilename(provider));

  await writeFile(filePath, payload, 'utf-8');

  return filePath;
}

export function buildWebhooksServer(): Server {
  return createServer(async (request, response) => {
    if (request.method !== 'POST' || !request.url) {
      response.writeHead(404).end();
      return;
    }

    const provider = getProviderFromPath(request.url);

    if (!provider) {
      response.writeHead(404).end();
      return;
    }

    const rawBody = await readRawBody(request);
    await persistWebhookPayload(provider, rawBody);

    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: true }));
  });
}

export async function startWebhooksServer(port: number): Promise<void> {
  const server = buildWebhooksServer();

  await new Promise<void>((resolve, reject) => {
    server.once('error', (error) => {
      reject(error);
    });

    server.listen(port, '0.0.0.0', () => {
      resolve();
    });
  });
}
