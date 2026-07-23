# Umoja Voices — User Guide

This guide walks through everything the app can do today, as it actually behaves — screenshots
throughout are from a live session against a non-production demo account, never real member
data. Chorister-facing features come first; admin-only features (marked **Admin**) follow.

If something described here looks slightly different from what you see, the app may have moved
on since this guide was last updated — the footer at the bottom of every page shows the running
version.

---

## Getting started

### Receiving an invite and setting a password

New members are added by an admin (see "Managing members" under the admin section below), never
by signing up directly — there's no public registration page. An admin invites you
by email and shares a one-time invite link with you directly (by WhatsApp, etc. — the app doesn't
send email itself yet). Opening that link lets you set your own password and signs you in.

### Signing in

![Sign-in page](screenshots/01-login.png)

Go to the app's URL and sign in with your email and password.

### Resetting a forgotten password

![Forgot password page](screenshots/02-forgot-password.png)

Click **Forgot password?** from the sign-in page and enter your email. Self-service email
delivery for this flow isn't wired up yet, so in practice an admin generates you a reset link
directly (see "Managing members" below) the same way an invite link works.

---

## For choristers

### Browsing the song library

![Song library](screenshots/03-song-library.png)

**Songs** in the top navigation lists every song in the library. Click any song to open it.

### A song's Media, Sheet Music, and Lyrics

Each song has three sub-pages, linked from its detail page:

![Song detail page](screenshots/04-song-media.png)

**Media** groups audio/video tracks by voice part, with a filter bar (**S / A / T / B / All /
SATB**) to narrow the list to just your part:

![Media filtered to Soprano](screenshots/05-song-media-filtered-soprano.png)

Two playback toggles sit next to the filter:
- **Loop** — replays the currently visible tracks in order instead of stopping after the last one.
- **Play All** — auto-advances to the next visible track as each one finishes; turning it off stops the auto-advance without interrupting whatever is currently playing.

Both toggles apply only to whatever the active filter shows, so switching to **S** and turning on
**Play All** loops just the soprano part.

**Sheet Music** shows any scanned/uploaded sheet music for the song (shown here with none added
yet):

![Sheet music page](screenshots/06-song-sheet-music.png)

**Lyrics** shows the song's lyrics broken into labeled segments (verse, chorus, bridge, etc.),
each tagged with which voice part(s) sing it:

![Lyrics page](screenshots/07-song-lyrics.png)

The same **S / A / T / B / All** filter bar narrows the lyrics shown to just your part — useful
for a bridge or descant line that only one voice part sings:

![Lyrics filtered to Soprano](screenshots/08-song-lyrics-filtered-soprano.png)

### Logistics (trip details)

![Logistics page](screenshots/09-logistics.png)

**Logistics** shows the current performance trip: destination and dates, key deadlines (visa,
tickets, etc.), the day-by-day itinerary, and the upcoming practice schedule. There's currently
only ever one active trip shown here.

### External Links

![External links page](screenshots/10-external-links.png)

**Links** is a simple public directory of the choir's external links (social media, etc.),
grouped by category.

### About

![About page](screenshots/11-about-page.png)

**About** is a free-form page an admin maintains — a mix of text sections and media (audio,
video, or embedded links), shown in whatever order the admin has arranged them in.

### Your Profile

![Profile page](screenshots/12-profile.png)

Click your name in the top-right corner, or go to **Profile**, to see and edit your own account:
bio, voice part, instrument, phone number, and photo. Click **Edit** to change any of these.

---

## For admins

