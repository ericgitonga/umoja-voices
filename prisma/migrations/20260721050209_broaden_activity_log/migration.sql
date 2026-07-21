-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN     "entityLabel" TEXT,
ADD COLUMN     "entityType" TEXT,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "userAgent" TEXT;
