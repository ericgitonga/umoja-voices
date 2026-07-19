-- DropForeignKey
ALTER TABLE "Invite" DROP CONSTRAINT "Invite_invitedById_fkey";

-- DropForeignKey
ALTER TABLE "PasswordResetToken" DROP CONSTRAINT "PasswordResetToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_invitedById_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "invitedById",
DROP COLUMN "mustChangePassword",
DROP COLUMN "passwordHash",
ADD COLUMN     "authUserId" TEXT;

-- DropTable
DROP TABLE "Invite";

-- DropTable
DROP TABLE "PasswordResetToken";

-- CreateIndex
CREATE UNIQUE INDEX "User_authUserId_key" ON "User"("authUserId");

