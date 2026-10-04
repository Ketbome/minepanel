export class RateLimitedError extends Error {
  constructor(readonly retryAfterSeconds: unknown) { super('Provider rate limited (HTTP 429)'); }
}

export function deliveryFailureReason(error: unknown): string {
  if (error instanceof RateLimitedError) return error.message;
  const message = error instanceof Error ? error.message : '';
  const known = ['Email notification is not configured', 'Email delivery is not configured', 'Telegram notification is not configured', 'Discord webhook is not configured', 'ntfy notification is not configured', 'Slack notification is not configured'];
  if (known.includes(message) || /^(Telegram|ntfy|Slack) notification rejected \(HTTP \d{3}\)$/.test(message) || /^Discord webhook returned status \d{3}$/.test(message)) return message;
  const code = (error as { code?: string })?.code;
  if (code && ['EAUTH', 'ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'ECONNREFUSED', 'ENOTFOUND', 'EENVELOPE'].includes(code)) return `SMTP failure (${code})`;
  if (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)) return 'Request timed out';
  return 'Provider request failed';
}

// Retry only an explicit rate-limit rejection, once, within one total deadline.
// A timeout may have created a message already, so it must never be retried.
export async function withRateLimitRetry(send: (signal: AbortSignal) => Promise<void>): Promise<void> {
  const deadline = Date.now() + 12_000;
  for (let attempt = 0; ; attempt++) {
    try { return await send(AbortSignal.timeout(Math.max(1, Math.min(10_000, deadline - Date.now())))); }
    catch (error) {
      const value = error instanceof RateLimitedError ? error.retryAfterSeconds : undefined;
      const seconds = typeof value === 'number' ? value : typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : NaN;
      const delay = seconds * 1000;
      if (attempt !== 0 || !Number.isFinite(delay) || delay < 0 || delay > 2000 || Date.now() + delay >= deadline) throw error;
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
      if (Date.now() >= deadline) throw error;
    }
  }
}
