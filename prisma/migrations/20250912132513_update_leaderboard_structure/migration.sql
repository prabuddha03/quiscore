/*
  Warnings:

  - You are about to drop the column `participantId` on the `Leaderboard` table. All the data in the column will be lost.
  - You are about to drop the column `totalScore` on the `Leaderboard` table. All the data in the column will be lost.
  - You are about to drop the column `leaderboardId` on the `Participation` table. All the data in the column will be lost.
  - Added the required column `name` to the `Leaderboard` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Leaderboard" DROP CONSTRAINT "Leaderboard_participantId_fkey";

-- DropForeignKey
ALTER TABLE "Participation" DROP CONSTRAINT "Participation_leaderboardId_fkey";

-- DropIndex
DROP INDEX "Leaderboard_participantId_key";

-- AlterTable
ALTER TABLE "Leaderboard" DROP COLUMN "participantId",
DROP COLUMN "totalScore",
ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Participation" DROP COLUMN "leaderboardId",
ADD COLUMN     "leaderboardParticipantId" TEXT;

-- CreateTable
CREATE TABLE "LeaderboardParticipant" (
    "id" TEXT NOT NULL,
    "leaderboardId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardParticipant_leaderboardId_participantId_key" ON "LeaderboardParticipant"("leaderboardId", "participantId");

-- AddForeignKey
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_leaderboardParticipantId_fkey" FOREIGN KEY ("leaderboardParticipantId") REFERENCES "LeaderboardParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardParticipant" ADD CONSTRAINT "LeaderboardParticipant_leaderboardId_fkey" FOREIGN KEY ("leaderboardId") REFERENCES "Leaderboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardParticipant" ADD CONSTRAINT "LeaderboardParticipant_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
