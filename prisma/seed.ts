import 'dotenv/config';
import {
  PrismaClient, Board, ModuleId, UserRole, TeacherType,
  DayOfWeek, Gender, BloodGroup, FeeStatus,
  AdmissionStage, AdmissionSource, LeaveStatus, TransactionMode, BookIssueStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding SchoolOS database...');

  // ── Platform tenant ──────────────────────────────────────────
  const platform = await prisma.tenant.upsert({
    where: { slug: 'platform' },
    update: {},
    create: {
      slug: 'platform', name: 'SchoolOS Platform', shortName: 'SOS',
      board: Board.OTHER, city: 'Kolkata', state: 'West Bengal',
      email: 'platform@schoolos.in', headTitle: 'CEO', headName: 'Platform Admin',
    },
  });

  const superPwHash = await bcrypt.hash('superadmin2026', 12);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: platform.id, email: 'superadmin@schoolos.in' } },
    update: {},
    create: {
      tenantId: platform.id, email: 'superadmin@schoolos.in', passwordHash: superPwHash,
      role: UserRole.SUPER_ADMIN, displayName: 'Platform Admin', emailVerified: true,
    },
  });
  console.log('   Super admin: superadmin@schoolos.in / superadmin2026');

  // ── Sundarban Academy ─────────────────────────────────────────
  const sundarban = await prisma.tenant.upsert({
    where: { slug: 'sundarban' },
    update: {},
    create: {
      slug: 'sundarban', name: 'Sundarban Academy', shortName: 'SA',
      board: Board.CISCE, city: 'Kolkata', state: 'West Bengal',
      email: 'admin@sundarbanacademy.edu.in', headTitle: 'Principal',
      headName: 'Mrs. Ananya Sharma', phone: '9831000001',
      address: '12, Rabindra Sarani, Behala, Kolkata 700034',
    },
  });

  const sundarbanModules: ModuleId[] = [
    'dashboard','admissions','attendance','timetable','academics','examinations',
    'fee','library','transport','health','hr','parent_app','school_shop',
    'ai_advisor','analytics','settings','id_cards','certificates','gate',
    'chatbot','communication','accounts','scholarships','ptm',
  ];
  for (const module of sundarbanModules) {
    await prisma.tenantModule.upsert({
      where: { tenantId_module: { tenantId: sundarban.id, module } },
      update: {}, create: { tenantId: sundarban.id, module, isActive: true },
    });
  }

  // ── Muraliganj High School ─────────────────────────────────────
  const muraliganj = await prisma.tenant.upsert({
    where: { slug: 'muraliganj' },
    update: {},
    create: {
      slug: 'muraliganj', name: 'Muraliganj High School (H.S)', shortName: 'MHS',
      board: Board.WBBSE, city: 'Muraliganj', state: 'West Bengal',
      email: 'admin@muraliganjhs.edu.in', headTitle: 'Head Master',
      headName: 'Mr. Samsul Alam', phone: '9832000002',
      address: 'Station Road, Muraliganj, Murshidabad 742149',
    },
  });

  for (const module of ['dashboard','timetable','academics','hr','settings'] as ModuleId[]) {
    await prisma.tenantModule.upsert({
      where: { tenantId_module: { tenantId: muraliganj.id, module } },
      update: {}, create: { tenantId: muraliganj.id, module, isActive: true },
    });
  }

  // ── Admin users ───────────────────────────────────────────────
  const pwHash = await bcrypt.hash('sundarban2026', 12);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: sundarban.id, email: 'admin@sundarbanacademy.edu.in' } },
    update: {},
    create: {
      tenantId: sundarban.id, email: 'admin@sundarbanacademy.edu.in',
      passwordHash: pwHash, role: UserRole.SCHOOL_ADMIN,
      displayName: 'Mrs. Ananya Sharma', emailVerified: true,
    },
  });

  const mhsPwHash = await bcrypt.hash('muraliganj2026', 12);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: muraliganj.id, email: 'admin@muraliganjhs.edu.in' } },
    update: {},
    create: {
      tenantId: muraliganj.id, email: 'admin@muraliganjhs.edu.in',
      passwordHash: mhsPwHash, role: UserRole.SCHOOL_ADMIN,
      displayName: 'Mr. Samsul Alam', emailVerified: true,
    },
  });

  // ── Academic Years ────────────────────────────────────────────
  const ay2025 = await prisma.academicYear.upsert({
    where: { tenantId_label: { tenantId: sundarban.id, label: '2024-25' } },
    update: {},
    create: {
      tenantId: sundarban.id, label: '2024-25',
      startDate: new Date('2024-04-01'), endDate: new Date('2025-03-31'), isCurrent: true,
    },
  });

  await prisma.academicYear.upsert({
    where: { tenantId_label: { tenantId: muraliganj.id, label: '2024-25' } },
    update: {},
    create: {
      tenantId: muraliganj.id, label: '2024-25',
      startDate: new Date('2024-04-01'), endDate: new Date('2025-03-31'), isCurrent: true,
    },
  });

  // ── Timetable configs ─────────────────────────────────────────
  await prisma.timetableConfig.upsert({
    where: { tenantId: sundarban.id }, update: {},
    create: {
      tenantId: sundarban.id,
      workingDays: [DayOfWeek.MONDAY,DayOfWeek.TUESDAY,DayOfWeek.WEDNESDAY,DayOfWeek.THURSDAY,DayOfWeek.FRIDAY,DayOfWeek.SATURDAY],
      schoolStartTime: '08:00',
    },
  });

  await prisma.timetableConfig.upsert({
    where: { tenantId: muraliganj.id }, update: {},
    create: {
      tenantId: muraliganj.id,
      workingDays: [DayOfWeek.MONDAY,DayOfWeek.TUESDAY,DayOfWeek.WEDNESDAY,DayOfWeek.THURSDAY,DayOfWeek.FRIDAY,DayOfWeek.SATURDAY],
      schoolStartTime: '10:30',
    },
  });

  // ── Subjects ──────────────────────────────────────────────────
  const cisceSubjectDefs = [
    { name: 'English', code: 'ENG', colorHex: '#3B82F6' },
    { name: 'Mathematics', code: 'MAT', colorHex: '#8B5CF6' },
    { name: 'Science', code: 'SCI', colorHex: '#10B981' },
    { name: 'History & Civics', code: 'HIS', colorHex: '#F59E0B' },
    { name: 'Geography', code: 'GEO', colorHex: '#06B6D4' },
    { name: 'Bengali', code: 'BEN', colorHex: '#EC4899' },
    { name: 'Hindi', code: 'HIN', colorHex: '#F97316' },
    { name: 'Physics', code: 'PHY', colorHex: '#6366F1' },
    { name: 'Chemistry', code: 'CHE', colorHex: '#14B8A6' },
    { name: 'Biology', code: 'BIO', colorHex: '#22C55E' },
    { name: 'Computer Science', code: 'CS', colorHex: '#64748B' },
    { name: 'Physical Education', code: 'PE', colorHex: '#EF4444' },
    { name: 'Art & Craft', code: 'ART', colorHex: '#A855F7' },
    { name: 'Commerce', code: 'COM', colorHex: '#84CC16' },
    { name: 'Economics', code: 'ECO', colorHex: '#CA8A04' },
  ];

  const subjects: Record<string, string> = {};
  for (const s of cisceSubjectDefs) {
    const sub = await prisma.subject.upsert({
      where: { tenantId_name: { tenantId: sundarban.id, name: s.name } },
      update: {}, create: { tenantId: sundarban.id, ...s },
    });
    subjects[s.name] = sub.id;
  }

  for (const s of [
    { name: 'Bengali (First Language)', code: 'BEN1', colorHex: '#EC4899' },
    { name: 'English (Second Language)', code: 'ENG2', colorHex: '#3B82F6' },
    { name: 'Mathematics', code: 'MAT', colorHex: '#8B5CF6' },
    { name: 'Life Science', code: 'LSCI', colorHex: '#22C55E' },
    { name: 'Physical Science', code: 'PSCI', colorHex: '#6366F1' },
    { name: 'History', code: 'HIS', colorHex: '#F59E0B' },
    { name: 'Geography', code: 'GEO', colorHex: '#06B6D4' },
    { name: 'Physical Education', code: 'PE', colorHex: '#EF4444' },
  ]) {
    await prisma.subject.upsert({
      where: { tenantId_name: { tenantId: muraliganj.id, name: s.name } },
      update: {}, create: { tenantId: muraliganj.id, ...s },
    });
  }

  // ── Grades (Sundarban) ────────────────────────────────────────
  const gradeNames = [
    { name: 'Nursery', order: 1 }, { name: 'LKG', order: 2 }, { name: 'UKG', order: 3 },
    { name: 'Class I', order: 4 }, { name: 'Class II', order: 5 }, { name: 'Class III', order: 6 },
    { name: 'Class IV', order: 7 }, { name: 'Class V', order: 8 }, { name: 'Class VI', order: 9 },
    { name: 'Class VII', order: 10 }, { name: 'Class VIII', order: 11 },
    { name: 'Class IX', order: 12 }, { name: 'Class X', order: 13 },
    { name: 'Class XI', order: 14 }, { name: 'Class XII', order: 15 },
  ];

  const grades: Record<string, string> = {};
  for (const g of gradeNames) {
    const grade = await prisma.grade.upsert({
      where: { tenantId_academicYearId_name: { tenantId: sundarban.id, academicYearId: ay2025.id, name: g.name } },
      update: {},
      create: {
        tenantId: sundarban.id, academicYearId: ay2025.id, name: g.name,
        displayOrder: g.order, board: Board.CISCE,
        isExamClass: g.name === 'Class X' || g.name === 'Class XII',
      },
    });
    grades[g.name] = grade.id;
  }

  // ── Sections ──────────────────────────────────────────────────
  const sections: Record<string, string> = {}; // key: "Grade Name-Section"
  const singleSectionGrades = ['Nursery','LKG','UKG','Class I','Class II','Class III','Class IV'];
  const doubleSectionGrades = ['Class V','Class VI','Class VII','Class VIII','Class IX','Class X','Class XI','Class XII'];

  for (const gName of singleSectionGrades) {
    const sec = await prisma.section.upsert({
      where: { gradeId_name: { gradeId: grades[gName], name: 'A' } },
      update: {},
      create: { tenantId: sundarban.id, academicYearId: ay2025.id, gradeId: grades[gName], name: 'A', strength: 30 },
    });
    sections[`${gName}-A`] = sec.id;
  }
  for (const gName of doubleSectionGrades) {
    for (const secName of ['A', 'B']) {
      const sec = await prisma.section.upsert({
        where: { gradeId_name: { gradeId: grades[gName], name: secName } },
        update: {},
        create: { tenantId: sundarban.id, academicYearId: ay2025.id, gradeId: grades[gName], name: secName, strength: 38 },
      });
      sections[`${gName}-${secName}`] = sec.id;
    }
  }

  // ── Teachers ──────────────────────────────────────────────────
  const teacherDefs = [
    { code: 'T001', name: 'Priya Mukherjee', subject: 'English', dept: 'Languages', phone: '9831100001', qual: 'M.A., B.Ed', salary: 45000, gender: Gender.FEMALE },
    { code: 'T002', name: 'Sanjay Chatterjee', subject: 'Mathematics', dept: 'Science & Maths', phone: '9831100002', qual: 'M.Sc., B.Ed', salary: 48000, gender: Gender.MALE },
    { code: 'T003', name: 'Ritesh Bose', subject: 'Physics', dept: 'Science & Maths', phone: '9831100003', qual: 'M.Sc. Physics, B.Ed', salary: 46000, gender: Gender.MALE },
    { code: 'T004', name: 'Meenakshi Sen', subject: 'Chemistry', dept: 'Science & Maths', phone: '9831100004', qual: 'M.Sc. Chemistry, B.Ed', salary: 46000, gender: Gender.FEMALE },
    { code: 'T005', name: 'Radhakant Roy', subject: 'Biology', dept: 'Science & Maths', phone: '9831100005', qual: 'M.Sc. Biology, B.Ed', salary: 46000, gender: Gender.MALE },
    { code: 'T006', name: 'Ananya Das', subject: 'History & Civics', dept: 'Social Studies', phone: '9831100006', qual: 'M.A. History, B.Ed', salary: 42000, gender: Gender.FEMALE },
    { code: 'T007', name: 'Subhashis Mondal', subject: 'Geography', dept: 'Social Studies', phone: '9831100007', qual: 'M.A. Geography, B.Ed', salary: 42000, gender: Gender.MALE },
    { code: 'T008', name: 'Tanusree Biswas', subject: 'Bengali', dept: 'Languages', phone: '9831100008', qual: 'M.A. Bengali, B.Ed', salary: 42000, gender: Gender.FEMALE },
    { code: 'T009', name: 'Kamal Ghosh', subject: 'Hindi', dept: 'Languages', phone: '9831100009', qual: 'M.A. Hindi, B.Ed', salary: 40000, gender: Gender.MALE },
    { code: 'T010', name: 'Debabrata Pal', subject: 'Computer Science', dept: 'Technology', phone: '9831100010', qual: 'MCA, B.Ed', salary: 44000, gender: Gender.MALE },
    { code: 'T011', name: 'Mala Majumdar', subject: 'Physical Education', dept: 'Sports', phone: '9831100011', qual: 'M.P.Ed', salary: 38000, gender: Gender.FEMALE },
    { code: 'T012', name: 'Susanta Dey', subject: 'Art & Craft', dept: 'Arts', phone: '9831100012', qual: 'B.F.A', salary: 36000, gender: Gender.MALE },
  ];

  const teachers: Record<string, string> = {};
  for (const t of teacherDefs) {
    const teacher = await prisma.teacher.upsert({
      where: { tenantId_employeeCode: { tenantId: sundarban.id, employeeCode: t.code } },
      update: {},
      create: {
        tenantId: sundarban.id, employeeCode: t.code, name: t.name,
        type: TeacherType.FULL_TIME, department: t.dept, phone: t.phone,
        qualification: t.qual, gender: t.gender,
        joiningDate: new Date(`${2015 + Math.floor(Math.random() * 8)}-06-01`),
        isActive: true,
      },
    });
    teachers[t.name] = teacher.id;

    if (subjects[t.subject]) {
      await prisma.teacherSubject.upsert({
        where: { teacherId_subjectId: { teacherId: teacher.id, subjectId: subjects[t.subject] } },
        update: {},
        create: { teacherId: teacher.id, subjectId: subjects[t.subject], gradeIds: [] },
      });
    }
  }

  // ── Staff (non-teaching) ──────────────────────────────────────
  const staffDefs = [
    { code: 'S001', name: 'Mrs. Ananya Sharma', desig: 'Principal', dept: 'Administration', salary: 85000 },
    { code: 'S002', name: 'Mr. Partha Guha', desig: 'Vice Principal', dept: 'Administration', salary: 72000 },
    { code: 'S003', name: 'Tapas Kumar Das', desig: 'Administrative Officer', dept: 'Administration', salary: 35000 },
    { code: 'S004', name: 'Meera Saha', desig: 'Account Clerk', dept: 'Accounts', salary: 28000 },
    { code: 'S005', name: 'Ashok Sarkar', desig: 'Librarian', dept: 'Library', salary: 32000 },
    { code: 'S006', name: 'Champa Devi', desig: 'School Nurse', dept: 'Health', salary: 30000 },
    { code: 'S007', name: 'Ramesh Patra', desig: 'Office Peon', dept: 'Support', salary: 18000 },
    { code: 'S008', name: 'Manik Mondal', desig: 'Security Guard', dept: 'Support', salary: 18000 },
  ];

  const staffMap: Record<string, string> = {};
  for (const s of staffDefs) {
    const staff = await prisma.staff.upsert({
      where: { tenantId_employeeCode: { tenantId: sundarban.id, employeeCode: s.code } },
      update: {},
      create: {
        tenantId: sundarban.id, employeeCode: s.code, name: s.name,
        designation: s.desig, department: s.dept,
        salary: s.salary, joiningDate: new Date('2018-06-01'), isActive: true,
      },
    });
    staffMap[s.code] = staff.id;
  }

  // ── Students & Parents ────────────────────────────────────────
  const houses = ['TAGORE', 'BOSE', 'ROY', 'TERESA'];
  const bloodGroups = [BloodGroup.A_POS, BloodGroup.B_POS, BloodGroup.O_POS, BloodGroup.AB_POS, BloodGroup.A_NEG, BloodGroup.B_NEG];

  const studentDefs = [
    // Class V-A
    { no: 'SA2024001', name: 'Arjun Chatterjee', grade: 'Class V', sec: 'A', roll: '01', dob: '2014-04-15', gender: Gender.MALE, blood: BloodGroup.B_POS, house: 'TAGORE', father: 'Subrata Chatterjee', mother: 'Mala Chatterjee', phone: '9831012345', email: 'subrata.c@gmail.com', occ: 'Bank Manager', addr: '12, Rabindra Sarani, Behala', att: 92, fee: FeeStatus.PAID },
    { no: 'SA2024002', name: 'Priya Sen', grade: 'Class V', sec: 'A', roll: '02', dob: '2014-07-22', gender: Gender.FEMALE, blood: BloodGroup.O_POS, house: 'ROY', father: 'Amit Sen', mother: 'Rekha Sen', phone: '9831012346', email: 'amit.sen@gmail.com', occ: 'Teacher', addr: '34, Lake Road, Tollygunge', att: 68, fee: FeeStatus.OVERDUE },
    { no: 'SA2024003', name: 'Souvik Mondal', grade: 'Class V', sec: 'A', roll: '03', dob: '2013-11-08', gender: Gender.MALE, blood: BloodGroup.A_POS, house: 'BOSE', father: 'Ranjit Mondal', mother: 'Sunita Mondal', phone: '9831012347', email: 'ranjit.m@gmail.com', occ: 'Engineer', addr: '56, Diamond Harbour Rd, Joka', att: 88, fee: FeeStatus.PAID },
    { no: 'SA2024004', name: 'Ananya Roy', grade: 'Class V', sec: 'A', roll: '04', dob: '2014-02-14', gender: Gender.FEMALE, blood: BloodGroup.AB_POS, house: 'TERESA', father: 'Debashis Roy', mother: 'Anjali Roy', phone: '9831012348', email: 'debashis.r@gmail.com', occ: 'Doctor', addr: '89, Alipore Road, Alipore', att: 95, fee: FeeStatus.PAID },
    { no: 'SA2024005', name: 'Rajan Bose', grade: 'Class V', sec: 'A', roll: '05', dob: '2013-09-30', gender: Gender.MALE, blood: BloodGroup.B_NEG, house: 'TAGORE', father: 'Tapan Bose', mother: 'Shilpi Bose', phone: '9831012349', email: 'tapan.b@gmail.com', occ: 'Businessman', addr: '22, Park Street, Central', att: 79, fee: FeeStatus.PENDING },
    // Class VI-A
    { no: 'SA2024006', name: 'Meenakshi Das', grade: 'Class VI', sec: 'A', roll: '01', dob: '2013-03-25', gender: Gender.FEMALE, blood: BloodGroup.O_POS, house: 'BOSE', father: 'Pranab Das', mother: 'Gita Das', phone: '9831012350', email: 'pranab.d@gmail.com', occ: 'Accountant', addr: '44, Behala Main Rd', att: 91, fee: FeeStatus.PAID },
    { no: 'SA2024007', name: 'Tanmoy Ghosh', grade: 'Class VI', sec: 'A', roll: '02', dob: '2012-12-10', gender: Gender.MALE, blood: BloodGroup.A_POS, house: 'ROY', father: 'Sushil Ghosh', mother: 'Purnima Ghosh', phone: '9831012351', email: 'sushil.g@gmail.com', occ: 'Govt. Employee', addr: '77, VIP Road, Rajarhat', att: 85, fee: FeeStatus.PAID },
    { no: 'SA2024008', name: 'Ritika Mukherjee', grade: 'Class VI', sec: 'A', roll: '03', dob: '2013-06-18', gender: Gender.FEMALE, blood: BloodGroup.B_POS, house: 'TAGORE', father: 'Sougata Mukherjee', mother: 'Keya Mukherjee', phone: '9831012352', email: 'sougata.m@gmail.com', occ: 'Professor', addr: '11, Jadavpur, South Kolkata', att: 97, fee: FeeStatus.PAID },
    { no: 'SA2024009', name: 'Subho Majumdar', grade: 'Class VI', sec: 'A', roll: '04', dob: '2012-08-05', gender: Gender.MALE, blood: BloodGroup.AB_POS, house: 'TERESA', father: 'Kalyan Majumdar', mother: 'Sumita Majumdar', phone: '9831012353', email: 'kalyan.m@gmail.com', occ: 'Lawyer', addr: '33, Salt Lake, Sector V', att: 76, fee: FeeStatus.OVERDUE },
    { no: 'SA2024010', name: 'Puja Pal', grade: 'Class VI', sec: 'A', roll: '05', dob: '2013-01-20', gender: Gender.FEMALE, blood: BloodGroup.O_POS, house: 'BOSE', father: 'Suresh Pal', mother: 'Nilima Pal', phone: '9831012354', email: 'suresh.p@gmail.com', occ: 'Police Officer', addr: '55, Tollygunge, South', att: 83, fee: FeeStatus.PENDING },
    // Class VII-A
    { no: 'SA2024011', name: 'Bikram Sarkar', grade: 'Class VII', sec: 'A', roll: '01', dob: '2011-10-12', gender: Gender.MALE, blood: BloodGroup.B_POS, house: 'ROY', father: 'Biswanath Sarkar', mother: 'Ratna Sarkar', phone: '9831012355', email: 'biswanath.s@gmail.com', occ: 'Shopkeeper', addr: '66, Barasat, North', att: 89, fee: FeeStatus.PAID },
    { no: 'SA2024012', name: 'Tina Biswas', grade: 'Class VII', sec: 'A', roll: '02', dob: '2011-04-28', gender: Gender.FEMALE, blood: BloodGroup.A_NEG, house: 'TAGORE', father: 'Manas Biswas', mother: 'Rupa Biswas', phone: '9831012356', email: 'manas.b@gmail.com', occ: 'Nurse', addr: '88, Garia, South', att: 94, fee: FeeStatus.PAID },
    { no: 'SA2024013', name: 'Aritra Dey', grade: 'Class VII', sec: 'A', roll: '03', dob: '2012-07-15', gender: Gender.MALE, blood: BloodGroup.O_POS, house: 'BOSE', father: 'Animesh Dey', mother: 'Sudha Dey', phone: '9831012357', email: 'animesh.d@gmail.com', occ: 'Pilot', addr: '20, New Town, Rajarhat', att: 78, fee: FeeStatus.PENDING },
    { no: 'SA2024014', name: 'Shampa Nandi', grade: 'Class VII', sec: 'A', roll: '04', dob: '2011-12-03', gender: Gender.FEMALE, blood: BloodGroup.B_POS, house: 'TERESA', father: 'Tapash Nandi', mother: 'Bharati Nandi', phone: '9831012358', email: 'tapash.n@gmail.com', occ: 'Bank Manager', addr: '45, Kasba, East', att: 90, fee: FeeStatus.PAID },
    { no: 'SA2024015', name: 'Rajib Saha', grade: 'Class VII', sec: 'A', roll: '05', dob: '2012-02-19', gender: Gender.MALE, blood: BloodGroup.AB_POS, house: 'ROY', father: 'Ranjit Saha', mother: 'Monika Saha', phone: '9831012359', email: 'ranjit.s@gmail.com', occ: 'Architect', addr: '12, Chowringhee, Central', att: 86, fee: FeeStatus.PAID },
    // Class VIII-A
    { no: 'SA2024016', name: 'Sudipa Banerjee', grade: 'Class VIII', sec: 'A', roll: '01', dob: '2010-09-07', gender: Gender.FEMALE, blood: BloodGroup.O_POS, house: 'BOSE', father: 'Arun Banerjee', mother: 'Dipti Banerjee', phone: '9831012360', email: 'arun.b@gmail.com', occ: 'Engineer', addr: '34, Dum Dum, North', att: 93, fee: FeeStatus.PAID },
    { no: 'SA2024017', name: 'Koushik Ganguly', grade: 'Class VIII', sec: 'A', roll: '02', dob: '2010-05-23', gender: Gender.MALE, blood: BloodGroup.A_POS, house: 'TAGORE', father: 'Samarendranath Ganguly', mother: 'Chandana Ganguly', phone: '9831012361', email: 'samaren.g@gmail.com', occ: 'CA', addr: '67, Ballygunge, South', att: 82, fee: FeeStatus.OVERDUE },
    { no: 'SA2024018', name: 'Ria Chakraborty', grade: 'Class VIII', sec: 'A', roll: '03', dob: '2010-11-30', gender: Gender.FEMALE, blood: BloodGroup.B_POS, house: 'ROY', father: 'Uttam Chakraborty', mother: 'Meghna Chakraborty', phone: '9831012362', email: 'uttam.c@gmail.com', occ: 'IAS Officer', addr: '5, Hastings, Central', att: 96, fee: FeeStatus.PAID },
    { no: 'SA2024019', name: 'Debayan Mitra', grade: 'Class VIII', sec: 'A', roll: '04', dob: '2011-01-14', gender: Gender.MALE, blood: BloodGroup.O_POS, house: 'TERESA', father: 'Pradip Mitra', mother: 'Sangita Mitra', phone: '9831012363', email: 'pradip.m@gmail.com', occ: 'Software Engineer', addr: '90, Salt Lake, Sector II', att: 74, fee: FeeStatus.OVERDUE },
    { no: 'SA2024020', name: 'Mousumi Bose', grade: 'Class VIII', sec: 'A', roll: '05', dob: '2010-08-09', gender: Gender.FEMALE, blood: BloodGroup.A_POS, house: 'BOSE', father: 'Sudipta Bose', mother: 'Ratna Bose', phone: '9831012364', email: 'sudipta.b@gmail.com', occ: 'Doctor', addr: '23, Regent Park, South', att: 88, fee: FeeStatus.PAID },
    // Class IX-A
    { no: 'SA2024021', name: 'Rahul Datta', grade: 'Class IX', sec: 'A', roll: '01', dob: '2009-06-11', gender: Gender.MALE, blood: BloodGroup.B_POS, house: 'TAGORE', father: 'Sanjib Datta', mother: 'Jhumur Datta', phone: '9831012365', email: 'sanjib.d@gmail.com', occ: 'Businessman', addr: '44, Entally, East', att: 91, fee: FeeStatus.PAID },
    { no: 'SA2024022', name: 'Sanjukta Roy', grade: 'Class IX', sec: 'A', roll: '02', dob: '2009-03-17', gender: Gender.FEMALE, blood: BloodGroup.O_POS, house: 'ROY', father: 'Asit Roy', mother: 'Bapita Roy', phone: '9831012366', email: 'asit.r@gmail.com', occ: 'Professor', addr: '78, Manicktala, Central', att: 95, fee: FeeStatus.PAID },
    { no: 'SA2024023', name: 'Arup Sengupta', grade: 'Class IX', sec: 'A', roll: '03', dob: '2009-09-25', gender: Gender.MALE, blood: BloodGroup.A_POS, house: 'BOSE', father: 'Dilip Sengupta', mother: 'Renu Sengupta', phone: '9831012367', email: 'dilip.s@gmail.com', occ: 'Journalist', addr: '15, Gariahat, South', att: 77, fee: FeeStatus.PENDING },
    { no: 'SA2024024', name: 'Kavya Dasgupta', grade: 'Class IX', sec: 'A', roll: '04', dob: '2009-12-08', gender: Gender.FEMALE, blood: BloodGroup.B_NEG, house: 'TERESA', father: 'Ashim Dasgupta', mother: 'Paramita Dasgupta', phone: '9831012368', email: 'ashim.d@gmail.com', occ: 'Govt. Employee', addr: '60, Behala, South West', att: 89, fee: FeeStatus.PAID },
    { no: 'SA2024025', name: 'Partha Kundu', grade: 'Class IX', sec: 'A', roll: '05', dob: '2009-04-30', gender: Gender.MALE, blood: BloodGroup.AB_POS, house: 'ROY', father: 'Bikash Kundu', mother: 'Debjani Kundu', phone: '9831012369', email: 'bikash.k@gmail.com', occ: 'Industrialist', addr: '30, Kankurgachi, East', att: 84, fee: FeeStatus.OVERDUE },
    // Class X-A
    { no: 'SA2024026', name: 'Riya Bose', grade: 'Class X', sec: 'A', roll: '01', dob: '2008-07-04', gender: Gender.FEMALE, blood: BloodGroup.O_POS, house: 'TAGORE', father: 'Subimal Bose', mother: 'Kaberi Bose', phone: '9831012370', email: 'subimal.b@gmail.com', occ: 'Teacher', addr: '18, Tollygunge, South', att: 72, fee: FeeStatus.PENDING },
    { no: 'SA2024027', name: 'Subhrangshu Das', grade: 'Class X', sec: 'A', roll: '02', dob: '2008-11-21', gender: Gender.MALE, blood: BloodGroup.A_POS, house: 'BOSE', father: 'Bidyut Das', mother: 'Anjana Das', phone: '9831012371', email: 'bidyut.d@gmail.com', occ: 'Engineer', addr: '92, New Town, Block B', att: 94, fee: FeeStatus.PAID },
    { no: 'SA2024028', name: 'Soumita Chatterjee', grade: 'Class X', sec: 'A', roll: '03', dob: '2008-02-16', gender: Gender.FEMALE, blood: BloodGroup.B_POS, house: 'ROY', father: 'Prosenjit Chatterjee', mother: 'Pallabi Chatterjee', phone: '9831012372', email: 'prosen.c@gmail.com', occ: 'Doctor', addr: '5, Lake Gardens, South', att: 98, fee: FeeStatus.PAID },
    { no: 'SA2024029', name: 'Debraj Paul', grade: 'Class X', sec: 'A', roll: '04', dob: '2008-08-19', gender: Gender.MALE, blood: BloodGroup.O_POS, house: 'TERESA', father: 'Achintya Paul', mother: 'Swapna Paul', phone: '9831012373', email: 'achintya.p@gmail.com', occ: 'CA', addr: '7, Ballygunge Place', att: 87, fee: FeeStatus.PAID },
    { no: 'SA2024030', name: 'Trina Guha', grade: 'Class X', sec: 'A', roll: '05', dob: '2008-05-12', gender: Gender.FEMALE, blood: BloodGroup.A_NEG, house: 'BOSE', father: 'Sudip Guha', mother: 'Basanti Guha', phone: '9831012374', email: 'sudip.g@gmail.com', occ: 'Banker', addr: '40, Alipore, South', att: 76, fee: FeeStatus.OVERDUE },
    // Class XI-A
    { no: 'SA2024031', name: 'Abhishek Haldar', grade: 'Class XI', sec: 'A', roll: '01', dob: '2007-10-02', gender: Gender.MALE, blood: BloodGroup.B_POS, house: 'TAGORE', father: 'Bhaskar Haldar', mother: 'Sharmila Haldar', phone: '9831012375', email: 'bhaskar.h@gmail.com', occ: 'Lawyer', addr: '25, Naktala, South', att: 90, fee: FeeStatus.PAID },
    { no: 'SA2024032', name: 'Suchetana Bhattacharya', grade: 'Class XI', sec: 'A', roll: '02', dob: '2007-05-28', gender: Gender.FEMALE, blood: BloodGroup.O_POS, house: 'ROY', father: 'Nripen Bhattacharya', mother: 'Sangeeta Bhattacharya', phone: '9831012376', email: 'nripen.b@gmail.com', occ: 'Professor', addr: '50, Jadavpur, South', att: 96, fee: FeeStatus.PAID },
    { no: 'SA2024033', name: 'Pratik Goswami', grade: 'Class XI', sec: 'A', roll: '03', dob: '2007-01-15', gender: Gender.MALE, blood: BloodGroup.A_POS, house: 'BOSE', father: 'Pinaki Goswami', mother: 'Pamela Goswami', phone: '9831012377', email: 'pinaki.g@gmail.com', occ: 'Software Developer', addr: '8, Sector IV, Salt Lake', att: 83, fee: FeeStatus.PENDING },
    { no: 'SA2024034', name: 'Ankita Bhowmik', grade: 'Class XI', sec: 'A', roll: '04', dob: '2007-07-07', gender: Gender.FEMALE, blood: BloodGroup.B_POS, house: 'TERESA', father: 'Soumen Bhowmik', mother: 'Sonali Bhowmik', phone: '9831012378', email: 'soumen.bh@gmail.com', occ: 'Bank Manager', addr: '16, Ultadanga, North', att: 91, fee: FeeStatus.PAID },
    { no: 'SA2024035', name: 'Suman Hazra', grade: 'Class XI', sec: 'A', roll: '05', dob: '2007-12-23', gender: Gender.MALE, blood: BloodGroup.AB_POS, house: 'ROY', father: 'Goutam Hazra', mother: 'Lipika Hazra', phone: '9831012379', email: 'goutam.h@gmail.com', occ: 'Industrialist', addr: '35, Beleghata, East', att: 79, fee: FeeStatus.OVERDUE },
    // Class XII-A
    { no: 'SA2024036', name: 'Debarati Ray', grade: 'Class XII', sec: 'A', roll: '01', dob: '2006-09-14', gender: Gender.FEMALE, blood: BloodGroup.O_POS, house: 'BOSE', father: 'Shyamal Ray', mother: 'Mitali Ray', phone: '9831012380', email: 'shyamal.r@gmail.com', occ: 'Chartered Accountant', addr: '6, Dhakuria, South', att: 94, fee: FeeStatus.PAID },
    { no: 'SA2024037', name: 'Sourav Saha', grade: 'Class XII', sec: 'A', roll: '02', dob: '2006-03-08', gender: Gender.MALE, blood: BloodGroup.A_POS, house: 'TAGORE', father: 'Biplab Saha', mother: 'Chandrima Saha', phone: '9831012381', email: 'biplab.s@gmail.com', occ: 'Businessman', addr: '28, Gariahat, South', att: 88, fee: FeeStatus.PAID },
    { no: 'SA2024038', name: 'Barnali Datta', grade: 'Class XII', sec: 'A', roll: '03', dob: '2006-06-30', gender: Gender.FEMALE, blood: BloodGroup.B_POS, house: 'ROY', father: 'Satyajit Datta', mother: 'Bharati Datta', phone: '9831012382', email: 'satyajit.d@gmail.com', occ: 'IPS Officer', addr: '14, Jodhpur Park, South', att: 97, fee: FeeStatus.PAID },
    { no: 'SA2024039', name: 'Niloy Barman', grade: 'Class XII', sec: 'A', roll: '04', dob: '2006-11-17', gender: Gender.MALE, blood: BloodGroup.O_POS, house: 'TERESA', father: 'Kali Barman', mother: 'Malati Barman', phone: '9831012383', email: 'kali.b@gmail.com', occ: 'Farmer', addr: '3, Barasat, North 24 PGS', att: 71, fee: FeeStatus.OVERDUE },
    { no: 'SA2024040', name: 'Moupiya Ghosh', grade: 'Class XII', sec: 'A', roll: '05', dob: '2006-04-22', gender: Gender.FEMALE, blood: BloodGroup.AB_POS, house: 'BOSE', father: 'Mrinal Ghosh', mother: 'Jharna Ghosh', phone: '9831012384', email: 'mrinal.gh@gmail.com', occ: 'Doctor', addr: '70, CMRI Campus, Thakurpukur', att: 93, fee: FeeStatus.PAID },
  ];

  const feeAnnual: Record<string, number> = {
    'Class V': 16000, 'Class VI': 16000, 'Class VII': 16000, 'Class VIII': 16000,
    'Class IX': 18500, 'Class X': 18500, 'Class XI': 22000, 'Class XII': 22000,
  };

  // ── Fee Engine seed (v2) ─────────────────────────────────────
  // 1. Seed FeeComponents (tenant-level reusable definitions)
  const compNames = ['Tuition Fee', 'Development Fee', 'Library Fee', 'Lab Fee', 'Sports Fee', 'Computer Fee'];
  const feeComps: Record<string, string> = {};
  for (const [i, name] of compNames.entries()) {
    const fc = await prisma.feeComponent.upsert({
      where: { tenantId_name: { tenantId: sundarban.id, name } },
      update: {},
      create: { tenantId: sundarban.id, name, isOptional: false, displayOrder: i },
    });
    feeComps[name] = fc.id;
  }

  // 2. StudentCategory — Day Scholar (default)
  const dayCat = await prisma.studentCategory.upsert({
    where: { tenantId_name: { tenantId: sundarban.id, name: 'Day Scholar' } },
    update: {},
    create: { tenantId: sundarban.id, name: 'Day Scholar' },
  });

  // 3. FeePlans per grade band + installment templates
  const feeBands = [
    { grades: ['Class V','Class VI','Class VII','Class VIII'], name: 'Class V–VIII · Day Scholar · 2024-25', tuition: 16000, dev: 2000, lib: 500 },
    { grades: ['Class IX','Class X'],                          name: 'Class IX–X · Day Scholar · 2024-25',  tuition: 18500, dev: 3000, lib: 700 },
    { grades: ['Class XI','Class XII'],                        name: 'Class XI–XII · Day Scholar · 2024-25', tuition: 22000, dev: 3500, lib: 700 },
  ];
  const gradePlanMap: Record<string, string> = {}; // gradeName → feePlanId

  for (const band of feeBands) {
    let plan = await prisma.feePlan.findFirst({ where: { tenantId: sundarban.id, name: band.name } });
    if (!plan) {
      plan = await prisma.feePlan.create({
        data: {
          tenantId: sundarban.id, academicYearId: ay2025.id,
          name: band.name, studentCategoryId: dayCat.id, isActive: true,
        },
      });
      // Link grades
      for (const gName of band.grades) {
        const gId = grades[gName];
        if (gId) {
          await prisma.feePlanGrade.upsert({
            where: { planId_gradeId: { planId: plan.id, gradeId: gId } },
            update: {}, create: { planId: plan.id, gradeId: gId },
          });
        }
      }
      // Line items
      const items = [
        { name: 'Tuition Fee', amount: band.tuition },
        { name: 'Development Fee', amount: band.dev },
        { name: 'Library Fee', amount: band.lib },
      ];
      for (const [i, item] of items.entries()) {
        await prisma.feePlanItem.upsert({
          where: { planId_componentId: { planId: plan.id, componentId: feeComps[item.name] } },
          update: {},
          create: { planId: plan.id, componentId: feeComps[item.name], amount: item.amount, frequency: 'ANNUAL', displayOrder: i },
        });
      }
      // Custom schedule — 2 installments (Term 1 = 50%, Term 2 = 50%)
      const schedule = await prisma.feeCustomSchedule.upsert({
        where: { planId: plan.id },
        update: {},
        create: { planId: plan.id },
      });
      await prisma.feeCustomInstallment.deleteMany({ where: { scheduleId: schedule.id } });
      await prisma.feeCustomInstallment.createMany({
        data: [
          { scheduleId: schedule.id, name: 'Term 1', percentage: 50, dueDay: 15, dueMonth: 7, displayOrder: 0 },
          { scheduleId: schedule.id, name: 'Term 2', percentage: 50, dueDay: 15, dueMonth: 1, displayOrder: 1 },
        ],
      });
    }
    for (const gName of band.grades) gradePlanMap[gName] = plan.id;
  }

  // 4. ConcessionTemplate examples
  const concessionDefs = [
    { name: 'Staff Ward', type: 'PERCENTAGE' as const, value: 50, applicableTo: 'SPECIFIC_COMPONENTS' as const, componentIds: [feeComps['Tuition Fee']], isStackable: false },
    { name: 'Sibling Discount', type: 'PERCENTAGE' as const, value: 10, applicableTo: 'ALL_COMPONENTS' as const, componentIds: [], isStackable: true },
    { name: 'Merit Scholarship', type: 'FLAT_AMOUNT' as const, value: 5000, applicableTo: 'SPECIFIC_COMPONENTS' as const, componentIds: [feeComps['Tuition Fee']], isStackable: true },
    { name: 'RTE Quota', type: 'PERCENTAGE' as const, value: 100, applicableTo: 'SPECIFIC_COMPONENTS' as const, componentIds: [feeComps['Tuition Fee']], isStackable: false },
  ];
  for (const cd of concessionDefs) {
    await prisma.concessionTemplate.upsert({
      where: { tenantId_name: { tenantId: sundarban.id, name: cd.name } },
      update: {}, create: { tenantId: sundarban.id, ...cd },
    });
  }

  const studentIds: Record<string, string> = {};
  for (const s of studentDefs) {
    const existing = await prisma.student.findUnique({
      where: { tenantId_admissionNo: { tenantId: sundarban.id, admissionNo: s.no } },
    });
    let student;
    if (existing) {
      student = existing;
    } else {
      student = await prisma.student.create({
        data: {
          tenantId: sundarban.id, admissionNo: s.no, name: s.name, rollNo: s.roll,
          dateOfBirth: new Date(s.dob), gender: s.gender, bloodGroup: s.blood, house: s.house,
          gradeId: grades[s.grade], sectionId: sections[`${s.grade}-${s.sec}`],
          admissionDate: new Date('2023-06-01'), address: s.addr, city: 'Kolkata', state: 'West Bengal',
          attendancePercent: s.att, isActive: true,
        },
      });
    }
    studentIds[s.no] = student.id;

    // Parent
    const existingParent = await prisma.parent.findFirst({ where: { tenantId: sundarban.id, phone: s.phone } });
    let parent;
    if (existingParent) {
      parent = existingParent;
    } else {
      parent = await prisma.parent.create({
        data: {
          tenantId: sundarban.id, fatherName: s.father, motherName: s.mother,
          phone: s.phone, email: s.email, occupation: s.occ,
        },
      });
    }

    await prisma.studentParent.upsert({
      where: { studentId_parentId: { studentId: student.id, parentId: parent.id } },
      update: {},
      create: { studentId: student.id, parentId: parent.id, relation: 'FATHER', isPrimary: true },
    });

    // Fee account — linked to plan
    const planId = gradePlanMap[s.grade];
    if (planId) {
      const annualAmt = feeAnnual[s.grade] ?? 16000;
      const feeVal = s.fee as FeeStatus;
      const paid = feeVal === FeeStatus.PAID ? annualAmt : feeVal === FeeStatus.PARTIAL ? annualAmt * 0.5 : 0;
      const balance = annualAmt - paid;

      let feeAcc = await prisma.feeAccount.findUnique({ where: { studentId: student.id } });
      if (!feeAcc) {
        // Create assignment first
        const assignment = await prisma.studentFeeAssignment.upsert({
          where: { studentId: student.id },
          update: {},
          create: {
            tenantId: sundarban.id, studentId: student.id,
            feePlanId: planId, academicYearId: ay2025.id,
            studentCategoryId: dayCat.id,
          },
        });

        feeAcc = await prisma.feeAccount.create({
          data: {
            tenantId: sundarban.id, studentId: student.id,
            gradeId: grades[s.grade], academicYearId: ay2025.id,
            feePlanId: planId, assignmentId: assignment.id,
            studentCategoryId: dayCat.id,
            totalDue: annualAmt, totalPaid: paid, balance, status: s.fee,
          },
        });

        // Installments
        await prisma.feeInstallment.createMany({
          data: [
            { feeAccountId: feeAcc.id, termLabel: 'Term 1', amount: annualAmt / 2, dueDate: new Date('2024-07-15'), paidAmount: paid >= annualAmt / 2 ? annualAmt / 2 : paid, status: feeVal === FeeStatus.PAID ? FeeStatus.PAID : feeVal },
            { feeAccountId: feeAcc.id, termLabel: 'Term 2', amount: annualAmt / 2, dueDate: new Date('2025-01-15'), paidAmount: paid > annualAmt / 2 ? paid - annualAmt / 2 : 0, status: feeVal },
          ],
        });

        if (feeVal === FeeStatus.PAID) {
          await prisma.feeTransaction.create({
            data: {
              tenantId: sundarban.id, feeAccountId: feeAcc.id, amount: annualAmt,
              mode: TransactionMode.UPI, receiptNo: `RCP2025-${s.no}`, status: 'SUCCESS',
            },
          });
        }
      }
    }
  }

  // ── Attendance (today + yesterday) ────────────────────────────
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  const mainSections = ['Class V-A','Class VI-A','Class VII-A','Class VIII-A','Class IX-A','Class X-A','Class XI-A','Class XII-A'];
  const gradeStudents: Record<string, string[]> = {};
  for (const s of studentDefs) {
    const key = `${s.grade}-${s.sec}`;
    if (!gradeStudents[key]) gradeStudents[key] = [];
    gradeStudents[key].push(studentIds[s.no]);
  }

  const firstTeacherId = Object.values(teachers)[0];
  for (const date of [today, yesterday]) {
    for (const sectionKey of mainSections) {
      const sectionId = sections[sectionKey];
      if (!sectionId) continue;
      const sIds = gradeStudents[sectionKey] ?? [];
      if (sIds.length === 0) continue;

      let session = await prisma.attendanceSession.findFirst({
        where: { sectionId, date },
      });
      if (!session) {
        session = await prisma.attendanceSession.create({
          data: {
            tenantId: sundarban.id, sectionId, teacherId: firstTeacherId,
            date, periodNo: 0, markedAt: new Date(),
          },
        });
      }

      for (let i = 0; i < sIds.length; i++) {
        const sid = sIds[i];
        const isAbsent = i === 1; // 2nd student in each section is absent
        await prisma.attendanceRecord.upsert({
          where: { sessionId_studentId: { sessionId: session.id, studentId: sid } },
          update: {},
          create: {
            sessionId: session.id, studentId: sid,
            status: isAbsent ? 'ABSENT' : 'PRESENT',
            reason: isAbsent ? 'Sick' : undefined,
            parentNotified: isAbsent,
          },
        });
      }
    }
  }

  // ── Library Books ─────────────────────────────────────────────
  const bookDefs = [
    { title: 'ICSE Mathematics Class X', author: 'R.D. Sharma', genre: 'Textbook', isbn: '978-81-219-1234-5', copies: 4 },
    { title: 'ICSE Physics Class XI', author: 'H.C. Verma', genre: 'Textbook', isbn: '978-81-219-1235-2', copies: 3 },
    { title: 'English Literature Anthology', author: 'Various Authors', genre: 'Literature', isbn: '978-81-219-1236-9', copies: 5 },
    { title: 'A Brief History of Time', author: 'Stephen Hawking', genre: 'Science', isbn: '978-0-553-38016-3', copies: 2 },
    { title: 'Gitanjali', author: 'Rabindranath Tagore', genre: 'Poetry', isbn: '978-81-228-0001-1', copies: 4 },
    { title: 'Wings of Fire', author: 'A.P.J. Abdul Kalam', genre: 'Biography', isbn: '978-81-7371-146-6', copies: 3 },
    { title: 'The Discovery of India', author: 'Jawaharlal Nehru', genre: 'History', isbn: '978-81-7236-126-8', copies: 2 },
    { title: 'ICSE Chemistry Guide X', author: 'B.P. Bhatt', genre: 'Textbook', isbn: '978-81-219-1237-6', copies: 4 },
    { title: 'Godan', author: 'Munshi Premchand', genre: 'Fiction', isbn: '978-81-288-0123-4', copies: 2 },
    { title: 'Python Programming Basics', author: 'Eric Matthes', genre: 'Technology', isbn: '978-1-59327-603-4', copies: 3 },
    { title: 'Environmental Science ICSE IX', author: 'Smita Banerjee', genre: 'Textbook', isbn: '978-81-219-1238-3', copies: 4 },
    { title: 'Feluda Samagra Vol 1', author: 'Satyajit Ray', genre: 'Mystery', isbn: '978-81-291-2001-5', copies: 3 },
    { title: 'ICSE Geography Class X', author: 'G.B. Desai', genre: 'Textbook', isbn: '978-81-219-1239-0', copies: 4 },
    { title: 'Malgudi Days', author: 'R.K. Narayan', genre: 'Fiction', isbn: '978-0-14-303980-7', copies: 2 },
    { title: 'The Alchemist', author: 'Paulo Coelho', genre: 'Fiction', isbn: '978-0-06-112241-5', copies: 2 },
    { title: 'ICSE Biology Class X', author: 'P.S. Dhami', genre: 'Textbook', isbn: '978-81-219-1240-6', copies: 4 },
    { title: 'To Kill a Mockingbird', author: 'Harper Lee', genre: 'Fiction', isbn: '978-0-06-112008-4', copies: 2 },
    { title: 'Chanakya Niti', author: 'B.K. Chaturvedi', genre: 'Philosophy', isbn: '978-81-7246-333-2', copies: 2 },
    { title: 'Class XI Commerce Guide', author: 'T.S. Grewal', genre: 'Textbook', isbn: '978-81-219-1241-3', copies: 3 },
    { title: 'Indian Polity', author: 'M. Laxmikanth', genre: 'Political Science', isbn: '978-93-5260-864-6', copies: 2 },
    { title: 'Arithmetic for Competitive Exams', author: 'R.S. Aggarwal', genre: 'Reference', isbn: '978-81-219-0105-9', copies: 3 },
    { title: 'Tagore Stories for Children', author: 'Rabindranath Tagore', genre: 'Children', isbn: '978-81-228-0002-8', copies: 4 },
    { title: 'Atlas of India', author: 'Orient BlackSwan', genre: 'Reference', isbn: '978-81-250-3455-2', copies: 2 },
    { title: 'ICSE History Class IX', author: 'David Waugh', genre: 'Textbook', isbn: '978-81-219-1242-0', copies: 4 },
    { title: 'Sherlock Holmes Complete', author: 'Arthur Conan Doyle', genre: 'Mystery', isbn: '978-0-14-043765-1', copies: 2 },
    { title: 'Science Quiz Book', author: 'Jayant Narlikar', genre: 'Quiz', isbn: '978-81-7991-234-1', copies: 3 },
    { title: 'Class XII Economics ICSE', author: 'S.K. Agarwal', genre: 'Textbook', isbn: '978-81-219-1243-7', copies: 3 },
    { title: 'Diary of a Young Girl', author: 'Anne Frank', genre: 'Biography', isbn: '978-0-14-303408-6', copies: 2 },
    { title: 'General Knowledge 2025', author: 'Manohar Pandey', genre: 'Reference', isbn: '978-93-5167-821-4', copies: 4 },
    { title: 'Computer Networks Basics', author: 'Andrew Tanenbaum', genre: 'Technology', isbn: '978-0-13-468830-4', copies: 2 },
  ];

  const bookIds: string[] = [];
  for (const b of bookDefs) {
    let book = await prisma.book.findFirst({ where: { tenantId: sundarban.id, isbn: b.isbn } });
    if (!book) {
      book = await prisma.book.create({
        data: { tenantId: sundarban.id, ...b, available: b.copies - 1 },
      });
    }
    bookIds.push(book.id);
  }

  // Issue some books
  const studentArr = Object.values(studentIds);
  const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 14);
  const overdueDue = new Date(); overdueDue.setDate(overdueDue.getDate() - 5);
  for (let i = 0; i < Math.min(8, studentArr.length); i++) {
    const existing = await prisma.bookIssue.findFirst({ where: { bookId: bookIds[i], studentId: studentArr[i], status: 'ISSUED' } });
    if (!existing) {
      await prisma.bookIssue.create({
        data: {
          bookId: bookIds[i], studentId: studentArr[i],
          issuedAt: new Date(), dueDate: i < 6 ? dueDate : overdueDue,
          status: i < 6 ? BookIssueStatus.ISSUED : BookIssueStatus.OVERDUE,
        },
      });
    }
  }

  // ── Transport Routes ──────────────────────────────────────────
  const driverDefs = [
    { name: 'Ramprasad Yadav', phone: '9831200001', license: 'WB0520190001234' },
    { name: 'Sunil Kumar Gupta', phone: '9831200002', license: 'WB0520180002345' },
    { name: 'Mohan Lal Singh', phone: '9831200003', license: 'WB0520200003456' },
    { name: 'Karim Sheikh', phone: '9831200004', license: 'WB0520170004567' },
    { name: 'Bablu Das', phone: '9831200005', license: 'WB0520210005678' },
  ];

  const driverIds: string[] = [];
  for (const d of driverDefs) {
    let driver = await prisma.vehicleDriver.findFirst({ where: { tenantId: sundarban.id, phone: d.phone } });
    if (!driver) {
      driver = await prisma.vehicleDriver.create({
        data: { tenantId: sundarban.id, name: d.name, phone: d.phone, licenseNo: d.license, isActive: true },
      });
    }
    driverIds.push(driver.id);
  }

  const vehicleDefs = [
    { vehicleNo: 'WB 02 AB 1234', capacity: 45 },
    { vehicleNo: 'WB 02 CD 5678', capacity: 40 },
    { vehicleNo: 'WB 02 EF 9012', capacity: 42 },
    { vehicleNo: 'WB 02 GH 3456', capacity: 38 },
    { vehicleNo: 'WB 02 IJ 7890', capacity: 35 },
  ];

  const vehicleIds: string[] = [];
  for (let i = 0; i < vehicleDefs.length; i++) {
    let vehicle = await prisma.transportVehicle.findUnique({ where: { tenantId_vehicleNo: { tenantId: sundarban.id, vehicleNo: vehicleDefs[i].vehicleNo } } });
    if (!vehicle) {
      vehicle = await prisma.transportVehicle.create({
        data: { tenantId: sundarban.id, ...vehicleDefs[i], driverId: driverIds[i], isActive: true },
      });
    }
    vehicleIds.push(vehicle.id);
  }

  const routeDefs = [
    { name: 'Behala Express', code: 'R01', vehicleIdx: 0, stops: [
        { stopName: 'Behala Chowrasta', order: 1, time: '07:00', count: 12 },
        { stopName: 'Thakurpukur', order: 2, time: '07:15', count: 8 },
        { stopName: 'Joka Metro', order: 3, time: '07:30', count: 6 },
        { stopName: 'Diamond Harbour Road', order: 4, time: '07:45', count: 10 },
        { stopName: 'Sundarban Academy', order: 5, time: '08:00', count: 0 },
      ]},
    { name: 'Jadavpur Circle', code: 'R02', vehicleIdx: 1, stops: [
        { stopName: 'Jadavpur Uni Gate', order: 1, time: '07:05', count: 9 },
        { stopName: 'Gariahat Crossing', order: 2, time: '07:20', count: 7 },
        { stopName: 'Ballygunge Phari', order: 3, time: '07:35', count: 11 },
        { stopName: 'Sundarban Academy', order: 4, time: '08:00', count: 0 },
      ]},
    { name: 'Tollygunge Route', code: 'R03', vehicleIdx: 2, stops: [
        { stopName: 'Tollygunge Metro', order: 1, time: '07:10', count: 14 },
        { stopName: 'Netaji Nagar', order: 2, time: '07:25', count: 8 },
        { stopName: 'New Alipore', order: 3, time: '07:40', count: 9 },
        { stopName: 'Sundarban Academy', order: 4, time: '08:00', count: 0 },
      ]},
    { name: 'Alipore Express', code: 'R04', vehicleIdx: 3, stops: [
        { stopName: 'Alipore Zoo Gate', order: 1, time: '07:15', count: 11 },
        { stopName: 'Hastings', order: 2, time: '07:30', count: 8 },
        { stopName: 'Kidderpore', order: 3, time: '07:45', count: 7 },
        { stopName: 'Sundarban Academy', order: 4, time: '08:00', count: 0 },
      ]},
    { name: 'Park Street Circuit', code: 'R05', vehicleIdx: 4, stops: [
        { stopName: 'Park Street Metro', order: 1, time: '07:20', count: 10 },
        { stopName: 'Minto Park', order: 2, time: '07:35', count: 9 },
        { stopName: 'Sundarban Academy', order: 3, time: '08:00', count: 0 },
      ]},
  ];

  for (const r of routeDefs) {
    let route = await prisma.transportRoute.findFirst({ where: { tenantId: sundarban.id, routeCode: r.code } });
    if (!route) {
      route = await prisma.transportRoute.create({
        data: { tenantId: sundarban.id, routeName: r.name, routeCode: r.code, vehicleId: vehicleIds[r.vehicleIdx], isActive: true },
      });
      for (const stop of r.stops) {
        await prisma.routeStop.create({
          data: { routeId: route.id, stopName: stop.stopName, stopOrder: stop.order, arrivalTime: stop.time, studentCount: stop.count },
        });
      }
    }
  }

  // ── Nurse Logs ────────────────────────────────────────────────
  const nurseLogs = [
    { sNo: 'SA2024002', complaint: 'Fever and headache', action: 'Paracetamol administered, sent home', referred: true, notified: true, days: 0 },
    { sNo: 'SA2024007', complaint: 'Stomach ache', action: 'Rest for 30 min, warm water given', referred: false, notified: true, days: 1 },
    { sNo: 'SA2024013', complaint: 'Knee scrape from playground', action: 'Wound cleaned and bandaged', referred: false, notified: false, days: 2 },
    { sNo: 'SA2024018', complaint: 'Dizziness, skipped breakfast', action: 'Glucose water given, rested', referred: false, notified: true, days: 3 },
    { sNo: 'SA2024026', complaint: 'Anxiety before exam', action: 'Counselling session, deep breathing', referred: false, notified: false, days: 4 },
    { sNo: 'SA2024030', complaint: 'Severe headache, vision blurred', action: 'Paracetamol, referred to ophthalmologist', referred: true, notified: true, days: 5 },
    { sNo: 'SA2024001', complaint: 'Asthma attack (mild)', action: 'Inhaler used, rested for 45 min', referred: false, notified: true, days: 6 },
    { sNo: 'SA2024015', complaint: 'Tooth pain', action: 'Clove oil applied, dentist referral', referred: true, notified: true, days: 7 },
    { sNo: 'SA2024022', complaint: 'Nausea, vomiting once', action: 'ORS given, sent home after 1 hour', referred: false, notified: true, days: 8 },
    { sNo: 'SA2024035', complaint: 'Sprained ankle during PE', action: 'Cold compress, bandage applied', referred: false, notified: true, days: 9 },
    { sNo: 'SA2024004', complaint: 'Eye irritation', action: 'Eye drops, rest in dark room', referred: false, notified: false, days: 10 },
    { sNo: 'SA2024028', complaint: 'Cut on finger (craft class)', action: 'Antiseptic, plaster applied', referred: false, notified: false, days: 11 },
    { sNo: 'SA2024032', complaint: 'Cold and runny nose', action: 'Antihistamine, advised to wear mask', referred: false, notified: true, days: 12 },
    { sNo: 'SA2024039', complaint: 'Chest pain (stress related)', action: 'Rest, counsellor notified', referred: true, notified: true, days: 13 },
    { sNo: 'SA2024010', complaint: 'Insect sting on arm', action: 'Antihistamine cream applied', referred: false, notified: false, days: 14 },
  ];

  for (const log of nurseLogs) {
    const sid = studentIds[log.sNo];
    if (!sid) continue;
    const logDate = new Date(); logDate.setDate(logDate.getDate() - log.days); logDate.setHours(0, 0, 0, 0);
    const existing = await prisma.nurseLog.findFirst({ where: { tenantId: sundarban.id, studentId: sid, date: logDate } });
    if (!existing) {
      await prisma.nurseLog.create({
        data: {
          tenantId: sundarban.id, studentId: sid, date: logDate,
          complaint: log.complaint, actionTaken: log.action,
          referredToDoctor: log.referred, parentNotified: log.notified,
        },
      });
    }
  }

  // ── Admission Inquiries ───────────────────────────────────────
  const admissionDefs = [
    { name: 'Aryan Sharma', parent: 'Rakesh Sharma', phone: '9901000001', grade: 'Class VI', source: AdmissionSource.WALK_IN, stage: AdmissionStage.INQUIRY },
    { name: 'Shreya Bose', parent: 'Tapan Bose', phone: '9901000002', grade: 'Class I', source: AdmissionSource.SCHOOL_WEBSITE, stage: AdmissionStage.APPLICATION_RECEIVED },
    { name: 'Rohan Das', parent: 'Sunil Das', phone: '9901000003', grade: 'Class IX', source: AdmissionSource.REFERRAL, stage: AdmissionStage.DOCUMENTS_VERIFIED },
    { name: 'Nisha Ghosh', parent: 'Pradip Ghosh', phone: '9901000004', grade: 'Class III', source: AdmissionSource.CAMPAIGN, stage: AdmissionStage.INTERVIEW_SCHEDULED },
    { name: 'Kunal Mukherjee', parent: 'Ashok Mukherjee', phone: '9901000005', grade: 'Class XI', source: AdmissionSource.SCHOOL_WEBSITE, stage: AdmissionStage.OFFER_MADE },
    { name: 'Pritha Roy', parent: 'Avijit Roy', phone: '9901000006', grade: 'Class V', source: AdmissionSource.REFERRAL, stage: AdmissionStage.ENROLLED },
    { name: 'Siddharth Sen', parent: 'Bikash Sen', phone: '9901000007', grade: 'Nursery', source: AdmissionSource.WALK_IN, stage: AdmissionStage.INQUIRY },
    { name: 'Tanya Chatterjee', parent: 'Suresh Chatterjee', phone: '9901000008', grade: 'Class VII', source: AdmissionSource.SOCIAL_MEDIA, stage: AdmissionStage.APPLICATION_RECEIVED },
    { name: 'Rahul Mondal', parent: 'Tarun Mondal', phone: '9901000009', grade: 'Class X', source: AdmissionSource.WALK_IN, stage: AdmissionStage.REJECTED },
    { name: 'Anushka Pal', parent: 'Somen Pal', phone: '9901000010', grade: 'LKG', source: AdmissionSource.SCHOOL_WEBSITE, stage: AdmissionStage.INQUIRY },
    { name: 'Vivek Sarkar', parent: 'Biswajit Sarkar', phone: '9901000011', grade: 'Class VIII', source: AdmissionSource.REFERRAL, stage: AdmissionStage.DOCUMENTS_VERIFIED },
    { name: 'Sohini Biswas', parent: 'Dilip Biswas', phone: '9901000012', grade: 'Class II', source: AdmissionSource.CAMPAIGN, stage: AdmissionStage.INTERVIEW_SCHEDULED },
    { name: 'Ayan Dey', parent: 'Mrinal Dey', phone: '9901000013', grade: 'Class VI', source: AdmissionSource.WALK_IN, stage: AdmissionStage.OFFER_MADE },
    { name: 'Pallavi Nandi', parent: 'Amit Nandi', phone: '9901000014', grade: 'Class IV', source: AdmissionSource.SCHOOL_WEBSITE, stage: AdmissionStage.ENROLLED },
    { name: 'Debjit Saha', parent: 'Prodip Saha', phone: '9901000015', grade: 'Class XII', source: AdmissionSource.REFERRAL, stage: AdmissionStage.APPLICATION_RECEIVED },
    { name: 'Rima Banerjee', parent: 'Kalyan Banerjee', phone: '9901000016', grade: 'UKG', source: AdmissionSource.SOCIAL_MEDIA, stage: AdmissionStage.INQUIRY },
    { name: 'Amit Ganguly', parent: 'Subhas Ganguly', phone: '9901000017', grade: 'Class IX', source: AdmissionSource.WALK_IN, stage: AdmissionStage.DOCUMENTS_VERIFIED },
    { name: 'Deepa Chakraborty', parent: 'Nikhil Chakraborty', phone: '9901000018', grade: 'Class XI', source: AdmissionSource.CAMPAIGN, stage: AdmissionStage.INTERVIEW_SCHEDULED },
    { name: 'Sumit Mitra', parent: 'Probal Mitra', phone: '9901000019', grade: 'Class VII', source: AdmissionSource.SCHOOL_WEBSITE, stage: AdmissionStage.OFFER_MADE },
    { name: 'Payal Kundu', parent: 'Ratan Kundu', phone: '9901000020', grade: 'Class I', source: AdmissionSource.REFERRAL, stage: AdmissionStage.ENROLLED },
  ];

  for (const a of admissionDefs) {
    const existing = await prisma.admissionInquiry.findFirst({ where: { tenantId: sundarban.id, phone: a.phone } });
    if (!existing) {
      await prisma.admissionInquiry.create({
        data: {
          tenantId: sundarban.id, studentName: a.name, parentName: a.parent,
          phone: a.phone, applyingForGrade: a.grade, source: a.source, stage: a.stage,
          inquiryDate: new Date(Date.now() - Math.random() * 30 * 86400000),
        },
      });
    }
  }

  // ── Leave Requests ────────────────────────────────────────────
  const teacherArr = Object.values(teachers);
  const leaveTypes = ['Casual Leave', 'Medical Leave', 'Earned Leave', 'Maternity Leave'];
  for (let i = 0; i < Math.min(8, teacherArr.length); i++) {
    const existing = await prisma.leaveRequest.findFirst({ where: { tenantId: sundarban.id, teacherId: teacherArr[i] } });
    if (!existing) {
      const from = new Date(); from.setDate(from.getDate() + (i + 1) * 3);
      const to = new Date(from); to.setDate(to.getDate() + 1);
      await prisma.leaveRequest.create({
        data: {
          tenantId: sundarban.id, teacherId: teacherArr[i],
          leaveType: leaveTypes[i % leaveTypes.length],
          fromDate: from, toDate: to, days: 2,
          reason: 'Personal reasons', status: i < 3 ? LeaveStatus.APPROVED : i < 6 ? LeaveStatus.PENDING : LeaveStatus.REJECTED,
        },
      });
    }
  }

  // ── Payroll (current month) ───────────────────────────────────
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  for (const [code, staffId] of Object.entries(staffMap)) {
    const def = staffDefs.find(s => s.code === code);
    if (!def) continue;
    const basic = def.salary;
    const allowances = Math.round(basic * 0.2);
    const pf = Math.round(basic * 0.12);
    const tds = basic > 50000 ? Math.round(basic * 0.05) : 0;
    const net = basic + allowances - pf - tds;

    await prisma.payroll.upsert({
      where: { staffId_month_year: { staffId, month, year } },
      update: {},
      create: {
        tenantId: sundarban.id, staffId, month, year,
        basic, allowances, pfDeduction: pf, tdsDeduction: tds, netPay: net,
        status: 'PAID', paidAt: new Date(),
      },
    });
  }

  console.log('✅ Seed complete.');
  console.log(`   Sundarban Academy: ${sundarban.id}`);
  console.log(`   Muraliganj HS:     ${muraliganj.id}`);
  console.log(`   Students seeded:   ${studentDefs.length}`);
  console.log(`   Books seeded:      ${bookDefs.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
