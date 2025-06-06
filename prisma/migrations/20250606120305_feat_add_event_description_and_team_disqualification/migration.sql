-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "disqualified" BOOLEAN NOT NULL DEFAULT false;
