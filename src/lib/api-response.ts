/** Matches backend error response shape */
export interface ApiErrorBody {
  error: string;
}

export function parseApiError(res: Response, body: unknown): string {
  const err = body as ApiErrorBody;
  return err?.error ?? `Request failed: ${res.status}`;
}
