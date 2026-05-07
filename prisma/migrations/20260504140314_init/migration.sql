-- CreateEnum
CREATE TYPE "Board" AS ENUM ('CBSE', 'CISCE', 'WBBSE', 'OTHER');

-- CreateEnum
CREATE TYPE "ModuleId" AS ENUM ('dashboard', 'admissions', 'attendance', 'timetable', 'academics', 'examinations', 'fee', 'library', 'transport', 'health', 'hr', 'parent_app', 'school_shop', 'ai_advisor', 'analytics', 'settings', 'id_cards', 'certificates', 'gate', 'chatbot', 'communication', 'accounts', 'scholarships', 'ptm');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL', 'TEACHER', 'LIBRARIAN', 'NURSE', 'ACCOUNTANT', 'TRANSPORT_MANAGER', 'PARENT', 'STUDENT');

-- CreateEnum
CREATE TYPE "TeacherType" AS ENUM ('FULL_TIME', 'PART_TIME', 'NON_TEACHING', 'CONTRACT');

-- CreateEnum
CREATE TYPE "SubjectProficiency" AS ENUM ('PRIMARY', 'SECONDARY', 'SUBSTITUTE');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "TimetableStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'HOLIDAY', 'LEAVE');

-- CreateEnum
CREATE TYPE "GateEventType" AS ENUM ('ENTRY', 'EXIT', 'BUS_BOARDING', 'BUS_ALIGHTING');

-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('TRANSFER', 'BONAFIDE', 'CHARACTER', 'CONDUCT', 'MIGRATION', 'LEAVING', 'SCHOLARSHIP', 'ACHIEVEMENT', 'SPORTS', 'NCC', 'SCOUT', 'PARTICIPATION', 'MERIT', 'MEDICAL_FIT', 'EMPLOYMENT_VERIFY');

-- CreateEnum
CREATE TYPE "AIJobType" AS ENUM ('TIMETABLE_GENERATE', 'FEE_DEFAULT_PREDICT', 'BOARD_SCORE_PREDICT', 'LEARNING_PLAN_GEN', 'WEAK_TOPIC_DETECT', 'SUBSTITUTE_SUGGEST', 'ADMISSION_FUNNEL', 'ANALYTICS_SNAPSHOT', 'CERTIFICATE_DRAFT', 'COMMUNICATION_DRAFT');

-- CreateEnum
CREATE TYPE "AIJobStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('en', 'bn', 'hi', 'ur');

