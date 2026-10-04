export class ArenaError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = "ArenaError";
    this.code = code;
    this.status = status;
  }
}

export function isArenaError(error: unknown): error is ArenaError {
  return error instanceof ArenaError;
}
