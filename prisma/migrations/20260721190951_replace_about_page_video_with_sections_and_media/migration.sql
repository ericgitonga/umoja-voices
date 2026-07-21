-- CreateTable
CREATE TABLE "AboutPageSection" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AboutPageSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AboutPageMedia" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "mediaKind" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AboutPageMedia_pkey" PRIMARY KEY ("id")
);

-- DataMigration: carry the old singleton AboutPageVideo row(s) forward (#59)
-- as a video AboutPageMedia item, before the table is dropped.
INSERT INTO "AboutPageMedia" (id, label, "mediaUrl", "mediaKind", "sortOrder", "createdAt")
SELECT gen_random_uuid()::text, 'Featured Video', "videoUrl", 'video', 0, "updatedAt"
FROM "AboutPageVideo";

-- DropTable
DROP TABLE "AboutPageVideo";
