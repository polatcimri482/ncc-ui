import { parseApiError } from "./api-response";

export async function apiRequest<T>(
  url: string,
  options: RequestInit & { json?: unknown }
): Promise<T> {
  const { json, ...init } = options;
  const body = json !== undefined ? JSON.stringify(json) : init.body;
  const headers = new Headers(init.headers);
  if (json !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, { ...init, body, headers });
  const text = await res.text();
  if (!res.ok) {
    let parsed: unknown = {};
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      // non-JSON error body
    }
    throw new Error(parseApiError(res, parsed));
  }
  try {
    return (text ? JSON.parse(text) : undefined) as T;
  } catch {
    throw new Error(`Failed to parse API response: ${text?.slice(0, 100)}`);
  }
}

export function apiUrl(path: string, apiBase: string): string {
  const base = apiBase.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}
