/**
 * Where it is safe to send someone after they sign in.
 *
 * An open redirect on a sign-in page is how one account becomes somebody
 * else's: a link to `/auth?next=https://evil.example/workspace` sends a
 * freshly-authenticated person to an attacker's page that looks like the
 * product and asks them to "confirm" something.
 *
 * So this is a positive enumeration, not a blocklist. The result has to *equal*
 * or sit beneath something known — a spelling trick cannot defeat that, because
 * failing to look wrong is not the same as matching.
 */

/** The canonical Opportunity X tree. Everything else falls back. */
const CAPTURABLE = ["/workspace"] as const;

export const AUTH_LANDING_PATH = "/workspace";

export function safeRedirectPath(
  path: string | null | undefined,
  fallback: string = AUTH_LANDING_PATH
): string {
  if (!path) return fallback;

  /*
    A scheme, a host, or a protocol-relative prefix means this is not a path on
    this origin, whatever it looks like. Checked before parsing, because a
    parser given "//evil.example" resolves it to a different host silently.
  */
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return fallback;
  }

  /* An embedded credential or scheme inside the path is never a real path. */
  if (/[a-z][a-z0-9+.-]*:/i.test(path.split("?")[0])) return fallback;

  const pathname = path.split("?")[0].split("#")[0];

  const allowed = CAPTURABLE.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  return allowed ? path : fallback;
}
