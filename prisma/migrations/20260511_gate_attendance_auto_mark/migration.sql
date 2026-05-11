-- Gate Attendance Auto-Mark Migration
-- 1. Make AttendanceSession.teacherId nullable (gate sessions have no teacher)
-- 2. Add AttendanceSource enum and source column to AttendanceRecord

-- Make teacherId nullable
ALTER TABLE "AttendanceSession" ALTER COLUMN "teacherId" DROP NOT NULL;

-- Create AttendanceSource enum
CREATE TYPE "AttendanceSource" AS ENUM ('MANUAL', 'GATE_RFID', 'GATE_FACE');

-- Add source column with MANUAL as default (preserves all existing records)
ALTER TABLE "AttendanceRecord" ADD COLUMN "source" "AttendanceSource" NOT NULL DEFAULT 'MANUAL';
