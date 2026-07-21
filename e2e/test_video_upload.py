"""Golden path + regression: direct video upload (#55), including the

>10MB body-size bug found and fixed at #58. src/proxy.ts (this app's
global middleware) buffers every request body it sees, capped at 10MB by
default — separately from, and in front of, serverActions.bodySizeLimit —
so any upload over 10MB (routinely hit by video, well within this app's
20MB app-side cap) got silently truncated there, never rejected with a
clear error, and the Server Action then failed parsing the now-broken
multipart body. Fixed via next.config.ts's experimental.proxyClientMaxBodySize.

Video uploads aren't content-sniffed server-side (unlike audio's
sniffAudioFormat) — only MIME type, extension, and size are checked — so an
in-memory fake buffer with an explicit "video/mp4" MIME type exercises the
same code path as a real video file without needing ffmpeg or a committed
binary fixture. Cleans up after itself since this suite runs against a
shared Preview database.
"""

from _common import admin_page, SEED_SONG_TITLE

# Comfortably over proxy.ts's 10MB default buffering cap (the actual bug),
# still under this app's 20MB app-side upload cap.
LARGE_FILE_BYTES = 14 * 1024 * 1024


def test_large_video_upload_succeeds():
    with admin_page() as page:
        page.goto("/songs")
        page.get_by_text(SEED_SONG_TITLE).first.click()
        page.wait_for_url("**/songs/**", timeout=10_000)
        page.get_by_role("link", name="Media").click()
        page.wait_for_url("**/media", timeout=10_000)

        page.get_by_role("button", name="Upload file").click()
        page.set_input_files(
            'input[type="file"]',
            files=[{"name": "large_test_video.mp4", "mimeType": "video/mp4", "buffer": b"\x00" * LARGE_FILE_BYTES}],
        )
        page.locator('input[placeholder="e.g. Soprano part, Full choir recording"]').fill(
            "E2E Large Video Upload Test"
        )
        page.get_by_role("button", name="Add Media").click()
        # An in-memory buffer (vs. a real file path) has to be base64-encoded
        # and transmitted over CDP before the upload itself even starts,
        # which is noticeably slower than a real 14MB file — generous
        # timeout to match. Polling for the actual outcome (error text or
        # the new label appearing) rather than the "Adding…" button text
        # becoming detached, which can resolve early on an unrelated
        # re-render before the upload itself has actually finished.
        page.wait_for_function(
            """() => document.body.innerText.includes('Something went wrong')
                || document.body.innerText.includes('E2E Large Video Upload Test')""",
            timeout=90_000,
        )

        try:
            assert page.get_by_text("Something went wrong").count() == 0
            assert page.get_by_text("E2E Large Video Upload Test").count() > 0
        finally:
            page.on("dialog", lambda d: d.accept())
            row = page.locator("div", has_text="E2E Large Video Upload Test").last
            row.get_by_text("Remove").click()
            page.wait_for_timeout(1000)


TESTS = [
    test_large_video_upload_succeeds,
]

if __name__ == "__main__":
    for t in TESTS:
        t()
        print(f"PASS {t.__name__}")
