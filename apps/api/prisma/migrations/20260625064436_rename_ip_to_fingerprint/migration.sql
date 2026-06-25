/*
  Warnings:

  - You are about to drop the column `ipAddress` on the `Click` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Click" DROP COLUMN "ipAddress",
ADD COLUMN     "fingerprint" TEXT;
