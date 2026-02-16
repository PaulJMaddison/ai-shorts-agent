import { Command } from 'commander';
import { readFile } from 'node:fs/promises';

import { addClientToFile, type ScriptTone } from './clientAdd.js';
import { env } from '../config/env.js';
import { ensureDefaultClientsFile, loadClients, type ClientProfile } from '../config/clients.js';
import { createProviders } from '../providers/factory.js';
import { startWebhooksServer } from '../server/webhooks.js';
import { jobStore, metricsStore, quotaStore, runStore } from '../storage/index.js';
import { runDoctor } from '../workflows/doctor.js';

const CLIENTS_FILE = env.CLIENTS_FILE;
const SCHEDULE_INTERVAL_MS = 60_000;
const DEFAULT_JOB_LIMIT = 20;
const DEFAULT_RUN_LIMIT = 10;
const DEFAULT_METRICS_LIMIT = 50;
const RENDER_POLL_INTERVAL_MS = 1_000;
const RENDER_TIMEOUT_MS = 60_000;

type PrivacyStatus = 'public' | 'unlisted' | 'private';

interface RunOptions {
  topic?: string;
  privacy?: PrivacyStatus;
}

interface ClientAddOptions {
  id: string;
  name: string;
  niche: string;
  tone?: ScriptTone;
}

type RuntimeClient = ClientProfile & {
  displayName: string;
  language: string;
  tone: 'educational' | 'casual' | 'professional';
  topicBank: string[];
};

function toRuntimeClient(client: ClientProfile): RuntimeClient {
  return {
    ...client,
    displayName: client.name,
    language: 'en-GB',
    tone: 'educational',
    topicBank: client.topics
  };
}

function pickTopic(client: RuntimeClient, topicOverride?: string): string {
  if (topicOverride && topicOverride.trim().length > 0) {
    return topicOverride.trim();
  }

  const topics = client.topics;

  if (topics.length === 0) {
    throw new Error(`Client ${client.id} has no topics configured.`);
  }

  const randomIndex = Math.floor(Math.random() * topics.length);
  const selected = topics[randomIndex];

  if (!selected) {
    throw new Error(`Could not pick topic for client ${client.id}.`);
  }

  return selected;
}

async function waitForCompletedRender(client: RuntimeClient, jobId: string) {
  const getProvidersForClient = createProviders(env, jobStore);
  const providers = getProvidersForClient(client);
  const timeoutAt = Date.now() + RENDER_TIMEOUT_MS;

  while (Date.now() < timeoutAt) {
    const status = await providers.renderer.getStatus({ client, jobId });

    if (status.status === 'completed') {
      return status;
    }

    if (status.status === 'failed') {
      throw new Error(status.error ?? `Render job failed: ${jobId}`);
    }

    await new Promise((resolve) => {
      globalThis.setTimeout(resolve, RENDER_POLL_INTERVAL_MS);
    });
  }

  throw new Error(`Render timeout for job ${jobId}`);
}

async function runForClient(client: RuntimeClient, options: RunOptions = {}): Promise<void> {
  const topic = pickTopic(client, options.topic);
  const privacy = options.privacy ?? 'private';
  const getProvidersForClient = createProviders(env, jobStore);
  const providers = getProvidersForClient(client);

  const script = await providers.writer.writeScript({ client, topic });
  const audio = await providers.voice.synthesize({ client, script });
  const renderJob = await providers.renderer.render({ client, audio, script });

  await waitForCompletedRender(client, renderJob.id);

  const video = await providers.renderer.download({ client, jobId: renderJob.id });
  const upload = await providers.uploader.uploadShort({
    client,
    video,
    script,
    opts: {
      privacyStatus: privacy
    }
  });

  console.log(
    JSON.stringify(
      {
        clientId: client.id,
        topic,
        privacy,
        jobId: renderJob.id,
        uploadUrl: upload.url,
        provider: upload.provider
      },
      null,
      2
    )
  );
}

async function loadRuntimeClients(): Promise<RuntimeClient[]> {
  await ensureDefaultClientsFile(CLIENTS_FILE);
  const loadedClients = await loadClients(CLIENTS_FILE);
  return loadedClients.map(toRuntimeClient);
}

async function listClientsCommand(): Promise<void> {
  const clients = await loadRuntimeClients();

  if (clients.length === 0) {
    console.log('No clients found.');
    return;
  }

  const rows = clients.map((client) => ({
    id: client.id,
    displayName: client.displayName,
    niche: client.niche,
    providers: [client.voice.provider, client.avatar.provider, client.youtube.provider].join(', ')
  }));

  console.table(rows);
}

