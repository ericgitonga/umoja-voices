# -*- coding: utf-8 -*-
"""
Generates extras/design_process.pdf — a comprehensive internal record of how
Umoja Voices was designed and built, including man-hour and pricing estimates
for quoting similar engagements. Tracked (unlike generate_security_pdf.py):
contains no real member data, no secrets, and only illustrative market-rate
figures. Its output still lives in the gitignored extras/ directory — see
SKILL.md's data handling rules.

Run with the ds conda env: conda run -n ds python extras/generate_design_pdf.py
"""

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    ListFlowable, ListItem, PageBreak, HRFlowable,
)

OUT = str(__import__("pathlib").Path(__file__).parent / "design_process.pdf")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="TitleBig", fontSize=24, leading=28, textColor=colors.HexColor("#2b2250"),
                           spaceAfter=6, fontName="Helvetica-Bold"))
styles.add(ParagraphStyle(name="Subtitle", fontSize=11, leading=15, textColor=colors.HexColor("#555555"),
                           spaceAfter=18, fontName="Helvetica"))
styles.add(ParagraphStyle(name="H1", fontSize=15, leading=19, textColor=colors.HexColor("#2b2250"),
                           spaceBefore=16, spaceAfter=8, fontName="Helvetica-Bold"))
styles.add(ParagraphStyle(name="H2", fontSize=11.5, leading=15, textColor=colors.HexColor("#5b3fa0"),
                           spaceBefore=10, spaceAfter=5, fontName="Helvetica-Bold"))
styles.add(ParagraphStyle(name="Body", fontSize=9.7, leading=14, spaceAfter=6, fontName="Helvetica"))
styles.add(ParagraphStyle(name="Small", fontSize=8, leading=11, textColor=colors.HexColor("#666666")))

PRIMARY = colors.HexColor("#2b2250")
LIGHT = colors.HexColor("#f4f2fa")


def h1(t): return Paragraph(t, styles["H1"])
def h2(t): return Paragraph(t, styles["H2"])
def p(t): return Paragraph(t, styles["Body"])
def cell(t): return Paragraph(t, styles["Body"])


def bullets(items):
    return ListFlowable(
        [ListItem(Paragraph(i, styles["Body"]), leftIndent=14) for i in items],
        bulletType="bullet", leftIndent=10, spaceBefore=2, spaceAfter=8,
    )


def hr():
    return HRFlowable(width="100%", thickness=0.75, color=colors.HexColor("#ddd6f0"), spaceBefore=4, spaceAfter=10)


