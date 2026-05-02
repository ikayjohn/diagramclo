export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const httpError = (statusCode: number, message: string) => new HttpError(statusCode, message);
