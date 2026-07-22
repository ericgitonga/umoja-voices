"""Golden path: starting one <audio> item pauses another (#41).

Adds two temporary audio media items to the seeded demo song, verifies
playing one pauses the other via the shared "currently playing" tracker in
MediaGroups.tsx, then removes both -- this suite runs against a shared
Preview database, matching test_admin_about.py's own convention of cleaning
up after itself.

Fake same-origin .mp3 URLs (nonexistent paths on BASE_URL itself) are used
deliberately: detectMediaKind() only needs the URL to end in a recognized
audio extension to render a real <audio> element -- the underlying
resource never needs to actually load or even exist. Same-origin matters:
this suite may run in network-sandboxed environments where a real external
host's fetch can stall indefinitely rather than erroring quickly, and
`el.play()`'s returned Promise only resolves once playback actually
starts -- awaiting it (directly or via Locator.evaluate's own promise
handling) can hang far longer than any reasonable timeout if that fetch
never settles. `.play()` is therefore called fire-and-forget below (its
promise deliberately not returned/awaited): the native "play" event this
behavior depends on fires synchronously as part of the play() algorithm,
before the browser even knows whether the source is playable. Iframe-
embedded kinds (YouTube/Drive/SoundCloud) are a documented, untested
exception (see #41) -- they can't be paused cross-origin.
"""

from _common import BASE_URL, SEED_SONG_TITLE, admin_page

MARKER_LABEL_1 = "E2E Playback Test Audio 1"
MARKER_LABEL_2 = "E2E Playback Test Audio 2"
MARKER_URL_1 = f"{BASE_URL}/e2e-test-audio-1.mp3"
MARKER_URL_2 = f"{BASE_URL}/e2e-test-audio-2.mp3"


def _add_audio(page, url, label):
    page.get_by_placeholder("YouTube, Spotify, Google Drive, or direct URL").fill(url)
    page.get_by_label("Label").fill(label)
    page.get_by_role("button", name="Add Media").click()
    page.wait_for_timeout(1500)


def _remove_by_label(page, label):
    card = page.locator('[data-testid^="song-media-"]', has_text=label)
    # Same router.refresh()-vs-click() race noted in test_admin_about.py --
    # the removal itself completes even if this throws mid-click.
    try:
        card.get_by_role("button", name="Remove").click(no_wait_after=True)
    except Exception:
        pass
    page.wait_for_timeout(1500)


def test_starting_one_audio_pauses_another():
    with admin_page() as page:
        page.set_default_timeout(8_000)  # fail fast rather than the 30s default if anything ever hangs
        page.on("dialog", lambda d: d.accept())  # registered once for both Remove-button confirms below
        page.goto("/songs")
        page.get_by_text(SEED_SONG_TITLE).first.click()
        page.wait_for_url("**/songs/**", timeout=10_000)
        page.get_by_role("link", name="Media").click()
        page.wait_for_url("**/songs/**/media", timeout=10_000)
        media_url = page.url

        _add_audio(page, MARKER_URL_1, MARKER_LABEL_1)
        page.goto(media_url)
        _add_audio(page, MARKER_URL_2, MARKER_LABEL_2)
        page.goto(media_url)

        try:
            card1 = page.locator('[data-testid^="song-media-"]', has_text=MARKER_LABEL_1)
            card2 = page.locator('[data-testid^="song-media-"]', has_text=MARKER_LABEL_2)
            audio1 = card1.locator("audio")
            audio2 = card2.locator("audio")
            assert audio1.count() == 1 and audio2.count() == 1

            # Fire-and-forget: intentionally not awaiting/returning the
            # play() Promise itself (see module docstring) -- only the
            # synchronous "paused = false" + "play" event matters here.
            audio1.evaluate("el => { el.play().catch(() => {}); }")
            page.wait_for_timeout(200)
            assert audio1.evaluate("el => el.paused") is False

            audio2.evaluate("el => { el.play().catch(() => {}); }")
            page.wait_for_timeout(200)
            assert audio2.evaluate("el => el.paused") is False, "the newly played item should be playing"
            assert audio1.evaluate("el => el.paused") is True, "starting a new item should pause the previous one"
        finally:
            _remove_by_label(page, MARKER_LABEL_1)
            _remove_by_label(page, MARKER_LABEL_2)

        page.goto(media_url)
        assert page.get_by_text(MARKER_LABEL_1).count() == 0
        assert page.get_by_text(MARKER_LABEL_2).count() == 0


TESTS = [
    test_starting_one_audio_pauses_another,
]

if __name__ == "__main__":
    for t in TESTS:
        t()
        print(f"PASS {t.__name__}")
