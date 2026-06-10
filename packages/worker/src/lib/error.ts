export class AppError extends Error {
  constructor(
    public statusCode: number,
    i18nKey: string,
    public details?: Record<string, unknown>,
  ) {
    super(i18nKey)
    this.name = "AppError"
  }
}
