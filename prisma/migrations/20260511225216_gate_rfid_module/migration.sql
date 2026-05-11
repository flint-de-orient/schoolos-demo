-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('UHF_RFID', 'HF_RFID', 'FACE_CAM');

-- CreateEnum
CREATE TYPE "GateNotifyChannel" AS ENUM ('WHATSAPP', 'SMS', 'BOTH', 'NONE');

-- CreateEnum
CREATE TYPE "GateNotifyTrigger" AS ENUM ('ENTRY', 'EXIT', 'BOTH', 'NONE');

-- AlterTable GateDevice
ALTER TABLE "GateDevice" ADD COLUMN "deviceType" "DeviceType" NOT NULL DEFAULT 'HF_RFID';
ALTER TABLE "GateDevice" ADD COLUMN "deviceToken" TEXT NOT NULL DEFAULT gen_random_uuid()::text;

-- AlterTable GateEvent
ALTER TABLE "GateEvent" ALTER COLUMN "studentId" DROP NOT NULL;
ALTER TABLE "GateEvent" ADD COLUMN "gateDeviceId" TEXT;
ALTER TABLE "GateEvent" ADD COLUMN "rawUid" TEXT;
ALTER TABLE "GateEvent" ADD COLUMN "resolved" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable StudentCard
CREATE TABLE "StudentCard" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "cardUid" TEXT,
    "faceId" TEXT,
    "deviceType" "DeviceType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable TenantGateSettings
CREATE TABLE "TenantGateSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "notifyTrigger" "GateNotifyTrigger" NOT NULL DEFAULT 'BOTH',
    "notifyChannel" "GateNotifyChannel" NOT NULL DEFAULT 'WHATSAPP',
    "schoolStartTime" TEXT NOT NULL DEFAULT '08:00',
    "schoolEndTime" TEXT NOT NULL DEFAULT '15:00',
    "lateThresholdMins" INTEGER NOT NULL DEFAULT 15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenantGateSettings_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "GateDevice_deviceToken_key" ON "GateDevice"("deviceToken");
CREATE UNIQUE INDEX "StudentCard_tenantId_cardUid_key" ON "StudentCard"("tenantId", "cardUid");
CREATE UNIQUE INDEX "StudentCard_tenantId_faceId_key" ON "StudentCard"("tenantId", "faceId");
CREATE UNIQUE INDEX "TenantGateSettings_tenantId_key" ON "TenantGateSettings"("tenantId");

-- Index
CREATE INDEX "StudentCard_tenantId_idx" ON "StudentCard"("tenantId");

-- FK constraints
ALTER TABLE "StudentCard" ADD CONSTRAINT "StudentCard_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentCard" ADD CONSTRAINT "StudentCard_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TenantGateSettings" ADD CONSTRAINT "TenantGateSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GateEvent" ADD CONSTRAINT "GateEvent_gateDeviceId_fkey" FOREIGN KEY ("gateDeviceId") REFERENCES "GateDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
