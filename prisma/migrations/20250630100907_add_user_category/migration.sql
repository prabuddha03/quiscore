/*
  Warnings:

  - Changed the type of `type` on the `Event` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "UserCategory" AS ENUM ('FREE', 'PREMIUM', 'ADMIN', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('QUIZ', 'GENERAL');

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "type",
ADD COLUMN     "type" "EventType" NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "category" "UserCategory" NOT NULL DEFAULT 'FREE';
