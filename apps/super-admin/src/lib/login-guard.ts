import type { NextRequest } from 'next/server';
import { getRequestIp } from '@/lib/request-ip';
import { isTurnstileConfigured, verifyTurnstileToken } from '@/lib/turnstile';

export const LOGIN_GUARD = {
  /** Failures 1–5: no extra step */
  TURNSTILE_AFTER_FAILURES: 6,
  /** Failure 10+: temporary lockout */
  LOCKOUT_AFTER_FAILURES: 10,
  /** Lockout duration after too many failures */
  LOCKOUT_MS: 15 * 60 * 1000,
  /** Reset failure count after idle period (helps returning users) */
  IDLE_RESET_MS: 30 * 60 * 1000,
} as const;

export type LoginGuardState = {
  failures: number;
  requiresTurnstile: boolean;
  isLocked: boolean;
  lockedUntil: number | null;
  retryAfterSeconds: number | null;
};

type GuardEntry = {
  failures: number;
  lockedUntil: number | null;
  lastAttemptAt: number;
};

const store = new Map<string, GuardEntry>();

function normalizeLogin(login: string): string {
  return login.trim().toLowerCase();
}

export function buildLoginGuardKey(request: NextRequest, login: string): string {
  const ip = getRequestIp(request);
  const id = normalizeLogin(login) || '_empty_';
  return `${ip}:${id}`;
}

function pruneExpired(entry: GuardEntry, now: number): GuardEntry {
  if (entry.lockedUntil != null && entry.lockedUntil <= now) {
    return { failures: 0, lockedUntil: null, lastAttemptAt: now };
  }

  if (
    entry.lockedUntil == null &&
    entry.failures > 0 &&
    now - entry.lastAttemptAt > LOGIN_GUARD.IDLE_RESET_MS
  ) {
    return { failures: 0, lockedUntil: null, lastAttemptAt: now };
  }

  return entry;
}

function toPublicState(entry: GuardEntry, now = Date.now()): LoginGuardState {
  const failures = entry.failures;
  const isLocked = entry.lockedUntil != null && entry.lockedUntil > now;
  const retryAfterSeconds =
    isLocked && entry.lockedUntil
      ? Math.max(1, Math.ceil((entry.lockedUntil - now) / 1000))
      : null;

  return {
    failures,
    requiresTurnstile:
      isTurnstileConfigured() &&
      (failures >= LOGIN_GUARD.TURNSTILE_AFTER_FAILURES || isLocked),
    isLocked,
    lockedUntil: isLocked ? entry.lockedUntil : null,
    retryAfterSeconds,
  };
}

export function getLoginGuardState(key: string): LoginGuardState {
  const now = Date.now();
  const existing = store.get(key);
  if (!existing) {
    return toPublicState({ failures: 0, lockedUntil: null, lastAttemptAt: now }, now);
  }

  const entry = pruneExpired(existing, now);
  store.set(key, entry);
  return toPublicState(entry, now);
}

export function recordLoginFailure(key: string): LoginGuardState {
  const now = Date.now();
  const existing = store.get(key);
  const base = existing ? pruneExpired(existing, now) : { failures: 0, lockedUntil: null, lastAttemptAt: now };

  const failures = base.failures + 1;
  let lockedUntil = base.lockedUntil;

  if (failures >= LOGIN_GUARD.LOCKOUT_AFTER_FAILURES) {
    lockedUntil = now + LOGIN_GUARD.LOCKOUT_MS;
  }

  const entry: GuardEntry = {
    failures,
    lockedUntil,
    lastAttemptAt: now,
  };
  store.set(key, entry);
  return toPublicState(entry, now);
}

export function clearLoginGuard(key: string): void {
  store.delete(key);
}

export function formatLockoutMessage(retryAfterSeconds: number | null): string {
  if (!retryAfterSeconds) {
    return 'Too many sign-in attempts. Please wait a few minutes before trying again.';
  }

  const minutes = Math.ceil(retryAfterSeconds / 60);
  if (minutes <= 1) {
    return 'Too many sign-in attempts. Please wait about a minute before trying again.';
  }

  return `Too many sign-in attempts. Please wait about ${minutes} minutes before trying again.`;
}

export async function enforceLoginGuard(
  request: NextRequest,
  login: string,
  turnstileToken?: string,
): Promise<
  | { ok: true; state: LoginGuardState }
  | { ok: false; response: { status: number; error: string; state: LoginGuardState } }
> {
  const key = buildLoginGuardKey(request, login);
  const state = getLoginGuardState(key);

  if (state.isLocked) {
    return {
      ok: false,
      response: {
        status: 429,
        error: formatLockoutMessage(state.retryAfterSeconds),
        state,
      },
    };
  }

  if (state.requiresTurnstile) {
    const ip = getRequestIp(request);
    const valid = await verifyTurnstileToken(turnstileToken, ip);
    if (!valid) {
      return {
        ok: false,
        response: {
          status: 400,
          error:
            'Please complete the quick security check below, then try signing in again.',
          state,
        },
      };
    }
  }

  return { ok: true, state };
}

export function failLoginGuard(
  request: NextRequest,
  login: string,
): { status: number; error: string; state: LoginGuardState } {
  const key = buildLoginGuardKey(request, login);
  const state = recordLoginFailure(key);

  if (state.isLocked) {
    return {
      status: 429,
      error: formatLockoutMessage(state.retryAfterSeconds),
      state,
    };
  }

  return {
    status: 401,
    error: 'Invalid credentials',
    state,
  };
}
