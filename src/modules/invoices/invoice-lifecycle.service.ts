// src/modules/invoices/invoice-lifecycle.service.ts


interface InvoiceLifecycleInput {
  month: number

  year: number

  status: string

  paidAt: Date | null

  closingDay: number
}

export class InvoiceLifecycleService {
  getInvoiceStatus({
    month,
    year,
    status,
    paidAt,
    closingDay,
  }: InvoiceLifecycleInput) {
    //
    // 🔥 invoice paga
    //

    if (status === 'PAID' || paidAt) {
      return 'PAID'
    }

    //
    // 🔥 data atual
    //

    const now = new Date()

    const currentMonth =
      now.getMonth() + 1

    const currentYear =
      now.getFullYear()

    //
    // 🔥 competência futura
    //

    if (
      year > currentYear ||
      (year === currentYear &&
        month > currentMonth)
    ) {
      return 'OPEN'
    }

    //
    // 🔥 competência passada
    //

    if (
      year < currentYear ||
      (year === currentYear &&
        month < currentMonth)
    ) {
      return 'CLOSED'
    }

    //
    // 🔥 mesma competência
    //

    const today =
      now.getDate()

    if (today > closingDay) {
      return 'CLOSED'
    }

    return 'OPEN'
  }
}