import cron from 'node-cron'

import { env } from '../config/env.js'
import type { Providers } from '../core/interfaces.js'
import { appendMetric } from '../storage/metricsStore.js'
import { logInfo } from '../utils/logger.js'

interface ClientSchedule {
  runDailyAt: string
  timezone: string
  maxPerDay: number
}

export interface SchedulerClient {
  id: string
  schedule: ClientSchedule
}

interface SchedulerRunInput<TClient extends SchedulerClient> {
  clients: TClient[]
  getProvidersForClient: (client: TClient) => Providers
  jobStore: unknown
}

interface RunAllNowOptions {
  dataDir?: string
}

const runningLocks = new Map<string, boolean>()

async function appendWarningMetric(clientId: string, event: 'scheduler_skipped_locked' | 'scheduler_skipped_quota', dataDir?: string): Promise<void> {
  try {
    await appendMetric(dataDir ?? env.DATA_DIR, {
      event,
      timestamp: new Date().toISOString(),
      clientId
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[warn] scheduler metric_failed client=${clientId} event=${event} error=${message}`)
  }
}

async function runClient<TClient extends SchedulerClient>(
  client: TClient,
  getProvidersForClient: (value: TClient) => Providers,
  _jobStore: unknown,
  opts?: RunAllNowOptions
): Promise<void> {
  if (runningLocks.get(client.id)) {
    console.warn(`[warn] scheduler skipped client=${client.id} reason=already_running`)
    await appendWarningMetric(client.id, 'scheduler_skipped_locked', opts?.dataDir)
    return
  }

  if (client.schedule.maxPerDay <= 0) {
    console.warn(`[warn] scheduler skipped client=${client.id} reason=quota_exhausted maxPerDay=${client.schedule.maxPerDay}`)
    await appendWarningMetric(client.id, 'scheduler_skipped_quota', opts?.dataDir)
    return
  }

  runningLocks.set(client.id, true)
  logInfo(`scheduler start client=${client.id}`)

  try {
    getProvidersForClient(client)
    logInfo(`scheduler run 1/1 client=${client.id}`)
    logInfo(`scheduler end client=${client.id}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    console.error(`[error] scheduler client=${client.id} ${message}`)
  } finally {
    runningLocks.set(client.id, false)
  }
}

export async function runAllNow<TClient extends SchedulerClient>(
  input: SchedulerRunInput<TClient>,
  opts?: RunAllNowOptions
): Promise<void> {
  for (const client of input.clients) {
    await runClient(client, input.getProvidersForClient, input.jobStore, opts)
  }
}

export function startScheduler<TClient extends SchedulerClient>(input: SchedulerRunInput<TClient>): { stop: () => void } {
  const tasks = input.clients.map((client) =>
    cron.schedule(
      client.schedule.runDailyAt,
      async () => {
        await runClient(client, input.getProvidersForClient, input.jobStore)
      },
      {
        timezone: client.schedule.timezone
      }
    )
  )

  return {
    stop: () => {
      for (const task of tasks) {
        task.stop()
      }
    }
  }
}
