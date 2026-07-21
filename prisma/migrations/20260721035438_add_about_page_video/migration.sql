-- CreateTable
CREATE TABLE "AboutPageVideo" (
    "id" TEXT NOT NULL DEFAULT 'about',
    "videoUrl" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AboutPageVideo_pkey" PRIMARY KEY ("id")
);
