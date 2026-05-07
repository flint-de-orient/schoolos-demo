-- CreateEnum
CREATE TYPE "FeeFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'TERM', 'ANNUAL', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "FeeCollectionType" AS ENUM ('FULL', 'PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "ConcessionType" AS ENUM ('PERCENTAGE', 'FLAT_AMOUNT');

-- CreateEnum
CREATE TYPE "ConcessionApplicability" AS ENUM ('ALL_COMPONENTS', 'SPECIFIC_COMPONENTS');

-- DropForeignKey
ALTER TABLE "FeeAccount" DROP CONSTRAINT "FeeAccount_feeStructureId_fkey";

-- DropForeignKey
ALTER TABLE "FeeComponent" DROP CONSTRAINT "FeeComponent_feeStructureId_fkey";

-- DropForeignKey
ALTER TABLE "FeeInstallment" DROP CONSTRAINT "FeeInstallment_feeComponentId_fkey";

-- DropForeignKey
ALTER TABLE "FeeStructure" DROP CONSTRAINT "FeeStructure_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "FeeStructure" DROP CONSTRAINT "FeeStructure_tenantId_fkey";

-- AlterTable
ALTER TABLE "FeeAccount" DROP COLUMN "feeStructureId",
ADD COLUMN     "academicYearId" TEXT NOT NULL,
ADD COLUMN     "assignmentId" TEXT,
ADD COLUMN     "feePlanId" TEXT,
ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "lockedBy" TEXT,
ADD COLUMN     "studentCategoryId" TEXT;

-- AlterTable
ALTER TABLE "FeeComponent" DROP COLUMN "amount",
DROP COLUMN "feeStructureId",
DROP COLUMN "frequency",
DROP COLUMN "isTaxable",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isRefundable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "FeeInstallment" DROP COLUMN "feeComponentId",
ADD COLUMN     "planItemId" TEXT,
ADD COLUMN     "templateId" TEXT;

-- DropTable
DROP TABLE "FeeStructure";

-- CreateTable
CREATE TABLE "StudentCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeePlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "studentCategoryId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeePlanGrade" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,

    CONSTRAINT "FeePlanGrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeePlanItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "annualAmount" DECIMAL(12,2) NOT NULL,
    "frequency" "FeeFrequency" NOT NULL DEFAULT 'ANNUAL',
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FeePlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeInstallmentTemplate" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "dueMonth" INTEGER NOT NULL,
    "collectionType" "FeeCollectionType" NOT NULL DEFAULT 'PERCENTAGE',
    "value" DECIMAL(10,4) NOT NULL,
    "componentIds" TEXT[],
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FeeInstallmentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConcessionTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ConcessionType" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "applicableTo" "ConcessionApplicability" NOT NULL DEFAULT 'ALL_COMPONENTS',
    "componentIds" TEXT[],
    "isStackable" BOOLEAN NOT NULL DEFAULT false,
    "maxAmount" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConcessionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentFeeAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "feePlanId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "studentCategoryId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "StudentFeeAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentConcession" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "concessionTemplateId" TEXT NOT NULL,
    "overrideAmount" DECIMAL(10,2),
    "reason" TEXT,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentConcession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentCategory_tenantId_idx" ON "StudentCategory"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentCategory_tenantId_name_key" ON "StudentCategory"("tenantId", "name");

-- CreateIndex
CREATE INDEX "FeePlan_tenantId_idx" ON "FeePlan"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "FeePlanGrade_planId_gradeId_key" ON "FeePlanGrade"("planId", "gradeId");

-- CreateIndex
CREATE INDEX "FeePlanItem_planId_idx" ON "FeePlanItem"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "FeePlanItem_planId_componentId_key" ON "FeePlanItem"("planId", "componentId");

-- CreateIndex
CREATE INDEX "FeeInstallmentTemplate_planId_idx" ON "FeeInstallmentTemplate"("planId");

-- CreateIndex
CREATE INDEX "ConcessionTemplate_tenantId_idx" ON "ConcessionTemplate"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ConcessionTemplate_tenantId_name_key" ON "ConcessionTemplate"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "StudentFeeAssignment_studentId_key" ON "StudentFeeAssignment"("studentId");

-- CreateIndex
CREATE INDEX "StudentFeeAssignment_tenantId_idx" ON "StudentFeeAssignment"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentFeeAssignment_studentId_academicYearId_key" ON "StudentFeeAssignment"("studentId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentConcession_assignmentId_concessionTemplateId_key" ON "StudentConcession"("assignmentId", "concessionTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeAccount_assignmentId_key" ON "FeeAccount"("assignmentId");

-- CreateIndex
CREATE INDEX "FeeAccount_academicYearId_idx" ON "FeeAccount"("academicYearId");

-- CreateIndex
CREATE INDEX "FeeComponent_tenantId_idx" ON "FeeComponent"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeComponent_tenantId_name_key" ON "FeeComponent"("tenantId", "name");

-- AddForeignKey
ALTER TABLE "FeeComponent" ADD CONSTRAINT "FeeComponent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCategory" ADD CONSTRAINT "StudentCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePlan" ADD CONSTRAINT "FeePlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePlan" ADD CONSTRAINT "FeePlan_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePlan" ADD CONSTRAINT "FeePlan_studentCategoryId_fkey" FOREIGN KEY ("studentCategoryId") REFERENCES "StudentCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePlanGrade" ADD CONSTRAINT "FeePlanGrade_planId_fkey" FOREIGN KEY ("planId") REFERENCES "FeePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePlanGrade" ADD CONSTRAINT "FeePlanGrade_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePlanItem" ADD CONSTRAINT "FeePlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "FeePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePlanItem" ADD CONSTRAINT "FeePlanItem_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "FeeComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeInstallmentTemplate" ADD CONSTRAINT "FeeInstallmentTemplate_planId_fkey" FOREIGN KEY ("planId") REFERENCES "FeePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConcessionTemplate" ADD CONSTRAINT "ConcessionTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeAssignment" ADD CONSTRAINT "StudentFeeAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeAssignment" ADD CONSTRAINT "StudentFeeAssignment_feePlanId_fkey" FOREIGN KEY ("feePlanId") REFERENCES "FeePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeAssignment" ADD CONSTRAINT "StudentFeeAssignment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeAssignment" ADD CONSTRAINT "StudentFeeAssignment_studentCategoryId_fkey" FOREIGN KEY ("studentCategoryId") REFERENCES "StudentCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentConcession" ADD CONSTRAINT "StudentConcession_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "StudentFeeAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentConcession" ADD CONSTRAINT "StudentConcession_concessionTemplateId_fkey" FOREIGN KEY ("concessionTemplateId") REFERENCES "ConcessionTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeAccount" ADD CONSTRAINT "FeeAccount_feePlanId_fkey" FOREIGN KEY ("feePlanId") REFERENCES "FeePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeAccount" ADD CONSTRAINT "FeeAccount_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "StudentFeeAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeAccount" ADD CONSTRAINT "FeeAccount_studentCategoryId_fkey" FOREIGN KEY ("studentCategoryId") REFERENCES "StudentCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeInstallment" ADD CONSTRAINT "FeeInstallment_planItemId_fkey" FOREIGN KEY ("planItemId") REFERENCES "FeePlanItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeInstallment" ADD CONSTRAINT "FeeInstallment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FeeInstallmentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

