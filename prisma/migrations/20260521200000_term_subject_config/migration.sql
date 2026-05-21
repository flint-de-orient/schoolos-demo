-- Drop old models
DROP TABLE IF EXISTS "TermSubjectOverride";
DROP TABLE IF EXISTS "SubjectPattern";

-- Create TermSubjectConfig
CREATE TABLE "TermSubjectConfig" (
    "id"         TEXT NOT NULL,
    "termId"     TEXT NOT NULL,
    "subjectId"  TEXT NOT NULL,
    "components" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "TermSubjectConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TermSubjectConfig_termId_subjectId_key"
    ON "TermSubjectConfig"("termId", "subjectId");

CREATE INDEX "TermSubjectConfig_termId_idx"
    ON "TermSubjectConfig"("termId");

ALTER TABLE "TermSubjectConfig"
    ADD CONSTRAINT "TermSubjectConfig_termId_fkey"
    FOREIGN KEY ("termId") REFERENCES "AssessmentTerm"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TermSubjectConfig"
    ADD CONSTRAINT "TermSubjectConfig_subjectId_fkey"
    FOREIGN KEY ("subjectId") REFERENCES "Subject"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
