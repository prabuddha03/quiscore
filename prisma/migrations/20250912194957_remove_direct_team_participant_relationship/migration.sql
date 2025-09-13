/*
  Warnings:

  - You are about to drop the `_ParticipantToTeam` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ParticipantToTeam" DROP CONSTRAINT "_ParticipantToTeam_A_fkey";

-- DropForeignKey
ALTER TABLE "_ParticipantToTeam" DROP CONSTRAINT "_ParticipantToTeam_B_fkey";

-- DropTable
DROP TABLE "_ParticipantToTeam";
