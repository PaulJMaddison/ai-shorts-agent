declare module 'node-cron' {
  export interface ScheduleOptions {
    timezone?: string
  }

  export interface ScheduledTask {
    stop: () => void
  }

  export interface CronModule {
    schedule: (
      expression: string,
      func: () => void | Promise<void>,
      options?: ScheduleOptions
    ) => ScheduledTask
  }

  const cron: CronModule

  export default cron
}
