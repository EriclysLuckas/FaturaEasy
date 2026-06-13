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