// src/jobs/scheduler.ts

import cron from 'node-cron'

import { runInvoiceCloseJob }
  from './invoice-close.job.js'

export function startScheduler() {
  //
  //  roda todos os dias meia-noite
  //

  cron.schedule(
    '0 0 * * *',
    async () => {
      await runInvoiceCloseJob()
    },

    {
      timezone:
        'America/Sao_Paulo',
    }
  )

  console.log(
    '⏰ Scheduler started'
  )
}