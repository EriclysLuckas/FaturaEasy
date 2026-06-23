import { AppError }
  from './app-error.js'

export class InvoiceClosedError
  extends AppError {
  constructor(
    message = 'Invoice is closed'
  ) {
    super(
      message,
      409,
      'INVOICE_CLOSED'
    )
  }
}

export class LimitExceededError
  extends AppError {
  constructor(
    message = 'Limit exceeded'
  ) {
    super(
      message,
      409,
      'LIMIT_EXCEEDED'
    )
  }
}

export class InvoicePaidError
  extends AppError {
  constructor(
    message = 'Invoice already paid'
  ) {
    super(
      message,
      409,
      'INVOICE_PAID'
    )
  }
}

// Erro para quando o usuário tenta pagar uma fatura que ainda está aberta
export class InvoiceNotClosedError
  extends AppError {
  constructor(
    message = 'Invoice must be CLOSED before payment'
  ) {
    super(
      message,
      400,
      'INVOICE_NOT_CLOSED'
    )
  }
}

// Erro para quando a fatura consta como fechada, mas não há parcelas (inconsistência)
export class NoPendingInstallmentsError
  extends AppError {
  constructor(
    message = 'No pending installments found for this invoice'
  ) {
    super(
      message,
      400,
      'NO_PENDING_INSTALLMENTS'
    )
  }
}