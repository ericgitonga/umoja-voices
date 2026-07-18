-- Restructure "voice parts" so one section (e.g. "Tenor") can group multiple
-- media items (audio, video, ...), instead of one SongPart row per media
-- link. Also removes Song.sectionLabel/labelDescription — those now live on
-- SongSection instead, since only Song.title is edited at the song level.
--
-- Data is preserved: each existing SongPart row becomes one SongSection row
-- (part -> part, label -> sectionLabel, labelDescription left blank for the
-- admin to fill in later) plus one SongMedia row underneath it (same id
-- prefixed with "media_", same mediaUrl/mediaKind). No existing recordings
-- are lost; they just start out as a section with a single media item each,
-- and can be regrouped/expanded afterwards from the admin editor.

-- CreateTable
CREATE TABLE "SongSection" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "part" TEXT NOT NULL,
    "sectionLabel" TEXT NOT NULL,
    "labelDescription" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SongSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongMedia" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "mediaKind" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SongMedia_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SongSection" ADD CONSTRAINT "SongSection_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongMedia" ADD CONSTRAINT "SongMedia_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "SongSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: one SongSection per existing SongPart, reusing its id
INSERT INTO "SongSection" ("id", "songId", "part", "sectionLabel", "labelDescription", "sortOrder")
SELECT "id", "songId", "part", "label", '', "sortOrder"
FROM "SongPart";

-- DataMigration: one SongMedia per existing SongPart, nested under the new section
INSERT INTO "SongMedia" ("id", "sectionId", "label", "mediaUrl", "mediaKind", "sortOrder")
SELECT 'media_' || "id", "id", "label", "mediaUrl", "mediaKind", 0
FROM "SongPart";

-- DropForeignKey
ALTER TABLE "SongPart" DROP CONSTRAINT "SongPart_songId_fkey";

-- DropTable
DROP TABLE "SongPart";

-- AlterTable
ALTER TABLE "Song" DROP COLUMN "labelDescription",
DROP COLUMN "sectionLabel";
