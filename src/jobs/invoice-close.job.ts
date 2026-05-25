// src/jobs/invoice-close.job.ts

import { InvoiceCloseService }  from '../modules/invoices/invoice-close.service.js'

const invoiceCloseService =
  new InvoiceCloseService()

export async function runInvoiceCloseJob() {
  try {
    console.log(
      ' Running invoice close job...'
    )

    await invoiceCloseService.autoCloseInvoices()

    console.log(
      ' Invoice close job finished'
    )
  } catch (error) {
    console.error(
      ' Invoice close job failed',
      error
    )
  }
}