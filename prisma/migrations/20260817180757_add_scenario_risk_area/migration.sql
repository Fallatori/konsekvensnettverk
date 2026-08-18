/*
  Warnings:

  - Added the required column `riskArea` to the `Scenario` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Scenario" ADD COLUMN     "riskArea" TEXT;

-- Backfill: dev-seeded rows only, re-populated with real values by
-- prisma/seed.ts right after this migration runs.
UPDATE "Scenario" SET "riskArea" = '' WHERE "riskArea" IS NULL;

ALTER TABLE "Scenario" ALTER COLUMN "riskArea" SET NOT NULL;
