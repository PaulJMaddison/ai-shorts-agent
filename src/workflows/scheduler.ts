import cron from 'node-cron'

import type { Providers } from '../core/interfaces.js'
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

interface StartSchedulerInput<TClient extends SchedulerClient> {
  clients: TClient[]
  getProvidersForClient: (client: TClient) => Providers
  jobStore: unknown
}

type ScheduledRunContext<TClient extends SchedulerClient> = {
  clients: TClient[]
  getProvidersForClient: (client: TClient) => Providers
  jobStore: unknown
}

let runAllNowImpl: (() => Promise<void>) | undefined

async function runClient<TClient extends SchedulerClient>(
  client: TClient,
  getProvidersForClient: (value: TClient) => Providers,
  _jobStore: unknown
): Promise<void> {
  logInfo(`scheduler start client=${client.id}`)

  try {
    getProvidersForClient(client)

    const runsToExecute = Math.min(Math.max(client.schedule.maxPerDay, 0), 1)

    for (let runIndex = 0; runIndex < runsToExecute; runIndex += 1) {
      logInfo(`scheduler run ${runIndex + 1}/${runsToExecute} client=${client.id}`)
    }

    logInfo(`scheduler end client=${client.id}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    console.error(`[error] scheduler client=${client.id} ${message}`)
  }
}

async function runAll<TClient extends SchedulerClient>(context: ScheduledRunContext<TClient>): Promise<void> {
  for (const client of context.clients) {
    await runClient(client, context.getProvidersForClient, context.jobStore)
  }
}

export function startScheduler<TClient extends SchedulerClient>({
  clients,
  getProvidersForClient,
  jobStore
}: StartSchedulerInput<TClient>): { stop: () => void } {
  const tasks = clients.map((client) =>
    cron.schedule(
      client.schedule.runDailyAt,
      async () => {
        await runClient(client, getProvidersForClient, jobStore)
      },
      {
        timezone: client.schedule.timezone
      }
    )
  )

  runAllNowImpl = async () => {
    await runAll({ clients, getProvidersForClient, jobStore })
  }

  return {
    stop: () => {
      for (const task of tasks) {
        task.stop()
      }
    }
  }
}

export async function runAllNow(): Promise<void> {
  if (!runAllNowImpl) {
    throw new Error('Scheduler has not been started. Call startScheduler first.')
  }

  await runAllNowImpl()
}
