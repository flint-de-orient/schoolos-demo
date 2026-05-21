-- Add componentName to MarkEntry
ALTER TABLE "MarkEntry" ADD COLUMN IF NOT EXISTS "componentName" TEXT NOT NULL DEFAULT 'Theory';

-- Drop old unique constraint, add new one including componentName
ALTER TABLE "MarkEntry" DROP CONSTRAINT IF EXISTS "MarkEntry_examScheduleId_studentId_subjectId_key";
ALTER TABLE "MarkEntry" ADD CONSTRAINT "MarkEntry_examScheduleId_studentId_subjectId_componentName_key"
  UNIQUE ("examScheduleId", "studentId", "subjectId", "componentName");

-- AssessmentScheme
CREATE TABLE IF NOT EXISTS "AssessmentScheme" (
  "id"              TEXT NOT NULL,
  "tenantId"        TEXT NOT NULL,
  "academicYearId"  TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "description"     TEXT,
  "appliedGradeIds" TEXT[] NOT NULL DEFAULT '{}',
  "gradingConfig"   JSONB NOT NULL DEFAULT '[]',
  "passCriteria"    JSONB NOT NULL DEFAULT '{"perSubject":33,"aggregate":35}',
  "isPublished"     BOOLEAN NOT NULL DEFAULT false,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssessmentScheme_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AssessmentScheme_tenantId_idx" ON "AssessmentScheme"("tenantId");
CREATE INDEX IF NOT EXISTS "AssessmentScheme_academicYearId_idx" ON "AssessmentScheme"("academicYearId");
ALTER TABLE "AssessmentScheme" ADD CONSTRAINT "AssessmentScheme_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentScheme" ADD CONSTRAINT "AssessmentScheme_academicYearId_fkey"
  FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AssessmentTerm
CREATE TABLE IF NOT EXISTS "AssessmentTerm" (
  "id"               TEXT NOT NULL,
  "schemeId"         TEXT NOT NULL,
  "sequence"         INTEGER NOT NULL,
  "name"             TEXT NOT NULL,
  "type"             TEXT NOT NULL DEFAULT 'UNIT_TEST',
  "weightPct"        DOUBLE PRECISION NOT NULL,
  "isBoardConducted" BOOLEAN NOT NULL DEFAULT false,
  "examScheduleId"   TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssessmentTerm_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AssessmentTerm_schemeId_idx" ON "AssessmentTerm"("schemeId");
ALTER TABLE "AssessmentTerm" ADD CONSTRAINT "AssessmentTerm_schemeId_fkey"
  FOREIGN KEY ("schemeId") REFERENCES "AssessmentScheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentTerm" ADD CONSTRAINT "AssessmentTerm_examScheduleId_fkey"
  FOREIGN KEY ("examScheduleId") REFERENCES "ExamSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- SubjectPattern
CREATE TABLE IF NOT EXISTS "SubjectPattern" (
  "id"         TEXT NOT NULL,
  "schemeId"   TEXT NOT NULL,
  "subjectId"  TEXT,
  "components" JSONB NOT NULL DEFAULT '[]',
  CONSTRAINT "SubjectPattern_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SubjectPattern_schemeId_subjectId_key" ON "SubjectPattern"("schemeId", "subjectId");
CREATE INDEX IF NOT EXISTS "SubjectPattern_schemeId_idx" ON "SubjectPattern"("schemeId");
ALTER TABLE "SubjectPattern" ADD CONSTRAINT "SubjectPattern_schemeId_fkey"
  FOREIGN KEY ("schemeId") REFERENCES "AssessmentScheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubjectPattern" ADD CONSTRAINT "SubjectPattern_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- TermSubjectOverride
CREATE TABLE IF NOT EXISTS "TermSubjectOverride" (
  "id"         TEXT NOT NULL,
  "termId"     TEXT NOT NULL,
  "subjectId"  TEXT NOT NULL,
  "components" JSONB NOT NULL DEFAULT '[]',
  CONSTRAINT "TermSubjectOverride_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TermSubjectOverride_termId_subjectId_key" ON "TermSubjectOverride"("termId", "subjectId");
CREATE INDEX IF NOT EXISTS "TermSubjectOverride_termId_idx" ON "TermSubjectOverride"("termId");
ALTER TABLE "TermSubjectOverride" ADD CONSTRAINT "TermSubjectOverride_termId_fkey"
  FOREIGN KEY ("termId") REFERENCES "AssessmentTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TermSubjectOverride" ADD CONSTRAINT "TermSubjectOverride_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
