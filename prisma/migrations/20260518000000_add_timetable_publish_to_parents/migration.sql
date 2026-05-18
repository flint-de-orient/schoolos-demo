-- AlterTable
ALTER TABLE "Timetable" ADD COLUMN "isPublishedToParents" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Timetable" ADD COLUMN "parentPublishedAt" TIMESTAMP(3);
