-- Holiday calendar table
CREATE TABLE "Holiday" (
  "id"        TEXT         NOT NULL,
  "tenantId"  TEXT         NOT NULL,
  "date"      DATE         NOT NULL,
  "name"      TEXT         NOT NULL,
  "type"      TEXT         NOT NULL DEFAULT 'PUBLIC',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Holiday_tenantId_date_key" ON "Holiday"("tenantId", "date");
CREATE INDEX "Holiday_tenantId_idx" ON "Holiday"("tenantId");
