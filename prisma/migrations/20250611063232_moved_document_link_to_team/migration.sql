/*
  Warnings:

  - You are about to drop the column `description` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `disqualified` on the `Team` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[teamId,criteriaId,judgeId]` on the table `Score` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "description",
ADD COLUMN     "subType" TEXT;

-- AlterTable
ALTER TABLE "Round" ALTER COLUMN "rules" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Score" ADD COLUMN     "criteriaId" TEXT,
ADD COLUMN     "judgeId" TEXT,
ADD COLUMN     "pointers" TEXT,
ALTER COLUMN "questionId" DROP NOT NULL,
ALTER COLUMN "method" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Team" DROP COLUMN "disqualified",
ADD COLUMN     "documentLink" TEXT,
ADD COLUMN     "players" JSONB,
ADD COLUMN     "remarks" TEXT;

-- CreateTable
CREATE TABLE "Judge" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "Judge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Criteria" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxPoints" INTEGER,
    "roundId" TEXT NOT NULL,

    CONSTRAINT "Criteria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Judge_email_eventId_key" ON "Judge"("email", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Score_teamId_criteriaId_judgeId_key" ON "Score"("teamId", "criteriaId", "judgeId");

-- AddForeignKey
ALTER TABLE "Judge" ADD CONSTRAINT "Judge_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Criteria" ADD CONSTRAINT "Criteria_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_criteriaId_fkey" FOREIGN KEY ("criteriaId") REFERENCES "Criteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "Judge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
