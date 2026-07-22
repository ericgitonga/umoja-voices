"""Golden path: richer account profile (#73) — flat view by default, an
Edit button reveals the form (bio/voice/instrument/phone + photo), Save
returns to the flat view, Cancel discards unsaved changes.

This test edits the seed admin's OWN profile (there's no throwaway target
the way other specs create a throwaway song/section) -- so it restores
every field back to its original (blank) state in a `finally` block,
matching this suite's established convention of cleaning up after itself
since it runs against a shared Preview database. Password reset is
untouched here (already covered implicitly by not exercising it) -- #73
explicitly didn't change that flow.

Photo upload uses a small fake file with a real .jpg extension (profile
photos aren't content-sniffed server-side, matching test_video_upload.py's
own reasoning for its fake .mp4). Written to a real temp file rather than
an in-memory buffer for the same CDP-transfer-overhead reason documented
there.
"""

import os
import tempfile
import time

from _common import admin_page

MARKER_BIO = "E2E test bio — temporary, restored after this spec runs."
MARKER_INSTRUMENT = "E2E Test Piano"
MARKER_PHONE = "+254700000000"
MARKER_VOICE = "T"


def _enter_edit_mode(page):
    edit_button = page.get_by_role("button", name="Edit")
    if edit_button.count() > 0:
        edit_button.click()


def _fill_and_save(page, bio, voice_value, instrument, phone):
    _enter_edit_mode(page)
    page.get_by_label("Bio").fill(bio)
    page.get_by_label("Voice").select_option(voice_value)
    page.get_by_label("Instrument").fill(instrument)
    page.get_by_label("Phone").fill(phone)
    page.get_by_role("button", name="Save").click()
    page.wait_for_timeout(1000)


def _wait_for_photo(page, timeout_s=15, interval_s=0.5):
    deadline = time.monotonic() + timeout_s
    photo_img = page.locator('[data-testid="profile-photo"]')
    status = page.locator('[data-testid="profile-status"]')
    while time.monotonic() < deadline:
        if photo_img.count() > 0:
            return
        if status.count() > 0:
            text = status.first.inner_text()
            if text and text != "Saved.":
                raise AssertionError(f"Photo upload failed: {text}")
        page.wait_for_timeout(int(interval_s * 1000))
    raise TimeoutError(f"Photo did not appear within {timeout_s}s")


def test_profile_view_edit_toggle_fields_and_photo():
    with admin_page() as page:
        page.set_default_timeout(8_000)
        page.goto("/profile")

        try:
            # Flat view by default, no form fields visible.
            assert page.get_by_role("button", name="Edit").count() == 1
            assert page.get_by_label("Bio").count() == 0
            assert page.locator('[data-testid="profile-photo-placeholder"]').count() == 1

            # Cancel discards an unsaved edit and returns to the flat view.
            page.get_by_role("button", name="Edit").click()
            page.get_by_label("Bio").fill("this edit should be discarded")
            page.get_by_role("button", name="Cancel").click()
            assert page.get_by_role("button", name="Edit").count() == 1
            assert page.get_by_text("this edit should be discarded").count() == 0

            # Save persists and returns to the flat view showing the new values.
            _fill_and_save(page, MARKER_BIO, MARKER_VOICE, MARKER_INSTRUMENT, MARKER_PHONE)
            assert page.get_by_role("button", name="Edit").count() == 1
            assert page.get_by_text(MARKER_BIO).count() > 0
            assert page.get_by_text(MARKER_INSTRUMENT).count() > 0
            assert page.get_by_text(MARKER_PHONE).count() > 0

            # A fresh page load persists the same values, both in the flat
            # view and pre-filled once Edit is reopened.
            page.goto("/profile")
            assert page.get_by_text(MARKER_BIO).count() > 0
            page.get_by_role("button", name="Edit").click()
            assert page.get_by_label("Bio").input_value() == MARKER_BIO
            assert page.get_by_label("Voice").input_value() == MARKER_VOICE
            assert page.get_by_label("Instrument").input_value() == MARKER_INSTRUMENT
            assert page.get_by_label("Phone").input_value() == MARKER_PHONE

            # Photo upload/removal (only available in edit mode, already open).
            assert page.locator('[data-testid="profile-photo-placeholder"]').count() == 1
            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
                f.write(b"\x00" * 1024)
                photo_path = f.name
            try:
                page.set_input_files('input[type="file"]', photo_path)
                _wait_for_photo(page)
                assert page.locator('[data-testid="profile-photo"]').count() == 1
                assert page.locator('[data-testid="profile-photo-placeholder"]').count() == 0
            finally:
                os.unlink(photo_path)

            page.get_by_role("button", name="Remove photo").click()
            page.wait_for_timeout(1500)
            assert page.locator('[data-testid="profile-photo-placeholder"]').count() == 1
            assert page.locator('[data-testid="profile-photo"]').count() == 0
        finally:
            _fill_and_save(page, "", "", "", "")


TESTS = [
    test_profile_view_edit_toggle_fields_and_photo,
]

if __name__ == "__main__":
    for t in TESTS:
        t()
        print(f"PASS {t.__name__}")