def table(header, rows, col_widths=None):
    t = Table([header] + rows, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#ddd6f0")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


doc = SimpleDocTemplate(
    OUT, pagesize=LETTER,
    topMargin=0.75 * inch, bottomMargin=0.75 * inch,
    leftMargin=0.75 * inch, rightMargin=0.75 * inch,
    title="Umoja Voices — Design Process & Cost Record", author="Internal",
)

story = []

# ---------------------------------------------------------------- Cover
story.append(Paragraph("Umoja Voices", styles["TitleBig"]))
story.append(Paragraph("Design Process &amp; Cost Record — internal, not for client distribution", styles["Subtitle"]))
story.append(hr())
story.append(p(
    "This document records how the Umoja Voices choir-management app was designed and built, "
    "what shipped in the initial POC, what remains as tracked follow-up work, and a man-hour "
    "and pricing model for quoting comparable engagements. It contains no real choir member "
    "data — see SKILL.md's data handling rules for what stays out of here and why."
))

# ---------------------------------------------------------------- 1. Overview
story.append(h1("1. Project Overview"))
story.append(p(
    "Umoja Voices is a choir management web app covering: a song library with per-voice-part "
    "media (S/A/T/B/All) and structured, voice-tagged lyrics; admin vs. chorister accounts "
    "with an invite-only signup flow and self-service password reset; a travel logistics "
    "module (key dates/deadlines, itinerary, practice schedule) for the choir's performance "
    "trips; and a public-facing external links page. The full requirements and the reasoning "
    "behind each design decision are recorded in the reviewed design plan, <i>umoja.pdf</i>, "
    "which this document assumes as background."
))

# ---------------------------------------------------------------- 2. Process
story.append(h1("2. Design Process"))
story.append(p(
    "The design plan (umoja.pdf) was produced and refined iteratively: an initial full-stack "
    "proposal (data model, tech stack, hosting recommendation) was reviewed section by section, "
    "with each round of feedback producing a targeted revision rather than a full rewrite — "
    "voice-part media labeling, song-level section labels, per-lyric-section voice tagging, "
    "the logistics/travel module, calendar sync design, and the forgot-password flow were each "
    "added or refined this way before any code was written."
))
story.append(p(
    "Real-world context for the logistics module and song/voice-part conventions came from the "
    "choir's own WhatsApp coordination history (kept in the gitignored <i>Media/</i> folder — "
    "never committed, never quoted verbatim here). That history confirmed the SATB voice-part "
    "model, the \"SongTitle - Part\" media naming convention, and the shape of a real rehearsal/"
    "logistics announcement (venue, gate, contact, deadlines) — all of which shaped the schema "
    "without any real member being named in this document, the codebase, or its history."
))

# ---------------------------------------------------------------- 3. Scope delivered
story.append(h1("3. POC Scope Delivered (v0.1.0)"))
story.append(bullets([
    "Auth: credentials login, admin-invite flow, self-service forgot/reset password "
    "(closes GitHub issue #1)",
    "Song library: admin CRUD, S/A/T/B/All voice parts with pasted-link media detection "
    "(YouTube/Drive/SoundCloud/direct file, with a direct_url fallback) and inline embedded "
    "players; song-level section label + required description (#2)",
    "Structured, voice-tagged lyrics with a click-to-filter chorister view (#3)",
    "External links page, admin-managed, grouped by category (#4)",
    "Logistics module: trip deadlines, itinerary, practice schedule — admin-editable, "
    "chorister read-only (#5)",
    "Admin member management: list, invite, role toggle, deactivate (#6)",
    "Footer version display, read from VERSION (#7)",
    "Repository/tracking protocol: SKILL.md, SemVer + CHANGELOG + tag/release workflow, "
    "effort tracking (#8)",
]))
story.append(p(
    "Stack used for the POC: Next.js 16 (App Router, TypeScript, Tailwind), Prisma 7 against "
    "local SQLite, NextAuth v4 (Credentials, JWT sessions) — a deliberate, documented stand-in "
    "for the design's target Supabase Postgres + Supabase Auth, chosen because this dev "
    "environment has no Docker/Postgres and standing up hosted Supabase needs the project "
    "owner's own account. See SKILL.md's Security First section for the exact list of POC "
    "stand-ins and what closes each one out."
))

# ---------------------------------------------------------------- 4. Follow-up
story.append(h1("4. Tracked Follow-Up Work (not yet built)"))
story.append(table(
    ["Issue", "Item", "Why deferred"],
    [
        [cell("#9"), cell("Resend email delivery for invites/resets"),
         cell("POC shows the link directly instead of emailing it — no provider account wired up yet")],
        [cell("#10"), cell("Swap local SQLite/NextAuth for Supabase Postgres + Auth"),
         cell("Needs the project owner's own Supabase account; schema already avoids native enums "
              "so the swap needs no migration rewrite")],
        [cell("#11"), cell("ICS calendar feed + notifications"),
         cell("Depends on the Resend wiring above")],
        [cell("#12"), cell("Security audit"),
         cell("Deliberately deferred until the POC is validated, per the original request")],
    ],
    col_widths=[0.6 * inch, 2.4 * inch, 3.5 * inch],
))

story.append(PageBreak())

# ---------------------------------------------------------------- 5. Cost documentation
story.append(h1("5. Cost Documentation"))
story.append(p(
    "This section models what a comparable engagement (multi-role auth, a structured content "
    "model with admin tooling, a logistics/scheduling module, and initial repo/tracking setup) "
    "would reasonably cost to quote, using this project's actual delivered scope as the "
    "reference point. It is a pricing model, not a literal timesheet — actual hours worked on "
    "this project are tracked separately and honestly in extras/effort.xlsx via "
    "extras/log_effort.py."
))

story.append(h2("5.1 Estimated man-hours by phase"))
story.append(table(
    ["Phase", "Hours (range)", "Notes"],
    [
        [cell("Discovery &amp; design"), cell("6 – 10"),
         cell("Requirements gathering and the iterative design-plan review captured in umoja.pdf")],
        [cell("Data model &amp; backend"), cell("10 – 14"),
         cell("Schema, auth, Server Actions, token-based invite/reset flows")],
        [cell("Frontend / UI"), cell("16 – 24"),
         cell("Song library + players, lyrics editor/viewer, logistics, links, admin CRUD, profile")],
        [cell("Auth &amp; security hardening"), cell("6 – 10"),
         cell("Role gating, token expiry, password hashing, manual flow testing")],
        [cell("Testing / QA"), cell("4 – 6"),
         cell("Typecheck, production build, end-to-end login/role/CRUD smoke tests")],
        [cell("DevOps &amp; repo setup"), cell("4 – 6"),
         cell("Git/GitHub repo, issues, versioning + tag/release workflow, .gitignore data-handling rules")],
        [cell("Documentation"), cell("4 – 6"),
         cell("SKILL.md, CHANGELOG, this document")],
        [cell("Total (POC → v0.1.0)"), cell("50 – 76"), cell("Sum of the above")],
    ],
    col_widths=[1.7 * inch, 1.1 * inch, 3.7 * inch],
))
story.append(p(
    "A representative midpoint of <b>65 hours</b> is used for the illustrative cost figures "
    "below. This excludes the follow-up items in Section 4 (Resend, Supabase migration, ICS "
    "feed, security audit), which would be quoted as a separate phase once the POC is validated."
))

story.append(h2("5.2 Hourly rate benchmarks"))
story.append(p(
    "Rates below are illustrative market benchmarks for solo freelance full-stack development "
    "work of comparable scope, current as of mid-2026 — not a scrape of any single source, and "
    "not a claim about what any specific client will pay. Use them as a starting anchor, not a "
    "fixed price list."
))
story.append(table(
    ["Market", "Introductory rate", "Full market rate", "Basis"],
    [
        [cell("Kenya (local)"), cell("$18 / hr"), cell("$35 / hr"),
         cell("Kenyan freelance developer rates cluster around $20–45/hr; $35/hr sits at the "
              "typical mid–senior band, $18/hr as a below-market introductory rate for a "
              "community/nonprofit-context client")],
        [cell("International (US-pegged)"), cell("$45 / hr"), cell("$90 / hr"),
         cell("US freelance full-stack rates commonly run $61–80/hr on average and $70–150/hr "
              "at mid–senior level; $90/hr sits inside that band as a full market rate, $45/hr "
              "as a discounted introductory rate")],
    ],
    col_widths=[1.5 * inch, 1.2 * inch, 1.2 * inch, 2.6 * inch],
))

story.append(h2("5.3 Total project cost at 65 hours"))
story.append(table(
    ["Market", "Introductory rate total", "Full market rate total"],
    [
        [cell("Kenya (local)"), cell("$1,170"), cell("$2,275")],
        [cell("International (US-pegged)"), cell("$2,925"), cell("$5,850")],
    ],
    col_widths=[2.2 * inch, 2.2 * inch, 2.2 * inch],
))
story.append(p(
    "Range check at the low/high hour estimates (50–76 hrs) rather than the 65-hr midpoint: "
    "Kenya introductory $900–$1,368; Kenya full market $1,750–$2,660; international introductory "
    "$2,250–$3,420; international full market $4,500–$6,840."
))
story.append(p(
    "<b>Reading this table:</b> the introductory-rate columns reflect what to charge a "
    "community/nonprofit-context client (like this project) where free-tier hosting keeps "
    "infrastructure cost at $0 and the relationship favours a lower entry price. The full "
    "market-rate columns are the benchmark for a normal paying client and are the number to "
    "use when deciding what this service can comfortably be sold for."
))

story.append(Spacer(1, 14))
story.append(hr())
story.append(Paragraph(
    "Internal record. Regenerate after any material scope change: "
    "conda run -n ds python extras/generate_design_pdf.py",
    styles["Small"],
))

doc.build(story)
print("Wrote", OUT)
