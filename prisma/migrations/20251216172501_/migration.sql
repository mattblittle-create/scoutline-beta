/*
  Warnings:

  - You are about to drop the column `website` on the `Team` table.
    All the data in the column will be lost.
*/

-- AlterTable
ALTER TABLE "public"."Team"
DROP COLUMN "website",
ADD COLUMN "websiteUrl" TEXT;

-- -----------------------------------------------------------------------------
-- Enforce: only ONE active TEAM_ADMIN per team
-- -----------------------------------------------------------------------------
-- Definition of "active":
--   role = 'TEAM_ADMIN'
--   AND endDate IS NULL
--
-- This prevents multiple admins while allowing historical rows.
-- -----------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS "TeamMembership_one_active_admin_per_team"
ON "public"."TeamMembership" ("teamId")
WHERE "role" = 'TEAM_ADMIN' AND "endDate" IS NULL;
