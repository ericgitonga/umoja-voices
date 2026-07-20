-- CreateTable
CREATE TABLE "SongSheetMusic" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SongSheetMusic_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SongSheetMusic" ADD CONSTRAINT "SongSheetMusic_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;
