import type { ErrorCode } from "./types";

/** An error that is safe to show to the user as-is. */
export class BriefError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public suggestions?: string[],
  ) {
    super(message);
  }
}

export function requireEnv(name: string, service: string): string {
  const value = process.env[name];
  if (!value) {
    throw new BriefError(
      "missing_config",
      `${service} isn't configured on the server (${name} is missing). Add it in the Vercel project settings and redeploy.`,
    );
  }
  return value;
}

/** Turns HTTP/SDK errors into a friendly BriefError, keeping known ones as they are. */
export function toBriefError(err: unknown, service: string): BriefError {
  if (err instanceof BriefError) return err;
  const message = err instanceof Error ? err.message : String(err);
  const status = (err as { status?: number })?.status;
  console.error(`[${service}] ${status ?? ""} ${message.slice(0, 500)}`);
  if (status === 429 || /429|rate limit|quota|RESOURCE_EXHAUSTED/i.test(message)) {
    return new BriefError("rate_limited", `${service} is rate limiting us right now. Wait a minute and try again.`);
  }
  if (status === 401 || status === 403 || /API key not valid|unauthori[sz]ed|PERMISSION_DENIED/i.test(message)) {
    return new BriefError("missing_config", `${service} rejected the API key. Check it in the Vercel project settings.`);
  }
  if (err instanceof Error && err.name === "AbortError") {
    return new BriefError("upstream", `${service} took too long to respond.`);
  }
  return new BriefError("upstream", `${service} failed: ${message.slice(0, 200)}`);
}

/** Races a promise against a timeout; the abort signal lets fetch calls stop early. */
export async function withTimeout<T>(ms: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}
