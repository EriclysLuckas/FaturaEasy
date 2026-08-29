import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { InvoiceLifecycleService } from './invoice-lifecycle.service.js'

describe('InvoiceLifecycleService', () => {
  let service: InvoiceLifecycleService

  beforeEach(() => {
    service = new InvoiceLifecycleService()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ---------------------------------------------------------------------
  // Caso base: PAID tem prioridade sobre qualquer data
  // ---------------------------------------------------------------------

  it('Deve retornar PAID quando a fatura tiver paidAt', () => {
    const status = service.getInvoiceStatus({
      month: 7,
      year: 2026,
      status: 'PAID',
      paidAt: new Date(),
      closingDay: 10,
    })

    expect(status).toBe('PAID')
  })

  // ---------------------------------------------------------------------
  // OPEN: antes do dia de fechamento do mês/ano de competência
  // ---------------------------------------------------------------------

  it('Deve retornar OPEN quando a data atual for anterior ao dia de fechamento da competência', () => {
    // Fatura de competência 07/2026, fecha dia 10. "Hoje" é dia 5 -> ainda aberta.
    vi.setSystemTime(new Date('2026-07-05T12:00:00'))

    const status = service.getInvoiceStatus({
      month: 7,
      year: 2026,
      status: 'OPEN',
      paidAt: null,
      closingDay: 10,
    })

    expect(status).toBe('OPEN')
  })

  // ---------------------------------------------------------------------
  // CLOSED: depois do dia de fechamento, mas ainda sem pagamento
  // ---------------------------------------------------------------------

  it('Deve retornar CLOSED quando a data atual for posterior ao dia de fechamento e não houver pagamento', () => {
    // Mesma fatura, mas "hoje" já é dia 15 -> fatura fechada, aguardando pagamento.
    vi.setSystemTime(new Date('2026-07-15T12:00:00'))

    const status = service.getInvoiceStatus({
      month: 7,
      year: 2026,
      status: 'OPEN', // ainda não atualizado no banco, mas a data já indica fechamento
      paidAt: null,
      closingDay: 10,
    })

    expect(status).toBe('CLOSED')
  })

  // ---------------------------------------------------------------------
  // Linha do tempo completa: OPEN -> CLOSED -> PAID
  // ---------------------------------------------------------------------

  it('Deve respeitar a linha do tempo completa: OPEN -> CLOSED -> PAID', () => {
    const invoice = {
      month: 7,
      year: 2026,
      status: 'OPEN' as const,
      paidAt: null as Date | null,
      closingDay: 10,
    }

    // 1) Antes do fechamento -> OPEN
    vi.setSystemTime(new Date('2026-07-03T09:00:00'))
    expect(service.getInvoiceStatus(invoice)).toBe('OPEN')

    // 2) Avança o relógio para depois do fechamento, sem pagamento -> CLOSED
    vi.setSystemTime(new Date('2026-07-12T09:00:00'))
    expect(service.getInvoiceStatus(invoice)).toBe('CLOSED')

    // 3) Simula o pagamento acontecendo -> PAID, independentemente da data atual
    vi.setSystemTime(new Date('2026-07-20T09:00:00'))
    const paidInvoice = { ...invoice, paidAt: new Date('2026-07-20T09:00:00') }
    expect(service.getInvoiceStatus(paidInvoice)).toBe('PAID')
  })

  // ---------------------------------------------------------------------
  // Rollover: fatura de dezembro cruzando para janeiro do ano seguinte
  // ---------------------------------------------------------------------

  it('Deve avaliar corretamente o fechamento de uma fatura de dezembro quando "hoje" já é janeiro do ano seguinte', () => {
    // Fatura de competência 12/2026, fecha dia 10. "Hoje" é 2027-01-02 -> já passou do fechamento.
    vi.setSystemTime(new Date('2027-01-02T09:00:00'))

    const status = service.getInvoiceStatus({
      month: 12,
      year: 2026,
      status: 'OPEN',
      paidAt: null,
      closingDay: 10,
    })

    expect(status).toBe('CLOSED')
  })
})