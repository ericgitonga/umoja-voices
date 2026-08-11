"""Regression test for the RLS incident (#52/#142): asserts that Supabase's
anon/publishable key — the same credential any visitor's browser holds, and
the exact path a leaked/misconfigured RLS policy would expose — cannot read
or write real data through the auto-generated PostgREST REST API.

This app's own code never goes through this path (Prisma, over a direct
Postgres connection with a privileged role, is the sole access path — see
prisma/migrations/20260729074115_enable_rls_on_all_tables/migration.sql) and
so is not itself exercised here. What this guards is Postgres's own access
control: RLS is enabled with zero permissive policies on every table, so
anon-key access should always come back empty (reads) or rejected (writes)
regardless of what the app's own code does or doesn't query. The prior
incident was exactly this layer being left open — app-level route tests (see
test_auth.py) check something else entirely (Next.js middleware gating), and
would stay green through a recurrence of that incident.

Talks to Supabase's REST API directly via `requests` — no Playwright/browser
needed for this one. Reads NEXT_PUBLIC_SUPABASE_URL and
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY from the environment (falls back to
parsing .env.local directly, matching how the CI workflow already pulls that
file via `vercel env pull` before the Python e2e step runs).
"""

import os

import requests
from dotenv import dotenv_values

# A row seeded by prisma/seed.ts (see SEED_SONG_TITLE in _common.py) — real
# data that must exist in the table, so an anon-key SELECT coming back empty
# is a genuine RLS denial and not just an artifact of an empty table.
SEEDED_SONG_TITLE = "Rising Together (demo song)"


def _supabase_env():
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
    if url and key:
        return url, key
    # CI's e2e workflow pulls Preview env vars into .env.local via
    # `vercel env pull` before running this suite; that file is never
    # exported into the shell environment for the Python process, so parse
    # it directly rather than requiring a separate `source` step.
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
    values = dotenv_values(env_path)
    url = url or values.get("NEXT_PUBLIC_SUPABASE_URL")
    key = key or values.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
    if not url or not key:
        raise RuntimeError(
            "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not found in "
            "the environment or .env.local — can't run the RLS regression test."
        )
    return url, key


def _anon_headers(key):
    # PostgREST requires both: `apikey` identifies the caller to Supabase's
    # gateway, `Authorization: Bearer` is what Postgres's RLS policies (and
    # the lack thereof) actually evaluate against.
    return {"apikey": key, "Authorization": f"Bearer {key}"}


def _assert_read_denied(resp, table):
    """Denial can come from either of two independent layers, and this test
    should catch a regression in *either* one: no GRANT to the `anon` role
    at all (PostgREST -> 401/403 "permission denied", confirmed as this
    project's actual current behavior for every table), or a GRANT with RLS
    enabled and no permissive policy (Postgres silently filters every row,
    so PostgREST -> 200 with an empty body instead of an error). A 200 with
    real rows in it is the one outcome that means access genuinely leaked."""
    if resp.status_code == 200:
        assert resp.json() == [], (
            f"anon key could read real {table} row(s) through the REST API — "
            "RLS is not denying access (the exact prior incident)"
        )
    else:
        assert resp.status_code in (401, 403), (
            f"expected {table} read to be denied (200-empty, or 401/403), got "
            f"{resp.status_code}: {resp.text[:300]}"
        )


def test_anon_key_cannot_read_songs_via_rest_api():
    url, key = _supabase_env()
    resp = requests.get(
        f"{url}/rest/v1/Song",
        headers=_anon_headers(key),
        params={"select": "title"},
        timeout=15,
    )
    _assert_read_denied(resp, "Song")
    if resp.status_code == 200:
        titles = [r.get("title") for r in resp.json()]
        assert SEEDED_SONG_TITLE not in titles


def test_anon_key_cannot_read_users_via_rest_api():
    url, key = _supabase_env()
    resp = requests.get(
        f"{url}/rest/v1/User",
        headers=_anon_headers(key),
        params={"select": "id"},
        timeout=15,
    )
    _assert_read_denied(resp, "User")


def test_anon_key_cannot_insert_a_song_via_rest_api():
    url, key = _supabase_env()
    resp = requests.post(
        f"{url}/rest/v1/Song",
        headers={**_anon_headers(key), "Content-Type": "application/json"},
        json={"title": "RLS regression test — should never be written"},
        timeout=15,
    )
    # A write with no permissive policy is a real, explicit denial (unlike a
    # SELECT, which just returns nothing) — PostgREST maps it to 401/403.
    assert resp.status_code in (401, 403), (
        f"expected the anon key's INSERT to be rejected (401/403), got {resp.status_code}: "
        f"{resp.text[:300]} — RLS is not denying writes (the exact prior incident)"
    )


TESTS = [
    test_anon_key_cannot_read_songs_via_rest_api,
    test_anon_key_cannot_read_users_via_rest_api,
    test_anon_key_cannot_insert_a_song_via_rest_api,
]

if __name__ == "__main__":
    for t in TESTS:
        t()
        print(f"PASS {t.__name__}")
