// Seed data for BoardSyllabusRecommendation — covers WBBSE, CBSE, CISCE
// theoryPPW = theory periods per week, labPPW = lab/practical periods per week (0 = no lab)

export type SeedRec = {
  board: string;
  gradeLevel: string;
  subjectName: string;
  theoryPPW: number;
  labPPW: number;
  notes?: string;
};

export const BOARD_SEED: SeedRec[] = [
  // ── WBBSE ─────────────────────────────────────────────────────────────────────

  // Primary (Class I–V)
  { board: 'WBBSE', gradeLevel: 'Primary', subjectName: 'Bengali',                 theoryPPW: 8, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Primary', subjectName: 'English',                 theoryPPW: 6, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Primary', subjectName: 'Mathematics',             theoryPPW: 6, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Primary', subjectName: 'Environmental Studies',   theoryPPW: 4, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Primary', subjectName: 'Drawing',                 theoryPPW: 2, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Primary', subjectName: 'Physical Education',      theoryPPW: 2, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Primary', subjectName: 'Moral Science',           theoryPPW: 1, labPPW: 0 },

  // Middle (Class VI–VIII)
  { board: 'WBBSE', gradeLevel: 'Middle', subjectName: 'Bengali',                  theoryPPW: 6, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Middle', subjectName: 'English',                  theoryPPW: 5, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Middle', subjectName: 'Mathematics',              theoryPPW: 6, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Middle', subjectName: 'History',                  theoryPPW: 3, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Middle', subjectName: 'History & Civics',         theoryPPW: 4, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Middle', subjectName: 'Geography',                theoryPPW: 4, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Middle', subjectName: 'Life Science',             theoryPPW: 4, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Middle', subjectName: 'Physical Science',         theoryPPW: 4, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Middle', subjectName: 'Computer Application',     theoryPPW: 2, labPPW: 2, notes: 'Lab = 1 double period/week' },
  { board: 'WBBSE', gradeLevel: 'Middle', subjectName: 'Work Education',           theoryPPW: 2, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Middle', subjectName: 'Physical Education',       theoryPPW: 2, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Middle', subjectName: 'Drawing',                  theoryPPW: 2, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Middle', subjectName: 'Sanskrit',                 theoryPPW: 3, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Middle', subjectName: 'Hindi',                    theoryPPW: 3, labPPW: 0 },

  // Secondary (Class IX–X)
  { board: 'WBBSE', gradeLevel: 'Secondary', subjectName: 'Bengali',               theoryPPW: 7, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Secondary', subjectName: 'English',               theoryPPW: 6, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Secondary', subjectName: 'Mathematics',           theoryPPW: 7, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Secondary', subjectName: 'History',               theoryPPW: 4, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Secondary', subjectName: 'Geography',             theoryPPW: 4, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Secondary', subjectName: 'Life Science',          theoryPPW: 5, labPPW: 2, notes: 'Lab = 1 double period/week' },
  { board: 'WBBSE', gradeLevel: 'Secondary', subjectName: 'Physical Science',      theoryPPW: 5, labPPW: 2, notes: 'Lab = 1 double period/week' },
  { board: 'WBBSE', gradeLevel: 'Secondary', subjectName: 'Computer Application',  theoryPPW: 3, labPPW: 2, notes: 'Lab = 1 double period/week' },
  { board: 'WBBSE', gradeLevel: 'Secondary', subjectName: 'Work Education',        theoryPPW: 2, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Secondary', subjectName: 'Physical Education',    theoryPPW: 2, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Secondary', subjectName: 'Sanskrit',              theoryPPW: 5, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Secondary', subjectName: 'Hindi',                 theoryPPW: 5, labPPW: 0 },

  // Senior Secondary (Class XI–XII)
  { board: 'WBBSE', gradeLevel: 'Senior Secondary', subjectName: 'Bengali',        theoryPPW: 6, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Senior Secondary', subjectName: 'English',        theoryPPW: 6, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Senior Secondary', subjectName: 'Mathematics',    theoryPPW: 6, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Senior Secondary', subjectName: 'Physics',        theoryPPW: 5, labPPW: 4, notes: 'Lab = 2 double periods/week' },
  { board: 'WBBSE', gradeLevel: 'Senior Secondary', subjectName: 'Chemistry',      theoryPPW: 5, labPPW: 4, notes: 'Lab = 2 double periods/week' },
  { board: 'WBBSE', gradeLevel: 'Senior Secondary', subjectName: 'Biology',        theoryPPW: 5, labPPW: 4, notes: 'Lab = 2 double periods/week' },
  { board: 'WBBSE', gradeLevel: 'Senior Secondary', subjectName: 'Computer Science', theoryPPW: 4, labPPW: 4, notes: 'Lab = 2 double periods/week' },
  { board: 'WBBSE', gradeLevel: 'Senior Secondary', subjectName: 'Geography',      theoryPPW: 6, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Senior Secondary', subjectName: 'History',        theoryPPW: 6, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Senior Secondary', subjectName: 'Political Science', theoryPPW: 6, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Senior Secondary', subjectName: 'Accountancy',    theoryPPW: 6, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Senior Secondary', subjectName: 'Business Studies', theoryPPW: 6, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Senior Secondary', subjectName: 'Economics',      theoryPPW: 6, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Senior Secondary', subjectName: 'Sanskrit',       theoryPPW: 6, labPPW: 0 },
  { board: 'WBBSE', gradeLevel: 'Senior Secondary', subjectName: 'Physical Education', theoryPPW: 3, labPPW: 2 },

  // ── CBSE ──────────────────────────────────────────────────────────────────────

  // Primary (Class I–V)
  { board: 'CBSE', gradeLevel: 'Primary', subjectName: 'English',                  theoryPPW: 7, labPPW: 0 },
  { board: 'CBSE', gradeLevel: 'Primary', subjectName: 'Hindi',                    theoryPPW: 6, labPPW: 0 },
  { board: 'CBSE', gradeLevel: 'Primary', subjectName: 'Mathematics',              theoryPPW: 6, labPPW: 0 },
  { board: 'CBSE', gradeLevel: 'Primary', subjectName: 'Environmental Studies',    theoryPPW: 4, labPPW: 0 },
  { board: 'CBSE', gradeLevel: 'Primary', subjectName: 'Art Education',            theoryPPW: 2, labPPW: 0 },
  { board: 'CBSE', gradeLevel: 'Primary', subjectName: 'Health & Physical Education', theoryPPW: 2, labPPW: 0 },
  { board: 'CBSE', gradeLevel: 'Primary', subjectName: 'Bengali',                  theoryPPW: 4, labPPW: 0 },

  // Middle (Class VI–VIII)
  { board: 'CBSE', gradeLevel: 'Middle', subjectName: 'English',                   theoryPPW: 6, labPPW: 0 },
  { board: 'CBSE', gradeLevel: 'Middle', subjectName: 'Hindi',                     theoryPPW: 5, labPPW: 0 },
  { board: 'CBSE', gradeLevel: 'Middle', subjectName: 'Mathematics',               theoryPPW: 6, labPPW: 0 },
  { board: 'CBSE', gradeLevel: 'Middle', subjectName: 'Science',                   theoryPPW: 5, labPPW: 2, notes: 'Lab = 1 double period/week' },
  { board: 'CBSE', gradeLevel: 'Middle', subjectName: 'Social Science',            theoryPPW: 5, labPPW: 0 },
  { board: 'CBSE', gradeLevel: 'Middle', subjectName: 'Sanskrit',                  theoryPPW: 3, labPPW: 0 },
  { board: 'CBSE', gradeLevel: 'Middle', subjectName: 'Bengali',                   theoryPPW: 3, labPPW: 0 },
  { board: 'CBSE', gradeLevel: 'Middle', subjectName: 'Computer Science',          theoryPPW: 2, labPPW: 2 },
  { board: 'CBSE', gradeLevel: 'Middle', subjectName: 'Art Education',             theoryPPW: 2, labPPW: 0 },
  { board: 'CBSE', gradeLevel: 'Middle', subjectName: 'Health & Physical Education', theoryPPW: 2, labPPW: 0 },

  // Secondary (Class IX–X)
  { board: 'CBSE', gradeLevel: 'Secondary', subjectName: 'English',                theoryPPW: 6, labPPW: 0 },
  { board: 'CBSE', gradeLevel: 'Secondary', subjectName: 'Hindi',                  theoryPPW: 5, labPPW: 0 },
  { board: 'CBSE', gradeLevel: 'Secondary', subjectName: 'Mathematics',            theoryPPW: 6, labPPW: 0 },
  { board: 'CBSE', gradeLevel: 'Secondary', subjectName: 'Science',                theoryPPW: 5, labPPW: 2, notes: 'Practical = 1 double period/week' },
  { board: 'CBSE', gradeLevel: 'Secondary', subjectName: 'Social Science',         theoryPPW: 5, labPPW: 0 },
  { board: 'CBSE', gradeLevel: 'Secondary', subjectName: 'Sanskrit',               theoryPPW: 5, labPPW: 0 },
  { board: 'CBSE', gradeLevel: 'Secondary', subjectName: 'Bengali',                theoryPPW: 5, labPPW: 0 },
  { board: 'CBSE', gradeLevel: 'Secondary', subjectName: 'Computer Applications',  theoryPPW: 3, labPPW: 2 },
  { board: 'CBSE', gradeLevel: 'Secondary', subjectName: 'Information Technology', theoryPPW: 3, labPPW: 2 },
  { board: 'CBSE', gradeLevel: 'Secondary', subjectName: 'Health & Physical Education', theoryPPW: 2, labPPW: 0 },
  { board: 'CBSE', gradeLevel: 'Secondary', subjectName: 'Art Education',          theoryPPW: 2, labPPW: 0 },

  // Senior Secondary (Class XI–XII)
  { board: 'CBSE', gradeLevel: 'Senior Secondary', subjectName: 'English',         theoryPPW: 6, labPPW: 0 },
  { board: 'CBSE', gradeLevel: 'Senior Secondary', subjectName: 'Physics',         theoryPPW: 5, labPPW: 4, notes: 'Practical = 2 double periods/week' },
  { board: 'CBSE', gradeLevel: 'Senior Secondary', subjectName: 'Chemistry',       theoryPPW: 5, labPPW: 4, notes: 'Practical = 2 double periods/week' },
  { board: 'CBSE', gradeLevel: 'Senior Secondary', subjectName: 'Biology',         theoryPPW: 5, labPPW: 4, notes: 'Practical = 2 double periods/week' },
  { board: 'CBSE', gradeLevel: 'Senior Secondary', subjectName: 'Mathematics',     theoryPPW: 6, labPPW: 0 },
  { board: 'CBSE', gradeLevel: 'Senior Secondary', subjectName: 'Computer Science', theoryPPW: 4, labPPW: 4 },
  { board: 'CBSE', gradeLevel: 'Senior Secondary', subjectName: 'History',         theoryPPW: 6, labPPW: 0 },
  { board: 'CBSE', gradeLevel: 'Senior Secondary', subjectName: 'Political Science', theoryPPW: 6, labPPW: 0 },
  { board: 'CBSE', gradeLevel: 'Senior Secondary', subjectName: 'Geography',       theoryPPW: 6, labPPW: 0 },
  { board: 'CBSE', gradeLevel: 'Senior Secondary', subjectName: 'Economics',       theoryPPW: 6, labPPW: 0 },
  { board: 'CBSE', gradeLevel: 'Senior Secondary', subjectName: 'Accountancy',     theoryPPW: 6, labPPW: 0 },
  { board: 'CBSE', gradeLevel: 'Senior Secondary', subjectName: 'Business Studies', theoryPPW: 6, labPPW: 0 },
  { board: 'CBSE', gradeLevel: 'Senior Secondary', subjectName: 'Physical Education', theoryPPW: 3, labPPW: 2 },

  // ── CISCE / ICSE / ISC ────────────────────────────────────────────────────────

  // Primary (Class I–V)
  { board: 'CISCE', gradeLevel: 'Primary', subjectName: 'English',                 theoryPPW: 8, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Primary', subjectName: 'Hindi',                   theoryPPW: 5, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Primary', subjectName: 'Bengali',                 theoryPPW: 5, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Primary', subjectName: 'Mathematics',             theoryPPW: 6, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Primary', subjectName: 'Environmental Science',   theoryPPW: 4, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Primary', subjectName: 'Computer Studies',        theoryPPW: 2, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Primary', subjectName: 'Art & Craft',             theoryPPW: 2, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Primary', subjectName: 'Physical Education',      theoryPPW: 2, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Primary', subjectName: 'Moral Science',           theoryPPW: 1, labPPW: 0 },

  // Middle (Class VI–VIII)
  { board: 'CISCE', gradeLevel: 'Middle', subjectName: 'English',                  theoryPPW: 8, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Middle', subjectName: 'Hindi',                    theoryPPW: 5, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Middle', subjectName: 'Bengali',                  theoryPPW: 5, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Middle', subjectName: 'Mathematics',              theoryPPW: 6, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Middle', subjectName: 'History & Civics',         theoryPPW: 4, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Middle', subjectName: 'Geography',                theoryPPW: 4, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Middle', subjectName: 'Science',                  theoryPPW: 5, labPPW: 2, notes: 'Lab = 1 double period/week' },
  { board: 'CISCE', gradeLevel: 'Middle', subjectName: 'Computer Studies',         theoryPPW: 2, labPPW: 2 },
  { board: 'CISCE', gradeLevel: 'Middle', subjectName: 'Art',                      theoryPPW: 2, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Middle', subjectName: 'Physical Education',       theoryPPW: 2, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Middle', subjectName: 'Moral Science',            theoryPPW: 1, labPPW: 0 },

  // Secondary (Class IX–X)
  { board: 'CISCE', gradeLevel: 'Secondary', subjectName: 'English',               theoryPPW: 7, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Secondary', subjectName: 'Hindi',                 theoryPPW: 5, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Secondary', subjectName: 'Bengali',               theoryPPW: 5, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Secondary', subjectName: 'Mathematics',           theoryPPW: 6, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Secondary', subjectName: 'History & Civics',      theoryPPW: 4, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Secondary', subjectName: 'Geography',             theoryPPW: 4, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Secondary', subjectName: 'Physics',               theoryPPW: 4, labPPW: 2, notes: 'Lab = 1 double period/week' },
  { board: 'CISCE', gradeLevel: 'Secondary', subjectName: 'Chemistry',             theoryPPW: 4, labPPW: 2, notes: 'Lab = 1 double period/week' },
  { board: 'CISCE', gradeLevel: 'Secondary', subjectName: 'Biology',               theoryPPW: 4, labPPW: 2, notes: 'Lab = 1 double period/week' },
  { board: 'CISCE', gradeLevel: 'Secondary', subjectName: 'Computer Applications', theoryPPW: 3, labPPW: 2 },
  { board: 'CISCE', gradeLevel: 'Secondary', subjectName: 'Environmental Science', theoryPPW: 4, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Secondary', subjectName: 'Physical Education',    theoryPPW: 2, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Secondary', subjectName: 'Art',                   theoryPPW: 2, labPPW: 0 },

  // Senior Secondary (Class XI–XII)
  { board: 'CISCE', gradeLevel: 'Senior Secondary', subjectName: 'English',        theoryPPW: 7, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Senior Secondary', subjectName: 'Physics',        theoryPPW: 5, labPPW: 4, notes: 'Practical = 2 double periods/week' },
  { board: 'CISCE', gradeLevel: 'Senior Secondary', subjectName: 'Chemistry',      theoryPPW: 5, labPPW: 4, notes: 'Practical = 2 double periods/week' },
  { board: 'CISCE', gradeLevel: 'Senior Secondary', subjectName: 'Biology',        theoryPPW: 5, labPPW: 4, notes: 'Practical = 2 double periods/week' },
  { board: 'CISCE', gradeLevel: 'Senior Secondary', subjectName: 'Mathematics',    theoryPPW: 6, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Senior Secondary', subjectName: 'Computer Science', theoryPPW: 4, labPPW: 4 },
  { board: 'CISCE', gradeLevel: 'Senior Secondary', subjectName: 'History',        theoryPPW: 6, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Senior Secondary', subjectName: 'Political Science', theoryPPW: 6, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Senior Secondary', subjectName: 'Geography',      theoryPPW: 6, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Senior Secondary', subjectName: 'Economics',      theoryPPW: 6, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Senior Secondary', subjectName: 'Accounts',       theoryPPW: 6, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Senior Secondary', subjectName: 'Commerce',       theoryPPW: 6, labPPW: 0 },
  { board: 'CISCE', gradeLevel: 'Senior Secondary', subjectName: 'Physical Education', theoryPPW: 3, labPPW: 2 },
];