async function runCommand(clientId: string, options: RunOptions): Promise<void> {
  const clients = await loadRuntimeClients();
  const client = clients.find((entry) => entry.id === clientId);

  if (!client) {
    throw new Error(`Client not found: ${clientId}`);
  }

  await runForClient(client, options);
}

async function runAllCommand(options: Omit<RunOptions, 'topic'>): Promise<void> {
  const clients = await loadRuntimeClients();

  for (const client of clients) {
    await runForClient(client, options);
  }
}

async function scheduleCommand(options: Omit<RunOptions, 'topic'>): Promise<void> {
  const runScheduled = async () => {
    try {
      await runAllCommand(options);
    } catch (error) {
      console.error('Scheduled run failed:', error);
    }
  };

  await runScheduled();

  globalThis.setInterval(() => {
    void runScheduled();
  }, SCHEDULE_INTERVAL_MS);

  console.log(`Scheduler started (every ${Math.round(SCHEDULE_INTERVAL_MS / 1000)}s).`);
}

async function jobsCommand(options: { client?: string; limit: string }): Promise<void> {
  const parsedLimit = Number.parseInt(options.limit, 10);
  const limit = Number.isNaN(parsedLimit) ? DEFAULT_JOB_LIMIT : parsedLimit;
  const jobs = await jobStore.listRecent({ limit, clientId: options.client });

  console.table(
    jobs.map((job) => ({
      id: job.id,
      clientId: job.clientId,
      status: job.status,
      provider: job.provider,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    }))
  );
}

function parsePositiveLimit(value: string, fallback: number): number {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}

async function runsCommand(options: { client: string; limit: string }): Promise<void> {
  const limit = parsePositiveLimit(options.limit, DEFAULT_RUN_LIMIT);
  const runs = await runStore.listRuns(env.DATA_DIR, options.client, limit);

  console.table(
    runs.map((run) => ({
      runId: typeof run.runId === 'string' ? run.runId : '',
      startedAt: typeof run.startedAt === 'string' ? run.startedAt : '',
      finishedAt: typeof run.finishedAt === 'string' ? run.finishedAt : '',
      status: typeof run.status === 'string' ? run.status : '',
      topic: typeof run.topic === 'string' ? run.topic : ''
    }))
  );
}

async function metricsCommand(options: { limit: string }): Promise<void> {
  const limit = parsePositiveLimit(options.limit, DEFAULT_METRICS_LIMIT);
  const metrics = await metricsStore.readMetrics(env.DATA_DIR, limit);

  console.table(metrics);
}

type ClientQuotaConfig = {
  id: string;
  limits?: {
    maxUploadsPerDay?: number;
  };
  schedule?: {
    maxPerDay?: number;
  };
};

async function getConfiguredMaxUploadsPerDay(clientId: string): Promise<number> {
  await ensureDefaultClientsFile(CLIENTS_FILE);
  const rawClients = JSON.parse(await readFile(CLIENTS_FILE, 'utf8')) as ClientQuotaConfig[];
  const client = rawClients.find((entry) => entry.id === clientId);

  if (!client) {
    throw new Error(`Client not found: ${clientId}`);
  }

  const maxUploadsPerDay = client.limits?.maxUploadsPerDay ?? client.schedule?.maxPerDay ?? 1;

  return Number.isInteger(maxUploadsPerDay) && maxUploadsPerDay > 0 ? maxUploadsPerDay : 1;
}


async function doctorCommand(options: { client?: string }): Promise<void> {
  const result = await runDoctor({
    env,
    clientsFile: CLIENTS_FILE,
    clientId: options.client
  });

  if (result.mode === 'stubs') {
    console.log('OK (stubs mode)');
  } else {
    console.log(result.ok ? 'OK (live mode checks passed)' : 'Live mode checks failed.');

    if (result.checks.length > 0) {
      console.table(
        result.checks.map((check) => ({
          check: check.label,
          status: check.status
        }))
      );
    }
  }

  if (result.clients.length > 0) {
    console.table(
      result.clients.map((client) => ({
        clientId: client.id,
        voiceProvider: client.providers.voice,
        avatarProvider: client.providers.avatar,
        youtubeProvider: client.providers.youtube
      }))
    );
  }

  if (!result.ok) {
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }

    throw new Error('Doctor checks failed.');
  }
}

