CREATE TABLE "AttendanceInsight" (
  "id"           TEXT         NOT NULL,
  "tenantId"     TEXT         NOT NULL,
  "generatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"    TIMESTAMP(3) NOT NULL,
  "alerts"       JSONB        NOT NULL DEFAULT '[]',
  "summary"      TEXT         NOT NULL DEFAULT '',
  "inputTokens"  INTEGER      NOT NULL DEFAULT 0,
  "outputTokens" INTEGER      NOT NULL DEFAULT 0,
  CONSTRAINT "AttendanceInsight_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AttendanceInsight_tenantId_key" ON "AttendanceInsight"("tenantId");
CREATE INDEX "AttendanceInsight_tenantId_idx" ON "AttendanceInsight"("tenantId");
