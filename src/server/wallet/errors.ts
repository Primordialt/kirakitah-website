export class WalletError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = "WalletError";
    this.code = code;
    this.status = status;
  }
}

export function isWalletError(error: unknown): error is WalletError {
  return error instanceof WalletError;
}
