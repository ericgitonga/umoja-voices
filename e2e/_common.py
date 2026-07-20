"""Shared helpers for the Playwright E2E smoke suite.

Written against the Python `playwright` package (already present in the `ds`
conda env, browsers pre-cached) rather than `@playwright/test`, per project
convention of using `ds` for Python tooling instead of adding a parallel npm
dev-dependency. Run each spec directly, or all of them via `run.py`:

    conda run -n ds python e2e/run.py
    conda run -n ds python e2e/test_auth.py

BASE_URL defaults to local dev; CI overrides it to point at a server booted
against the Preview/Development Supabase project (see #52) — never
production. SEED_* creds match prisma/seed.ts exactly; if that file's demo
data changes, update these too.
"""

import os
from contextlib import contextmanager

from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("BASE_URL", "http://localhost:3000").rstrip("/")

SEED_ADMIN_EMAIL = "gitonga@gmail.com"
SEED_ADMIN_PASSWORD = "admin12345"
SEED_CHORISTER_EMAIL = "demo.chorister@example.com"
SEED_CHORISTER_PASSWORD = "chorister12345"
SEED_SONG_TITLE = "Rising Together (demo song)"


@contextmanager
def browser_page():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            page = browser.new_page(base_url=BASE_URL)
            yield page
        finally:
            browser.close()


def login(page, email: str, password: str) -> None:
    page.goto("/login")
    page.get_by_label("Email").fill(email)
    page.get_by_label("Password").fill(password)
    page.get_by_role("button", name="Sign in").click()
    # The client redirects on success; a failed login re-renders /login with
    # an error message and no navigation, so waiting for the URL to change
    # away from /login is a reliable, framework-agnostic success signal.
    page.wait_for_url(lambda url: "/login" not in url, timeout=10_000)