-- CreateEnum
CREATE TYPE "FeeStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'WAIVED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AdmissionStage" AS ENUM ('INQUIRY', 'APPLICATION_RECEIVED', 'DOCUMENTS_VERIFIED', 'INTERVIEW_SCHEDULED', 'OFFER_MADE', 'ENROLLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AdmissionSource" AS ENUM ('WALK_IN', 'SCHOOL_WEBSITE', 'REFERRAL', 'CAMPAIGN', 'SOCIAL_MEDIA', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'WARNING', 'ALERT', 'SUCCESS');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'WHATSAPP', 'SMS', 'EMAIL', 'PUSH');

-- CreateEnum
CREATE TYPE "TransactionMode" AS ENUM ('CASH', 'UPI', 'NEFT', 'CHEQUE', 'DD', 'CARD', 'RAZORPAY');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "BloodGroup" AS ENUM ('A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG');

-- CreateEnum
CREATE TYPE "BookIssueStatus" AS ENUM ('ISSUED', 'RETURNED', 'OVERDUE', 'LOST');

-- CreateEnum
CREATE TYPE "PTMBookingStatus" AS ENUM ('BOOKED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "board" "Board" NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "phone" TEXT,
    "email" TEXT NOT NULL,
    "website" TEXT,
    "address" TEXT,
    "logoUrl" TEXT,
    "headTitle" TEXT NOT NULL DEFAULT 'Principal',
    "headName" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "locale" "Language" NOT NULL DEFAULT 'en',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "trialEndsAt" TIMESTAMP(3),
    "plan" TEXT NOT NULL DEFAULT 'growth',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantModule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "module" "ModuleId" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "displayName" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "locale" "Language" NOT NULL DEFAULT 'en',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "board" "Board" NOT NULL,
    "isExamClass" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "classTeacherId" TEXT,
    "roomNumber" TEXT,
    "strength" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameLocal" TEXT,
    "code" TEXT,
    "colorHex" TEXT,
    "isElective" BOOLEAN NOT NULL DEFAULT false,
    "isLanguage" BOOLEAN NOT NULL DEFAULT false,
    "isPractical" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeSubject" (
    "id" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "periodsPerWeek" INTEGER NOT NULL DEFAULT 5,
    "isCompulsory" BOOLEAN NOT NULL DEFAULT true,
    "maxMarks" INTEGER NOT NULL DEFAULT 100,
    "passMarks" INTEGER NOT NULL DEFAULT 33,

    CONSTRAINT "GradeSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Syllabus" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "academicYearId" TEXT,
    "board" "Board" NOT NULL,
    "totalTopics" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Syllabus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyllabusChapter" (
    "id" TEXT NOT NULL,
    "syllabusId" TEXT NOT NULL,
    "chapterNo" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "titleLocal" TEXT,

    CONSTRAINT "SyllabusChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyllabusTopic" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "topicNo" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "titleLocal" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SyllabusTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChapterCompletion" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "completedOn" TIMESTAMP(3) NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChapterCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "employeeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "type" "TeacherType" NOT NULL,
    "designation" TEXT,
    "department" TEXT,
    "qualification" TEXT,
    "joiningDate" TIMESTAMP(3),
    "dateOfBirth" TIMESTAMP(3),
    "gender" "Gender",
    "avatarUrl" TEXT,
    "biometricId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxPeriodsDay" INTEGER NOT NULL DEFAULT 6,
    "maxPeriodsWeek" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherSubject" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "proficiency" "SubjectProficiency" NOT NULL DEFAULT 'PRIMARY',
    "gradeIds" TEXT[],

    CONSTRAINT "TeacherSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherAvailability" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "day" "DayOfWeek" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TeacherAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherAvailabilityOverride" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "isAvailable" BOOLEAN NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherAvailabilityOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherWorkloadSnapshot" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "timetableId" TEXT NOT NULL,
    "periodsPerWeek" INTEGER NOT NULL,
    "subjectsCount" INTEGER NOT NULL,
    "sectionsCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherWorkloadSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "employeeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "department" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "joiningDate" TIMESTAMP(3),
    "salary" DECIMAL(12,2),
    "biometricId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "admissionNo" TEXT NOT NULL,
    "rollNo" TEXT,
    "name" TEXT NOT NULL,
    "dateOfBirth" DATE,
    "gender" "Gender",
    "bloodGroup" "BloodGroup",
    "photoUrl" TEXT,
    "gradeId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "house" TEXT,
    "religion" TEXT,
    "category" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "aadharNo" TEXT,
    "previousSchool" TEXT,
    "admissionDate" DATE NOT NULL,
    "tcNumber" TEXT,
    "attendancePercent" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "fatherName" TEXT,
    "motherName" TEXT,
    "guardianName" TEXT,
    "phone" TEXT NOT NULL,
    "altPhone" TEXT,
    "email" TEXT,
    "occupation" TEXT,
    "annualIncome" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentParent" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "hasAppAccess" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "StudentParent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentMedical" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "bloodGroup" "BloodGroup",
    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "allergies" TEXT[],
    "conditions" TEXT[],
    "medications" TEXT[],
    "doctorName" TEXT,
    "doctorPhone" TEXT,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentMedical_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentDocument" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAchievement" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "date" DATE NOT NULL,
    "description" TEXT,
    "certificateUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodsPerDay" INTEGER NOT NULL DEFAULT 8,
    "workingDays" "DayOfWeek"[],
    "periodDuration" INTEGER NOT NULL DEFAULT 40,
    "breakAfterPeriod" INTEGER[],
    "breakDuration" INTEGER NOT NULL DEFAULT 20,
    "schoolStartTime" TEXT NOT NULL DEFAULT '08:00',
    "maxConsecutivePeriods" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimetableConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeriodSlot" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "periodNo" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isBreak" BOOLEAN NOT NULL DEFAULT false,
    "label" TEXT,

    CONSTRAINT "PeriodSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timetable" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" "TimetableStatus" NOT NULL DEFAULT 'DRAFT',
    "qualityScore" INTEGER,
    "conflictCount" INTEGER NOT NULL DEFAULT 0,
    "generatedByAI" BOOLEAN NOT NULL DEFAULT false,
    "aiJobId" TEXT,
    "generatedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Timetable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableEntry" (
    "id" TEXT NOT NULL,
    "timetableId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "periodSlotId" TEXT NOT NULL,
    "day" "DayOfWeek" NOT NULL,
    "roomNumber" TEXT,
    "isElective" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TimetableEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Substitution" (
    "id" TEXT NOT NULL,
    "timetableId" TEXT NOT NULL,
    "timetableEntryId" TEXT,
    "date" DATE NOT NULL,
    "day" "DayOfWeek" NOT NULL,
    "sectionId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "originalTeacherId" TEXT NOT NULL,
    "substituteTeacherId" TEXT,
    "periodSlotId" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assignedByAI" BOOLEAN NOT NULL DEFAULT false,
    "aiScore" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Substitution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DismissalSchedule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "gradeId" TEXT NOT NULL,
    "batchTime" TEXT NOT NULL,
    "laneNo" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DismissalSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonPlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "periodNo" INTEGER NOT NULL,
    "objectives" TEXT[],
    "content" TEXT,
    "methodology" TEXT,
    "resources" TEXT[],
    "homework" TEXT,
    "remarks" TEXT,
    "isAIGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeachingPlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "plannedTopics" JSONB NOT NULL,
    "actualTopics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeachingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSchedule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "gradeBands" TEXT[],
    "isPreBoard" BOOLEAN NOT NULL DEFAULT false,
    "isBoardExam" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamScheduleItem" (
    "id" TEXT NOT NULL,
    "examScheduleId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "examDate" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "maxMarks" INTEGER NOT NULL DEFAULT 100,
    "passMarks" INTEGER NOT NULL DEFAULT 33,
    "venue" TEXT,

    CONSTRAINT "ExamScheduleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HallTicket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "examScheduleId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "rollNo" TEXT NOT NULL,
    "examCentre" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "printedAt" TIMESTAMP(3),

    CONSTRAINT "HallTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatingPlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "examScheduleId" TEXT NOT NULL,
    "roomNo" TEXT NOT NULL,
    "rows" INTEGER NOT NULL,
    "cols" INTEGER NOT NULL,
    "layout" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeatingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarkEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "examScheduleId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "marksObtained" DOUBLE PRECISION,
    "grade" TEXT,
    "remarks" TEXT,
    "enteredById" TEXT,
    "verifiedById" TEXT,
    "isAbsent" BOOLEAN NOT NULL DEFAULT false,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarkEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeScale" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "board" "Board" NOT NULL,
    "minPercent" DOUBLE PRECISION NOT NULL,
    "maxPercent" DOUBLE PRECISION NOT NULL,
    "grade" TEXT NOT NULL,
    "points" DOUBLE PRECISION,
    "remark" TEXT,

    CONSTRAINT "GradeScale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportCard" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "examScheduleId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "ReportCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OMRUpload" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "examScheduleId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "OMRUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lab" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "roomNo" TEXT,
    "inchargeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabBooking" (
    "id" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "periodNo" INTEGER NOT NULL,
    "purpose" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabInventory" (
    "id" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT,
    "minQuantity" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabInventoryUsage" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "usedBy" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "LabInventoryUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "isbn" TEXT,
    "genre" TEXT,
    "publisher" TEXT,
    "edition" TEXT,
    "language" "Language" NOT NULL DEFAULT 'en',
    "copies" INTEGER NOT NULL DEFAULT 1,
    "available" INTEGER NOT NULL DEFAULT 1,
    "rackNo" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookIssue" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATE NOT NULL,
    "returnedAt" TIMESTAMP(3),
    "status" "BookIssueStatus" NOT NULL DEFAULT 'ISSUED',
    "fine" DECIMAL(8,2),
    "finePaid" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BookIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIBookRecommendation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "reasoning" TEXT,
    "titles" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIBookRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionInquiry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "parentName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "applyingForGrade" TEXT NOT NULL,
    "source" "AdmissionSource" NOT NULL DEFAULT 'WALK_IN',
    "stage" "AdmissionStage" NOT NULL DEFAULT 'INQUIRY',
    "inquiryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followUpDate" TIMESTAMP(3),
    "notes" TEXT,
    "assignedTo" TEXT,
    "isConverted" BOOLEAN NOT NULL DEFAULT false,
    "applicationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionApplication" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "applicationNo" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "gender" "Gender",
    "applyingForGrade" TEXT NOT NULL,
    "parentName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "previousSchool" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documentsJson" JSONB,
    "interviewDate" TIMESTAMP(3),
    "interviewNotes" TEXT,
    "offerDate" TIMESTAMP(3),
    "enrolledStudentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionChatLog" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdmissionChatLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "periodNo" INTEGER,
    "isHoliday" BOOLEAN NOT NULL DEFAULT false,
    "markedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "reason" TEXT,
    "parentNotified" BOOLEAN NOT NULL DEFAULT false,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GateEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "GateEventType" NOT NULL,
    "deviceId" TEXT,
    "scanMethod" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "busRouteId" TEXT,

    CONSTRAINT "GateEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentPickupOTP" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentPickupOTP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GateDevice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GateDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricIntegration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "webhookUrl" TEXT,
    "apiKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiometricIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportRoute" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "routeName" TEXT NOT NULL,
    "routeCode" TEXT,
    "vehicleId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteStop" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "stopName" TEXT NOT NULL,
    "stopOrder" INTEGER NOT NULL,
    "arrivalTime" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "studentCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RouteStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportVehicle" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vehicleNo" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'BUS',
    "capacity" INTEGER NOT NULL,
    "driverId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "insuranceExpiry" DATE,
    "fcExpiry" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleDriver" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "licenseNo" TEXT,
    "licenseExpiry" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleDriver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentRouteAssignment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "stopId" TEXT,
    "pickupType" TEXT NOT NULL DEFAULT 'BOTH',

    CONSTRAINT "StudentRouteAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleTracking" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SOSAlert" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "SOSAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NurseLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TEXT,
    "complaint" TEXT NOT NULL,
    "actionTaken" TEXT,
    "temperature" DOUBLE PRECISION,
    "referredToDoctor" BOOLEAN NOT NULL DEFAULT false,
    "parentNotified" BOOLEAN NOT NULL DEFAULT false,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NurseLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaccinationDrive" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vaccineName" TEXT NOT NULL,
    "targetGrades" TEXT[],
    "date" DATE NOT NULL,
    "agency" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaccinationDrive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentVaccination" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "driveId" TEXT,
    "vaccine" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "batchNo" TEXT,
    "givenBy" TEXT,
    "parentConsent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentVaccination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthAlert" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "affectedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "HealthAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeStructure" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gradeIds" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeComponent" (
    "id" TEXT NOT NULL,
    "feeStructureId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'ANNUAL',
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "isTaxable" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FeeComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "feeStructureId" TEXT NOT NULL,
    "totalDue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "FeeStatus" NOT NULL DEFAULT 'PENDING',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeInstallment" (
    "id" TEXT NOT NULL,
    "feeAccountId" TEXT NOT NULL,
    "feeComponentId" TEXT NOT NULL,
    "termLabel" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" DATE NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "FeeStatus" NOT NULL DEFAULT 'PENDING',
    "lateFee" DECIMAL(8,2) NOT NULL DEFAULT 0,

    CONSTRAINT "FeeInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "feeAccountId" TEXT NOT NULL,
    "installmentId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "mode" "TransactionMode" NOT NULL,
    "receiptNo" TEXT NOT NULL,
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "transactedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "FeeTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIFeeDefaulterPrediction" (
    "id" TEXT NOT NULL,
    "feeAccountId" TEXT NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "reasons" TEXT[],
    "predictedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AIFeeDefaulterPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountLedger" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "code" TEXT,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "allocated" DECIMAL(14,2) NOT NULL,
    "spent" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payroll" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "basic" DECIMAL(12,2) NOT NULL,
    "allowances" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pfDeduction" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tdsDeduction" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "otherDeductions" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "netPay" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "payslipUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scholarship" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "criteria" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scholarship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScholarshipApplication" (
    "id" TEXT NOT NULL,
    "scholarshipId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "ScholarshipApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "teacherId" TEXT,
    "staffId" TEXT,
    "leaveType" TEXT NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "days" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeavePolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL,
    "daysAllowed" DOUBLE PRECISION NOT NULL,
    "isCarryOver" BOOLEAN NOT NULL DEFAULT false,
    "maxCarryOver" DOUBLE PRECISION,
    "roleTypes" TEXT[],

    CONSTRAINT "LeavePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAppraisal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "scores" JSONB NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "grade" TEXT,
    "remarks" TEXT,
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffAppraisal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CPDLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "provider" TEXT,
    "certificate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CPDLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BehaviourLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "actionTaken" TEXT,
    "loggedBy" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parentNotified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BehaviourLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CounsellorNote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "session" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT NOT NULL,
    "followUpDate" DATE,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CounsellorNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitorLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "purpose" TEXT NOT NULL,
    "whomToMeet" TEXT,
    "idType" TEXT,
    "idNumber" TEXT,
    "inTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outTime" TIMESTAMP(3),
    "gatePassNo" TEXT,
    "photo" TEXT,

    CONSTRAINT "VisitorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AILearningPlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "learningStyle" TEXT,
    "strengths" TEXT[],
    "gaps" TEXT[],
    "plan" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AILearningPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIWeakTopicAlert" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "topics" TEXT[],
    "confidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AIWeakTopicAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIBoardScorePrediction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT,
    "gradeId" TEXT,
    "predictedScore" DOUBLE PRECISION NOT NULL,
    "subjectBreakdown" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "targetScore" DOUBLE PRECISION,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIBoardScorePrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatbotKnowledgeBase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "language" "Language" NOT NULL DEFAULT 'en',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatbotKnowledgeBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'school',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMsgAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "language" "Language" NOT NULL DEFAULT 'en',
    "tokensUsed" INTEGER,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "data" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "language" "Language" NOT NULL DEFAULT 'en',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "variables" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunicationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Communication" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetIds" TEXT[],
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT,
    "isAIGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Communication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageLog" (
    "id" TEXT NOT NULL,
    "communicationId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "recipientType" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "MessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentDevice" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "deviceToken" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "appVersion" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "ParentDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Homework" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "sectionId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assignedDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "attachmentUrls" TEXT[],
    "totalStudents" INTEGER NOT NULL DEFAULT 0,
    "submissionsCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Homework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeworkSubmission" (
    "id" TEXT NOT NULL,
    "homeworkId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fileUrls" TEXT[],
    "textResponse" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "score" DOUBLE PRECISION,
    "feedback" TEXT,
    "gradedAt" TIMESTAMP(3),

    CONSTRAINT "HomeworkSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentTeacherMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "teacherId" TEXT,
    "studentId" TEXT,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "sentBy" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentTeacherMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PTMSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "slotDuration" INTEGER NOT NULL DEFAULT 15,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PTMSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PTMSlot" (
    "id" TEXT NOT NULL,
    "ptmSessionId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PTMSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PTMBooking" (
    "id" TEXT NOT NULL,
    "ptmSessionId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "PTMBookingStatus" NOT NULL DEFAULT 'BOOKED',
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "PTMBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "type" TEXT NOT NULL,
    "venue" TEXT,
    "targetGrades" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRSVP" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATTENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRSVP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventGallery" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "caption" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventGallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IDCardTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "forRole" TEXT NOT NULL DEFAULT 'STUDENT',
    "layoutJson" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IDCardTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IDCard" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "academicYearId" TEXT,
    "qrCode" TEXT NOT NULL,
    "qrRotatesAt" TIMESTAMP(3) NOT NULL,
    "fileUrl" TEXT,
    "printedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IDCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificateTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "CertificateType" NOT NULL,
    "language" "Language" NOT NULL DEFAULT 'en',
    "name" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "variables" TEXT[],
    "signatureBlockJson" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificateTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "type" "CertificateType" NOT NULL,
    "certificateNo" TEXT NOT NULL,
    "verifyToken" TEXT NOT NULL,
    "issuedDate" DATE NOT NULL,
    "purpose" TEXT,
    "renderedHtml" TEXT,
    "fileUrl" TEXT,
    "issuedById" TEXT,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificateVerificationLog" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "CertificateVerificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "AIJobType" NOT NULL,
    "status" "AIJobStatus" NOT NULL DEFAULT 'PENDING',
    "inputJson" JSONB,
    "outputJson" JSONB,
    "errorMsg" TEXT,
    "modelUsed" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AIJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsageLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "module" "ModuleId",
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "cost" DECIMAL(10,6) NOT NULL,
    "endpoint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ShopCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopProduct" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "sku" TEXT,
    "imageUrl" TEXT,
    "sizes" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "parentId" TEXT,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMode" "TransactionMode",
    "razorpayOrderId" TEXT,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "ShopOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "size" TEXT,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "ShopOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_email_key" ON "Tenant"("email");

-- CreateIndex
CREATE INDEX "TenantModule_tenantId_idx" ON "TenantModule"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantModule_tenantId_module_key" ON "TenantModule"("tenantId", "module");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_token_key" ON "UserSession"("token");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_token_idx" ON "UserSession"("token");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AcademicYear_tenantId_idx" ON "AcademicYear"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_tenantId_label_key" ON "AcademicYear"("tenantId", "label");

-- CreateIndex
CREATE INDEX "Grade_tenantId_idx" ON "Grade"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_tenantId_academicYearId_name_key" ON "Grade"("tenantId", "academicYearId", "name");

-- CreateIndex
CREATE INDEX "Section_tenantId_idx" ON "Section"("tenantId");

-- CreateIndex
CREATE INDEX "Section_gradeId_idx" ON "Section"("gradeId");

-- CreateIndex
CREATE UNIQUE INDEX "Section_gradeId_name_key" ON "Section"("gradeId", "name");

-- CreateIndex
CREATE INDEX "Subject_tenantId_idx" ON "Subject"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_tenantId_name_key" ON "Subject"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "GradeSubject_gradeId_subjectId_key" ON "GradeSubject"("gradeId", "subjectId");

-- CreateIndex
CREATE INDEX "Syllabus_tenantId_idx" ON "Syllabus"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Syllabus_gradeId_subjectId_key" ON "Syllabus"("gradeId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "SyllabusChapter_syllabusId_chapterNo_key" ON "SyllabusChapter"("syllabusId", "chapterNo");

-- CreateIndex
CREATE UNIQUE INDEX "SyllabusTopic_chapterId_topicNo_key" ON "SyllabusTopic"("chapterId", "topicNo");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_userId_key" ON "Teacher"("userId");

-- CreateIndex
CREATE INDEX "Teacher_tenantId_idx" ON "Teacher"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_tenantId_employeeCode_key" ON "Teacher"("tenantId", "employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherSubject_teacherId_subjectId_key" ON "TeacherSubject"("teacherId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAvailability_teacherId_day_startTime_key" ON "TeacherAvailability"("teacherId", "day", "startTime");

-- CreateIndex
CREATE INDEX "TeacherAvailabilityOverride_teacherId_idx" ON "TeacherAvailabilityOverride"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAvailabilityOverride_teacherId_date_key" ON "TeacherAvailabilityOverride"("teacherId", "date");

-- CreateIndex
CREATE INDEX "TeacherWorkloadSnapshot_teacherId_idx" ON "TeacherWorkloadSnapshot"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherWorkloadSnapshot_timetableId_idx" ON "TeacherWorkloadSnapshot"("timetableId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_userId_key" ON "Staff"("userId");

-- CreateIndex
CREATE INDEX "Staff_tenantId_idx" ON "Staff"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_tenantId_employeeCode_key" ON "Staff"("tenantId", "employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE INDEX "Student_tenantId_idx" ON "Student"("tenantId");

-- CreateIndex
CREATE INDEX "Student_gradeId_idx" ON "Student"("gradeId");

-- CreateIndex
CREATE INDEX "Student_sectionId_idx" ON "Student"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_tenantId_admissionNo_key" ON "Student"("tenantId", "admissionNo");

-- CreateIndex
CREATE UNIQUE INDEX "Parent_userId_key" ON "Parent"("userId");

-- CreateIndex
CREATE INDEX "Parent_tenantId_idx" ON "Parent"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentParent_studentId_parentId_key" ON "StudentParent"("studentId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentMedical_studentId_key" ON "StudentMedical"("studentId");

-- CreateIndex
CREATE INDEX "StudentDocument_studentId_idx" ON "StudentDocument"("studentId");

-- CreateIndex
CREATE INDEX "StudentAchievement_studentId_idx" ON "StudentAchievement"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableConfig_tenantId_key" ON "TimetableConfig"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PeriodSlot_configId_periodNo_key" ON "PeriodSlot"("configId", "periodNo");

-- CreateIndex
CREATE INDEX "Timetable_tenantId_idx" ON "Timetable"("tenantId");

-- CreateIndex
CREATE INDEX "TimetableEntry_timetableId_idx" ON "TimetableEntry"("timetableId");

-- CreateIndex
CREATE INDEX "TimetableEntry_teacherId_idx" ON "TimetableEntry"("teacherId");

-- CreateIndex
CREATE INDEX "TimetableEntry_sectionId_idx" ON "TimetableEntry"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "TimetableEntry_timetableId_sectionId_day_periodSlotId_key" ON "TimetableEntry"("timetableId", "sectionId", "day", "periodSlotId");

-- CreateIndex
CREATE INDEX "Substitution_timetableId_idx" ON "Substitution"("timetableId");

-- CreateIndex
CREATE INDEX "Substitution_date_idx" ON "Substitution"("date");

-- CreateIndex
CREATE INDEX "Substitution_originalTeacherId_idx" ON "Substitution"("originalTeacherId");

-- CreateIndex
CREATE INDEX "DismissalSchedule_tenantId_date_idx" ON "DismissalSchedule"("tenantId", "date");

-- CreateIndex
CREATE INDEX "LessonPlan_teacherId_idx" ON "LessonPlan"("teacherId");

-- CreateIndex
CREATE INDEX "LessonPlan_gradeId_idx" ON "LessonPlan"("gradeId");

-- CreateIndex
CREATE INDEX "TeachingPlan_tenantId_idx" ON "TeachingPlan"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TeachingPlan_teacherId_subjectId_gradeId_month_year_key" ON "TeachingPlan"("teacherId", "subjectId", "gradeId", "month", "year");

-- CreateIndex
CREATE INDEX "ExamSchedule_tenantId_idx" ON "ExamSchedule"("tenantId");

-- CreateIndex
CREATE INDEX "ExamScheduleItem_examScheduleId_idx" ON "ExamScheduleItem"("examScheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "HallTicket_examScheduleId_studentId_key" ON "HallTicket"("examScheduleId", "studentId");

-- CreateIndex
CREATE INDEX "SeatingPlan_examScheduleId_idx" ON "SeatingPlan"("examScheduleId");

-- CreateIndex
CREATE INDEX "MarkEntry_studentId_idx" ON "MarkEntry"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "MarkEntry_examScheduleId_studentId_subjectId_key" ON "MarkEntry"("examScheduleId", "studentId", "subjectId");

-- CreateIndex
CREATE INDEX "GradeScale_tenantId_board_idx" ON "GradeScale"("tenantId", "board");

-- CreateIndex
CREATE INDEX "ReportCard_tenantId_idx" ON "ReportCard"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportCard_studentId_examScheduleId_key" ON "ReportCard"("studentId", "examScheduleId");

-- CreateIndex
CREATE INDEX "OMRUpload_tenantId_idx" ON "OMRUpload"("tenantId");

-- CreateIndex
CREATE INDEX "Lab_tenantId_idx" ON "Lab"("tenantId");

-- CreateIndex
CREATE INDEX "LabBooking_labId_date_idx" ON "LabBooking"("labId", "date");

-- CreateIndex
CREATE INDEX "Book_tenantId_idx" ON "Book"("tenantId");

-- CreateIndex
CREATE INDEX "BookIssue_bookId_idx" ON "BookIssue"("bookId");

-- CreateIndex
CREATE INDEX "BookIssue_studentId_idx" ON "BookIssue"("studentId");

-- CreateIndex
CREATE INDEX "AIBookRecommendation_tenantId_idx" ON "AIBookRecommendation"("tenantId");

-- CreateIndex
CREATE INDEX "AdmissionInquiry_tenantId_idx" ON "AdmissionInquiry"("tenantId");

-- CreateIndex
CREATE INDEX "AdmissionInquiry_stage_idx" ON "AdmissionInquiry"("stage");

-- CreateIndex
CREATE INDEX "AdmissionApplication_tenantId_idx" ON "AdmissionApplication"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionApplication_tenantId_applicationNo_key" ON "AdmissionApplication"("tenantId", "applicationNo");

-- CreateIndex
CREATE INDEX "AdmissionChatLog_inquiryId_idx" ON "AdmissionChatLog"("inquiryId");

-- CreateIndex
CREATE INDEX "AttendanceSession_tenantId_date_idx" ON "AttendanceSession"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceSession_sectionId_date_periodNo_key" ON "AttendanceSession"("sectionId", "date", "periodNo");

-- CreateIndex
CREATE INDEX "AttendanceRecord_studentId_idx" ON "AttendanceRecord"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_sessionId_studentId_key" ON "AttendanceRecord"("sessionId", "studentId");

-- CreateIndex
CREATE INDEX "GateEvent_tenantId_timestamp_idx" ON "GateEvent"("tenantId", "timestamp");

-- CreateIndex
CREATE INDEX "GateEvent_studentId_idx" ON "GateEvent"("studentId");

-- CreateIndex
CREATE INDEX "ParentPickupOTP_tenantId_idx" ON "ParentPickupOTP"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "GateDevice_tenantId_deviceId_key" ON "GateDevice"("tenantId", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "BiometricIntegration_tenantId_provider_key" ON "BiometricIntegration"("tenantId", "provider");

-- CreateIndex
CREATE INDEX "TransportRoute_tenantId_idx" ON "TransportRoute"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "RouteStop_routeId_stopOrder_key" ON "RouteStop"("routeId", "stopOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TransportVehicle_tenantId_vehicleNo_key" ON "TransportVehicle"("tenantId", "vehicleNo");

-- CreateIndex
CREATE UNIQUE INDEX "StudentRouteAssignment_studentId_key" ON "StudentRouteAssignment"("studentId");

-- CreateIndex
CREATE INDEX "VehicleTracking_routeId_timestamp_idx" ON "VehicleTracking"("routeId", "timestamp");

-- CreateIndex
CREATE INDEX "SOSAlert_routeId_idx" ON "SOSAlert"("routeId");

-- CreateIndex
CREATE INDEX "NurseLog_tenantId_date_idx" ON "NurseLog"("tenantId", "date");

-- CreateIndex
CREATE INDEX "NurseLog_studentId_idx" ON "NurseLog"("studentId");

-- CreateIndex
CREATE INDEX "VaccinationDrive_tenantId_idx" ON "VaccinationDrive"("tenantId");

-- CreateIndex
CREATE INDEX "StudentVaccination_studentId_idx" ON "StudentVaccination"("studentId");

-- CreateIndex
CREATE INDEX "HealthAlert_tenantId_idx" ON "HealthAlert"("tenantId");

-- CreateIndex
CREATE INDEX "FeeStructure_tenantId_idx" ON "FeeStructure"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeAccount_studentId_key" ON "FeeAccount"("studentId");

-- CreateIndex
CREATE INDEX "FeeAccount_tenantId_idx" ON "FeeAccount"("tenantId");

-- CreateIndex
CREATE INDEX "FeeInstallment_feeAccountId_idx" ON "FeeInstallment"("feeAccountId");

-- CreateIndex
CREATE INDEX "FeeTransaction_feeAccountId_idx" ON "FeeTransaction"("feeAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeTransaction_tenantId_receiptNo_key" ON "FeeTransaction"("tenantId", "receiptNo");

-- CreateIndex
CREATE UNIQUE INDEX "AIFeeDefaulterPrediction_feeAccountId_key" ON "AIFeeDefaulterPrediction"("feeAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountLedger_tenantId_name_key" ON "AccountLedger"("tenantId", "name");

-- CreateIndex
CREATE INDEX "LedgerEntry_ledgerId_date_idx" ON "LedgerEntry"("ledgerId", "date");

-- CreateIndex
CREATE INDEX "Budget_tenantId_academicYearId_idx" ON "Budget"("tenantId", "academicYearId");

-- CreateIndex
CREATE INDEX "Payroll_tenantId_idx" ON "Payroll"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Payroll_staffId_month_year_key" ON "Payroll"("staffId", "month", "year");

-- CreateIndex
CREATE INDEX "Scholarship_tenantId_idx" ON "Scholarship"("tenantId");

-- CreateIndex
CREATE INDEX "ScholarshipApplication_scholarshipId_idx" ON "ScholarshipApplication"("scholarshipId");

-- CreateIndex
CREATE INDEX "ScholarshipApplication_studentId_idx" ON "ScholarshipApplication"("studentId");

-- CreateIndex
CREATE INDEX "LeaveRequest_tenantId_idx" ON "LeaveRequest"("tenantId");

-- CreateIndex
CREATE INDEX "LeaveRequest_teacherId_idx" ON "LeaveRequest"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "LeavePolicy_tenantId_leaveType_key" ON "LeavePolicy"("tenantId", "leaveType");

-- CreateIndex
CREATE UNIQUE INDEX "StaffAppraisal_teacherId_academicYearId_key" ON "StaffAppraisal"("teacherId", "academicYearId");

-- CreateIndex
CREATE INDEX "CPDLog_tenantId_idx" ON "CPDLog"("tenantId");

-- CreateIndex
CREATE INDEX "CPDLog_teacherId_idx" ON "CPDLog"("teacherId");

-- CreateIndex
CREATE INDEX "BehaviourLog_studentId_idx" ON "BehaviourLog"("studentId");

-- CreateIndex
CREATE INDEX "CounsellorNote_studentId_idx" ON "CounsellorNote"("studentId");

-- CreateIndex
CREATE INDEX "VisitorLog_tenantId_inTime_idx" ON "VisitorLog"("tenantId", "inTime");

-- CreateIndex
CREATE INDEX "AILearningPlan_studentId_idx" ON "AILearningPlan"("studentId");

-- CreateIndex
CREATE INDEX "AIWeakTopicAlert_studentId_idx" ON "AIWeakTopicAlert"("studentId");

-- CreateIndex
CREATE INDEX "AIBoardScorePrediction_tenantId_idx" ON "AIBoardScorePrediction"("tenantId");

-- CreateIndex
CREATE INDEX "ChatbotKnowledgeBase_tenantId_category_idx" ON "ChatbotKnowledgeBase"("tenantId", "category");

-- CreateIndex
CREATE INDEX "ChatSession_tenantId_idx" ON "ChatSession"("tenantId");

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_idx" ON "ChatMessage"("sessionId");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_tenantId_idx" ON "AnalyticsSnapshot"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsSnapshot_tenantId_type_date_key" ON "AnalyticsSnapshot"("tenantId", "type", "date");

-- CreateIndex
CREATE INDEX "CommunicationTemplate_tenantId_idx" ON "CommunicationTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "Communication_tenantId_idx" ON "Communication"("tenantId");

-- CreateIndex
CREATE INDEX "MessageLog_communicationId_idx" ON "MessageLog"("communicationId");

-- CreateIndex
CREATE INDEX "MessageLog_recipientId_idx" ON "MessageLog"("recipientId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentDevice_deviceToken_key" ON "ParentDevice"("deviceToken");

-- CreateIndex
CREATE INDEX "ParentDevice_parentId_idx" ON "ParentDevice"("parentId");

-- CreateIndex
CREATE INDEX "Homework_tenantId_dueDate_idx" ON "Homework"("tenantId", "dueDate");

-- CreateIndex
CREATE INDEX "Homework_teacherId_idx" ON "Homework"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "HomeworkSubmission_homeworkId_studentId_key" ON "HomeworkSubmission"("homeworkId", "studentId");

-- CreateIndex
CREATE INDEX "ParentTeacherMessage_parentId_idx" ON "ParentTeacherMessage"("parentId");

-- CreateIndex
CREATE INDEX "PTMSession_tenantId_idx" ON "PTMSession"("tenantId");

-- CreateIndex
CREATE INDEX "PTMSlot_ptmSessionId_idx" ON "PTMSlot"("ptmSessionId");

-- CreateIndex
CREATE INDEX "PTMBooking_parentId_idx" ON "PTMBooking"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "PTMBooking_slotId_parentId_key" ON "PTMBooking"("slotId", "parentId");

-- CreateIndex
CREATE INDEX "SchoolEvent_tenantId_idx" ON "SchoolEvent"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "EventRSVP_eventId_userId_key" ON "EventRSVP"("eventId", "userId");

-- CreateIndex
CREATE INDEX "EventGallery_eventId_idx" ON "EventGallery"("eventId");

-- CreateIndex
CREATE INDEX "IDCardTemplate_tenantId_idx" ON "IDCardTemplate"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "IDCard_studentId_key" ON "IDCard"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "IDCard_qrCode_key" ON "IDCard"("qrCode");

-- CreateIndex
CREATE INDEX "IDCard_tenantId_idx" ON "IDCard"("tenantId");

-- CreateIndex
CREATE INDEX "IDCard_qrCode_idx" ON "IDCard"("qrCode");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateTemplate_tenantId_type_language_key" ON "CertificateTemplate"("tenantId", "type", "language");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_verifyToken_key" ON "Certificate"("verifyToken");

-- CreateIndex
CREATE INDEX "Certificate_tenantId_idx" ON "Certificate"("tenantId");

-- CreateIndex
CREATE INDEX "Certificate_verifyToken_idx" ON "Certificate"("verifyToken");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_tenantId_certificateNo_key" ON "Certificate"("tenantId", "certificateNo");

-- CreateIndex
CREATE INDEX "CertificateVerificationLog_certificateId_idx" ON "CertificateVerificationLog"("certificateId");

-- CreateIndex
CREATE INDEX "AIJob_tenantId_status_idx" ON "AIJob"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AIJob_type_idx" ON "AIJob"("type");

-- CreateIndex
CREATE INDEX "AIUsageLog_tenantId_createdAt_idx" ON "AIUsageLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_tenantId_userId_isRead_idx" ON "Notification"("tenantId", "userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "ShopCategory_tenantId_idx" ON "ShopCategory"("tenantId");

-- CreateIndex
CREATE INDEX "ShopProduct_tenantId_idx" ON "ShopProduct"("tenantId");

-- CreateIndex
CREATE INDEX "ShopOrder_tenantId_idx" ON "ShopOrder"("tenantId");

-- CreateIndex
CREATE INDEX "ShopOrder_studentId_idx" ON "ShopOrder"("studentId");

-- CreateIndex
CREATE INDEX "ShopOrderItem_orderId_idx" ON "ShopOrderItem"("orderId");

-- AddForeignKey
ALTER TABLE "TenantModule" ADD CONSTRAINT "TenantModule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicYear" ADD CONSTRAINT "AcademicYear_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_classTeacherId_fkey" FOREIGN KEY ("classTeacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeSubject" ADD CONSTRAINT "GradeSubject_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeSubject" ADD CONSTRAINT "GradeSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Syllabus" ADD CONSTRAINT "Syllabus_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Syllabus" ADD CONSTRAINT "Syllabus_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusChapter" ADD CONSTRAINT "SyllabusChapter_syllabusId_fkey" FOREIGN KEY ("syllabusId") REFERENCES "Syllabus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusTopic" ADD CONSTRAINT "SyllabusTopic_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "SyllabusChapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterCompletion" ADD CONSTRAINT "ChapterCompletion_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "SyllabusChapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSubject" ADD CONSTRAINT "TeacherSubject_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherSubject" ADD CONSTRAINT "TeacherSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAvailability" ADD CONSTRAINT "TeacherAvailability_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAvailabilityOverride" ADD CONSTRAINT "TeacherAvailabilityOverride_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherWorkloadSnapshot" ADD CONSTRAINT "TeacherWorkloadSnapshot_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherWorkloadSnapshot" ADD CONSTRAINT "TeacherWorkloadSnapshot_timetableId_fkey" FOREIGN KEY ("timetableId") REFERENCES "Timetable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentParent" ADD CONSTRAINT "StudentParent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentParent" ADD CONSTRAINT "StudentParent_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentMedical" ADD CONSTRAINT "StudentMedical_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDocument" ADD CONSTRAINT "StudentDocument_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAchievement" ADD CONSTRAINT "StudentAchievement_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableConfig" ADD CONSTRAINT "TimetableConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodSlot" ADD CONSTRAINT "PeriodSlot_configId_fkey" FOREIGN KEY ("configId") REFERENCES "TimetableConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_timetableId_fkey" FOREIGN KEY ("timetableId") REFERENCES "Timetable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_periodSlotId_fkey" FOREIGN KEY ("periodSlotId") REFERENCES "PeriodSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Substitution" ADD CONSTRAINT "Substitution_timetableId_fkey" FOREIGN KEY ("timetableId") REFERENCES "Timetable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Substitution" ADD CONSTRAINT "Substitution_originalTeacherId_fkey" FOREIGN KEY ("originalTeacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Substitution" ADD CONSTRAINT "Substitution_substituteTeacherId_fkey" FOREIGN KEY ("substituteTeacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlan" ADD CONSTRAINT "LessonPlan_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlan" ADD CONSTRAINT "LessonPlan_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingPlan" ADD CONSTRAINT "TeachingPlan_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSchedule" ADD CONSTRAINT "ExamSchedule_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamScheduleItem" ADD CONSTRAINT "ExamScheduleItem_examScheduleId_fkey" FOREIGN KEY ("examScheduleId") REFERENCES "ExamSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamScheduleItem" ADD CONSTRAINT "ExamScheduleItem_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HallTicket" ADD CONSTRAINT "HallTicket_examScheduleId_fkey" FOREIGN KEY ("examScheduleId") REFERENCES "ExamSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HallTicket" ADD CONSTRAINT "HallTicket_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarkEntry" ADD CONSTRAINT "MarkEntry_examScheduleId_fkey" FOREIGN KEY ("examScheduleId") REFERENCES "ExamSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarkEntry" ADD CONSTRAINT "MarkEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarkEntry" ADD CONSTRAINT "MarkEntry_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_examScheduleId_fkey" FOREIGN KEY ("examScheduleId") REFERENCES "ExamSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabBooking" ADD CONSTRAINT "LabBooking_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabInventory" ADD CONSTRAINT "LabInventory_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabInventoryUsage" ADD CONSTRAINT "LabInventoryUsage_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "LabInventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookIssue" ADD CONSTRAINT "BookIssue_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookIssue" ADD CONSTRAINT "BookIssue_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionInquiry" ADD CONSTRAINT "AdmissionInquiry_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "AdmissionApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionChatLog" ADD CONSTRAINT "AdmissionChatLog_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "AdmissionInquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GateEvent" ADD CONSTRAINT "GateEvent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentPickupOTP" ADD CONSTRAINT "ParentPickupOTP_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GateDevice" ADD CONSTRAINT "GateDevice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricIntegration" ADD CONSTRAINT "BiometricIntegration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportRoute" ADD CONSTRAINT "TransportRoute_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportRoute" ADD CONSTRAINT "TransportRoute_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransportVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportVehicle" ADD CONSTRAINT "TransportVehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "VehicleDriver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentRouteAssignment" ADD CONSTRAINT "StudentRouteAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentRouteAssignment" ADD CONSTRAINT "StudentRouteAssignment_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleTracking" ADD CONSTRAINT "VehicleTracking_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SOSAlert" ADD CONSTRAINT "SOSAlert_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "TransportRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NurseLog" ADD CONSTRAINT "NurseLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NurseLog" ADD CONSTRAINT "NurseLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentVaccination" ADD CONSTRAINT "StudentVaccination_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentVaccination" ADD CONSTRAINT "StudentVaccination_driveId_fkey" FOREIGN KEY ("driveId") REFERENCES "VaccinationDrive"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeComponent" ADD CONSTRAINT "FeeComponent_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "FeeStructure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeAccount" ADD CONSTRAINT "FeeAccount_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeAccount" ADD CONSTRAINT "FeeAccount_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeAccount" ADD CONSTRAINT "FeeAccount_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "FeeStructure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeInstallment" ADD CONSTRAINT "FeeInstallment_feeAccountId_fkey" FOREIGN KEY ("feeAccountId") REFERENCES "FeeAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeInstallment" ADD CONSTRAINT "FeeInstallment_feeComponentId_fkey" FOREIGN KEY ("feeComponentId") REFERENCES "FeeComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeTransaction" ADD CONSTRAINT "FeeTransaction_feeAccountId_fkey" FOREIGN KEY ("feeAccountId") REFERENCES "FeeAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeTransaction" ADD CONSTRAINT "FeeTransaction_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "FeeInstallment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIFeeDefaulterPrediction" ADD CONSTRAINT "AIFeeDefaulterPrediction_feeAccountId_fkey" FOREIGN KEY ("feeAccountId") REFERENCES "FeeAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "AccountLedger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScholarshipApplication" ADD CONSTRAINT "ScholarshipApplication_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAppraisal" ADD CONSTRAINT "StaffAppraisal_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CPDLog" ADD CONSTRAINT "CPDLog_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehaviourLog" ADD CONSTRAINT "BehaviourLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounsellorNote" ADD CONSTRAINT "CounsellorNote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AILearningPlan" ADD CONSTRAINT "AILearningPlan_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIWeakTopicAlert" ADD CONSTRAINT "AIWeakTopicAlert_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIBoardScorePrediction" ADD CONSTRAINT "AIBoardScorePrediction_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CommunicationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "Communication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentDevice" ADD CONSTRAINT "ParentDevice_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "Homework"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentTeacherMessage" ADD CONSTRAINT "ParentTeacherMessage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PTMSession" ADD CONSTRAINT "PTMSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PTMSlot" ADD CONSTRAINT "PTMSlot_ptmSessionId_fkey" FOREIGN KEY ("ptmSessionId") REFERENCES "PTMSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PTMSlot" ADD CONSTRAINT "PTMSlot_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PTMBooking" ADD CONSTRAINT "PTMBooking_ptmSessionId_fkey" FOREIGN KEY ("ptmSessionId") REFERENCES "PTMSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PTMBooking" ADD CONSTRAINT "PTMBooking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "PTMSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PTMBooking" ADD CONSTRAINT "PTMBooking_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolEvent" ADD CONSTRAINT "SchoolEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRSVP" ADD CONSTRAINT "EventRSVP_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SchoolEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventGallery" ADD CONSTRAINT "EventGallery_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SchoolEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IDCard" ADD CONSTRAINT "IDCard_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IDCard" ADD CONSTRAINT "IDCard_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IDCard" ADD CONSTRAINT "IDCard_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "IDCardTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CertificateTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateVerificationLog" ADD CONSTRAINT "CertificateVerificationLog_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIJob" ADD CONSTRAINT "AIJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopProduct" ADD CONSTRAINT "ShopProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ShopCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopOrderItem" ADD CONSTRAINT "ShopOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopOrderItem" ADD CONSTRAINT "ShopOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ShopProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
