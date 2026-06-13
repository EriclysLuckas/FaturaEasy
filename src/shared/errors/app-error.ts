export abstract class AppError
  extends Error {

  public readonly statusCode: number

  public readonly code: string

  public readonly details?: Record<
    string,
    string[]
  >

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: Record<
      string,
      string[]
    >
  ) {
    super(message)

    this.statusCode =
      statusCode

    this.code =
      code

    this.details =
      details
  }
}