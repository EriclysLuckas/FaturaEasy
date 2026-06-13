import { AppError }
  from './app-error.js'

export class ValidationError
  extends AppError {

  constructor(
    details: Record<
      string,
      string[]
    >
  ) {
    super(
      'Validation error',
      422,
      'VALIDATION_ERROR',
      details
    )
  }
}