Everything above works the same way for an admin account, plus the following admin-only
capabilities. Admin-only links (**Members**, **Storage**, **Activity**, plus **Add Song**/**Edit**
buttons) only appear in the navigation and on pages when you're signed in as an admin.

### Adding, editing, and deleting songs

From the song library, an admin sees an **Add Song** button:

![Song library as admin, with Add Song](screenshots/13-admin-songs-list.png)

which opens a short form for the title and credits (writer, composer, arranger):

![New song form](screenshots/14-admin-song-new.png)

Opening any song as an admin adds **Edit** and **Delete** buttons next to its title. **Edit** goes
to the song's admin editor, where media and sheet music are added:

![Song editor — Add Media](screenshots/15-admin-song-edit.png)

**Adding media**: the **Add Media** form toggles between **Paste URL** (for a YouTube, Spotify,
Google Drive, or other direct link) and **Upload file** (for a file hosted directly by the app,
subject to the per-file size caps shown on the "Storage usage" page below).

**Adding sheet music** works the same way, further down the same editor page.

**Replacing lyrics**: from a song's **Lyrics** page, an admin sees an **Edit** link, which opens a
dedicated paste-and-parse editor:

![Lyrics editor — paste box](screenshots/17-admin-song-lyrics-edit.png)

Paste (or directly edit) plain text — blank lines separate segments, optional `[S]`/`[A]`/`[T]`/
`[B]`/`[ALL]` tags mark which voice part a segment belongs to, and a line on its own names the
segment (e.g. "Verse 1", "Chorus"). Click **Preview** to see how it will parse before saving:

![Lyrics editor — parsed preview](screenshots/17b-admin-song-lyrics-edit-preview.png)

This same box is also how you edit lyrics that already exist — it's pre-filled with the song's
current lyrics in the same pasteable format, so there's no separate "manual" editor: reopening it
after lyrics exist just re-parses whatever you leave in the box, and the save button reads
**Replace Lyrics** instead of **Save**.

### Managing External Links

![External links, admin view](screenshots/18-admin-links.png)

The same **Links** page gains a form (title, URL, category) for adding new links, and a **Delete**
link next to each existing one.

### Managing Logistics

![Logistics, admin view](screenshots/19-admin-logistics.png)

The same **Logistics** page gains inline forms for adding a deadline, an itinerary entry, or a
practice session, plus a **Delete** link on each existing row. There's no separate page to create
a new trip or browse past ones yet — the app currently manages one active trip at a time.

### Editing the About page

![About page editor](screenshots/20-admin-about.png)

From **About**, admins get an **Edit About page** link. Text sections and media share a single
ordering, so a video or recording can be dropped in between two paragraphs — each existing item
has **Edit**/**Delete** plus **↑**/**↓** buttons to move it up or down in that shared order. Below
the existing content, separate forms add a new text section or new media (again choosing between
**Paste URL** and **Upload file**).

### Managing members

![Members page](screenshots/21-admin-members.png)

**Members** lists every account. The **Invite a member** form at the top sends an invite (name,
email, role) and displays the resulting one-time invite link on-screen to share manually — the
app doesn't send email itself yet.

Each existing member's row also has a **role** dropdown (chorister/admin), **Deactivate**/
**Reactivate**, **Delete**, and **Reset link** — which generates a one-time password-reset link
to share with that person directly, shown inline once generated:

![Reset link generated](screenshots/22-admin-members-reset-link.png)

An admin can't demote or deactivate their own account, and the app always keeps at least one
active admin — both are blocked outright rather than left to admin discretion, so there's no way
to lock yourself out of the app entirely.

### Storage usage

![Storage page](screenshots/23-admin-storage.png)

**Storage** shows how much of the app's upload budget is in use, and lists every uploaded file
(audio, video, sheet music, profile photos) with its size and what it's attached to, if anything.
Pasted links (YouTube, Drive, SoundCloud, etc.) never count against this — only direct uploads
do. Per-file size caps (shown at the bottom of the page) apply separately to each upload type.

### Activity log

![Activity log](screenshots/24-admin-activity.png)

**Activity** shows the most recent 100 tracked events — currently logins, song creation/deletion,
and member role changes — each with who did it and, for logins, the request's IP/browser/OS.
This is a narrow slice of the app's activity, not a complete audit trail of every action.

---

## Known rough edges

This guide documents the app exactly as it behaves today, including things that are still known
gaps rather than fixed bugs:

- **The main navigation bar has no responsive/mobile treatment.** It's a single row that doesn't wrap or collapse into a menu on a narrow screen — as more admin links have been added over time (up to 7 for an admin account), it's increasingly likely to be cut off or overlap on a phone-width browser window. Every page's actual content is otherwise reasonably mobile-friendly.
