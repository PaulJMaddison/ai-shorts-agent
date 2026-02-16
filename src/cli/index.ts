import { Command } from 'commander';

import { env } from '../config/env.js';
import { loadClients, type ClientProfile } from '../config/clients.js';
import { createProviders } from '../providers/factory.js';
import { jobStore } from '../storage/index.js';

const CLIENTS_FILE = env.CLIENTS_FILE;
const SCHEDULE_INTERVAL_MS = 60_000;
const DEFAULT_JOB_LIMIT = 20;
const RENDER_POLL_INTERVAL_MS = 1_000;
const RENDER_TIMEOUT_MS = 60_000;

type PrivacyStatus = 'public' | 'unlisted' | 'private';

interface RunOptions {
  topic?: string;
  privacy?: PrivacyStatus;
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

async function jobCommand(jobId: string): Promise<void> {
  const job = await jobStore.get(jobId);

  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  console.log(JSON.stringify(job, null, 2));
}

async function main(): Promise<void> {
  const program = new Command();

  program.name('ai-shorts-agent').description('CLI for running AI shorts automation.');

  program.command('clients').description('List clients.').action(async () => {
    await listClientsCommand();
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

  program.command('job <jobId>').description('Get one job by id.').action(async (jobId: string) => {
    await jobCommand(jobId);
  });

  await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
