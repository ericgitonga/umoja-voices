#!/usr/bin/env python3
"""Ping prod and preview Supabase projects daily so neither auto-pauses.

Supabase free-tier projects pause after ~1 week with no API activity. umoja-voices
runs two separate free-tier Supabase projects (one for Production, one for
Preview/Development deploys -- see `vercel env ls`, which shows distinct
NEXT_PUBLIC_SUPABASE_URL / ...ANON_KEY per environment). A GET against the
PostgREST root (`/rest/v1/`) makes the API introspect the schema, which is a
real DB round-trip -- enough to count as activity without touching app data or
depending on any table's RLS policy.

Credentials live in scripts/.env.keepalive.<env> (gitignored, chmod 600), populated via:
  vercel env pull --environment=production scripts/.env.keepalive.production
  vercel env pull --environment=preview scripts/.env.keepalive.preview

Note: `/rest/v1/` schema introspection rejects the anon/publishable key
("Secret API key required") -- only the secret (service-role) key is accepted,
so that's what this uses. It never touches app tables, only PostgREST's own
root/schema endpoint.

On the Preview pull, `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` resolved to
two different projects (only the latter matched SUPABASE_SECRET_KEY) -- worth
re-checking if Vercel env vars are ever re-pulled/reordered here.
"""
import sys
from pathlib import Path

import requests
from dotenv import dotenv_values

SCRIPT_DIR = Path(__file__).parent
LOG = SCRIPT_DIR / "keepalive.log"
TIMEOUT_SECONDS = 15

TARGETS = {
    "production": SCRIPT_DIR / ".env.keepalive.production",
    "preview": SCRIPT_DIR / ".env.keepalive.preview",
}


def ping(env_name, env_path):
    if not env_path.exists():
        return f"{env_name}: SKIPPED (missing {env_path.name})"

    values = dotenv_values(env_path)
    url = values.get("NEXT_PUBLIC_SUPABASE_URL") or values.get("SUPABASE_URL")
    key = values.get("SUPABASE_SECRET_KEY")
    if not url or not key:
        return f"{env_name}: SKIPPED (missing URL/secret key in {env_path.name})"

    try:
        resp = requests.get(
            f"{url.rstrip('/')}/rest/v1/",
            headers={"apikey": key},
            timeout=TIMEOUT_SECONDS,
        )
        return f"{env_name}: HTTP {resp.status_code}"
    except requests.RequestException as exc:
        return f"{env_name}: ERROR ({exc.__class__.__name__})"


def main():
    results = [ping(name, path) for name, path in TARGETS.items()]
    for line in results:
        print(line)
    if any("ERROR" in r or "SKIPPED" in r for r in results):
        sys.exit(1)


if __name__ == "__main__":
    main()
