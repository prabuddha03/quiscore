/*
  Warnings:

  - A unique constraint covering the columns `[teamId,questionId]` on the table `Score` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Score_teamId_questionId_key" ON "Score"("teamId", "questionId");