async function quotaCommand(options: { client: string }): Promise<void> {
  const todayISO = new Date().toISOString().slice(0, 10);
  const dailyCount = quotaStore.getDailyCount(env.DATA_DIR, options.client, todayISO);
  const maxUploadsPerDay = await getConfiguredMaxUploadsPerDay(options.client);

  console.table([
    {
      clientId: options.client,
      date: todayISO,
      todayCount: dailyCount,
      maxUploadsPerDay
    }
  ]);
}

async function jobCommand(jobId: string): Promise<void> {
  const job = await jobStore.get(jobId);

  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  console.log(JSON.stringify(job, null, 2));
}

async function webhooksCommand(port: string): Promise<void> {
  const parsedPort = Number.parseInt(port, 10);

  if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
    throw new Error('Invalid --port value. Expected a positive integer.');
  }

  await startWebhooksServer(parsedPort);
}

async function clientAddCommand(options: ClientAddOptions): Promise<void> {
  const allowedTones: ScriptTone[] = ['educational', 'casual', 'professional'];

  if (options.tone && !allowedTones.includes(options.tone)) {
    throw new Error('Invalid --tone value. Expected educational|casual|professional.');
  }

  const client = await addClientToFile(CLIENTS_FILE, options);

  console.log(
    JSON.stringify(
      {
        message: 'Client added.',
        id: client.id,
        name: client.name,
        niche: client.niche,
        tone: client.tone,
        topicBankSize: client.topicBank.length
      },
      null,
      2
    )
  );
}

async function main(): Promise<void> {
  const program = new Command();

  program.name('ai-shorts-agent').description('CLI for running AI shorts automation.');

  program.command('clients').description('List clients.').action(async () => {
    await listClientsCommand();
  });

  program
    .command('client:add')
    .description('Add a client profile with stub providers and starter topics.')
    .requiredOption('--id <id>', 'Client id')
    .requiredOption('--name <displayName>', 'Client display name')
    .requiredOption('--niche <niche>', 'Client niche keyword')
    .option('--tone <tone>', 'educational|casual|professional')
    .action(async (options: ClientAddOptions) => {
      await clientAddCommand(options);
    });

  program
    .command('run')
    .description('Run workflow for one client.')
    .requiredOption('--client <id>', 'Client id')
    .option('--topic <topic>', 'Optional topic override')
    .option('--privacy <privacy>', 'public|unlisted|private', 'private')
    .action(async (options: { client: string; topic?: string; privacy: PrivacyStatus }) => {
      await runCommand(options.client, {
        topic: options.topic,
        privacy: options.privacy
      });
    });

  program
    .command('run-all')
    .description('Run workflow for all clients.')
    .option('--privacy <privacy>', 'public|unlisted|private', 'private')
    .action(async (options: { privacy: PrivacyStatus }) => {
      await runAllCommand({ privacy: options.privacy });
    });

  program
    .command('schedule')
    .description('Start scheduler for all clients.')
    .option('--privacy <privacy>', 'public|unlisted|private', 'private')
    .action(async (options: { privacy: PrivacyStatus }) => {
      await scheduleCommand({ privacy: options.privacy });
    });

  program
    .command('jobs')
    .description('List recent jobs.')
    .option('--client <id>', 'Filter by client id')
    .option('--limit <number>', 'Max jobs', String(DEFAULT_JOB_LIMIT))
    .action(async (options: { client?: string; limit: string }) => {
      await jobsCommand(options);
    });

  program
    .command('runs')
    .description('List recent run logs for a client.')
    .requiredOption('--client <id>', 'Client id')
    .option('--limit <number>', 'Max runs', String(DEFAULT_RUN_LIMIT))
    .action(async (options: { client: string; limit: string }) => {
      await runsCommand(options);
    });

  program
    .command('metrics')
    .description('Show recent metrics events.')
    .option('--limit <number>', 'Max metric entries', String(DEFAULT_METRICS_LIMIT))
    .action(async (options: { limit: string }) => {
      await metricsCommand(options);
    });


  program
    .command('doctor')
    .description('Validate environment and client provider configuration.')
    .option('--client <id>', 'Validate only one client id')
    .action(async (options: { client?: string }) => {
      await doctorCommand(options);
    });

  program
    .command('quota')
    .description("Show today's upload quota usage for a client.")
    .requiredOption('--client <id>', 'Client id')
    .action(async (options: { client: string }) => {
      await quotaCommand(options);
    });

  program.command('job <jobId>').description('Get one job by id.').action(async (jobId: string) => {
    await jobCommand(jobId);
  });

  program
    .command('webhooks')
    .description('Start webhook listener server.')
    .option('--port <number>', 'Port to listen on', '8080')
    .action(async (options: { port: string }) => {
      await webhooksCommand(options.port);
    });

  await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
