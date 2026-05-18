-- Rename date → startDate, add endDate for vacation ranges
ALTER TABLE "Holiday" RENAME COLUMN "date" TO "startDate";
ALTER TABLE "Holiday" ADD COLUMN "endDate" DATE NOT NULL DEFAULT CURRENT_DATE;
UPDATE "Holiday" SET "endDate" = "startDate";

-- Drop old unique constraint (ranges can't have a single-date unique key)
DROP INDEX IF EXISTS "Holiday_tenantId_date_key";

-- New composite index for range queries
CREATE INDEX IF NOT EXISTS "Holiday_tenantId_startDate_idx" ON "Holiday"("tenantId", "startDate");
