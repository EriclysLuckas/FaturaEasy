import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vitest'

import {
  InvoiceLifecycleService,
} from './invoice-lifecycle.service.js'

describe('InvoiceLifecycleService', () => {
  let service: InvoiceLifecycleService

  beforeEach(() => {
    service =
      new InvoiceLifecycleService()

    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ---------------------------------------------------------------------
  // PAID
  // ---------------------------------------------------------------------

  it('Deve retornar PAID quando a fatura tiver paidAt', () => {
    const status =
      service.getInvoiceStatus({
        month: 7,
        year: 2026,
        status: 'PAID',
        paidAt: new Date(),
        closingDay: 10,
      })

    expect(status).toBe('PAID')
  })

  // ---------------------------------------------------------------------
  // OPEN
  // ---------------------------------------------------------------------

  it('Deve retornar OPEN quando a data atual for anterior ao dia de fechamento da competência', () => {
    vi.setSystemTime(
      new Date(
        '2026-07-09T23:59:59'
      )
    )

    const status =
      service.getInvoiceStatus({
        month: 7,
        year: 2026,
        status: 'OPEN',
        paidAt: null,
        closingDay: 10,
      })

    expect(status).toBe('OPEN')
  })

  // ---------------------------------------------------------------------
  // CLOSED — exatamente no closingDay
  // ---------------------------------------------------------------------

  it('Deve retornar CLOSED exatamente no dia de fechamento da competência', () => {
    vi.setSystemTime(
      new Date(
        '2026-07-10T00:00:00'
      )
    )

    const status =
      service.getInvoiceStatus({
        month: 7,
        year: 2026,
        status: 'OPEN',
        paidAt: null,
        closingDay: 10,
      })

    expect(status).toBe('CLOSED')
  })

  // ---------------------------------------------------------------------
  // CLOSED — depois do fechamento
  // ---------------------------------------------------------------------

  it('Deve retornar CLOSED quando a data atual for posterior ao dia de fechamento e não houver pagamento', () => {
    vi.setSystemTime(
      new Date(
        '2026-07-15T12:00:00'
      )
    )

    const status =
      service.getInvoiceStatus({
        month: 7,
        year: 2026,
        status: 'OPEN',
        paidAt: null,
        closingDay: 10,
      })

    expect(status).toBe('CLOSED')
  })

  // ---------------------------------------------------------------------
  // Linha do tempo completa
  // ---------------------------------------------------------------------

  it('Deve respeitar a linha do tempo completa: OPEN -> CLOSED -> PAID', () => {
    const invoice = {
      month: 7,
      year: 2026,
      status: 'OPEN' as const,
      paidAt: null as Date | null,
      closingDay: 10,
    }

    // Antes do fechamento
    vi.setSystemTime(
      new Date(
        '2026-07-09T23:59:59'
      )
    )

    expect(
      service.getInvoiceStatus(invoice)
    ).toBe('OPEN')

    // Exatamente no fechamento
    vi.setSystemTime(
      new Date(
        '2026-07-10T00:00:00'
      )
    )

    expect(
      service.getInvoiceStatus(invoice)
    ).toBe('CLOSED')

    // Depois do fechamento
    vi.setSystemTime(
      new Date(
        '2026-07-12T09:00:00'
      )
    )

    expect(
      service.getInvoiceStatus(invoice)
    ).toBe('CLOSED')

    // Pagamento
    vi.setSystemTime(
      new Date(
        '2026-07-20T09:00:00'
      )
    )

    const paidInvoice = {
      ...invoice,
      paidAt:
        new Date(
          '2026-07-20T09:00:00'
        ),
    }

    expect(
      service.getInvoiceStatus(
        paidInvoice
      )
    ).toBe('PAID')
  })

  // ---------------------------------------------------------------------
  // Rollover
  // ---------------------------------------------------------------------

  it('Deve avaliar corretamente o fechamento de uma fatura de dezembro quando "hoje" já é janeiro do ano seguinte', () => {
    vi.setSystemTime(
      new Date(
        '2027-01-02T09:00:00'
      )
    )

    const status =
      service.getInvoiceStatus({
        month: 12,
        year: 2026,
        status: 'OPEN',
        paidAt: null,
        closingDay: 10,
      })

    expect(status).toBe('CLOSED')
  })
})