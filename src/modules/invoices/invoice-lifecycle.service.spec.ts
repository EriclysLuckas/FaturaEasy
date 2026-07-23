import {describe, it, expect, vi} from 'vitest';
import {InvoiceLifecycleService} from './invoice-lifecycle.service.js';



describe('InvoiceLifecycleService', () => {
  it('Deve retornar PAID quando a fatura tiver paidAt', () => {

    //ARRANGE
    const service = new InvoiceLifecycleService();

    //ACT

    const status = service.getInvoiceStatus({

        month: 7,
        year: 2026,
        status: 'PAID',
        paidAt: new Date(),
        closingDay: 10,
    })
   //ASSERT
   expect(status).toBe('PAID');
  })
    });