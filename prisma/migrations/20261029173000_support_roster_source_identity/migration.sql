-- REVIEW ONLY: not applied. Preserve every roster row and published name.
-- Pair with proposed-schema.prisma and a fresh read-only compatibility report.
BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE "public"."CollegeBaseballRosterPlayer" IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "public"."CollegeBaseballRosterPlayer"
    WHERE "rosterProfileUrl" IS NOT NULL AND btrim("rosterProfileUrl") = '') THEN
    RAISE EXCEPTION 'Blank profile URLs require review before migration';
  END IF;
  IF EXISTS (SELECT 1 FROM "public"."CollegeBaseballRosterPlayer"
    WHERE "rosterProfileUrl" IS NOT NULL
    GROUP BY "programId", "season", "rosterProfileUrl" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate source identities require review before migration';
  END IF;
END $$;
-- Build replacement guards before removing the old restriction.
CREATE UNIQUE INDEX "CollegeBaseballRosterPlayer_source_identity_key"
  ON "public"."CollegeBaseballRosterPlayer" ("programId", "season", "rosterProfileUrl");
-- Prisma cannot express this partial guard in the current schema version.
CREATE UNIQUE INDEX "CollegeBaseballRosterPlayer_name_without_profile_key"
  ON "public"."CollegeBaseballRosterPlayer" ("programId", "season", "name")
  WHERE "rosterProfileUrl" IS NULL;
CREATE INDEX "CollegeBaseballRosterPlayer_programId_season_name_idx"
  ON "public"."CollegeBaseballRosterPlayer" ("programId", "season", "name");
ALTER TABLE "public"."CollegeBaseballRosterPlayer"
  ADD CONSTRAINT "CollegeBaseballRosterPlayer_profile_nonblank_check"
  CHECK ("rosterProfileUrl" IS NULL OR btrim("rosterProfileUrl") <> '');
DROP INDEX "public"."CollegeBaseballRosterPlayer_programId_season_name_key";
COMMIT;
