/**
 * Debug logger for bank verification UI. Only logs when debug is enabled.
 * Use for development and troubleshooting; no-op in production when debug=false.
 */
export function debugLog(
  enabled: boolean,
  message: string,
  data?: Record<string, unknown>
): void {
  if (!enabled) return;
  const prefix = "[bank-verification-ui]";
  if (data && Object.keys(data).length > 0) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }
}
