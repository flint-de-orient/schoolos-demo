export const SUBJECT_CATEGORIES = [
  { value: 'CORE',            label: 'Core Academic',        icon: '📚', color: 'blue',   description: 'Mathematics, Science, History, Geography' },
  { value: 'LANGUAGE',        label: 'Language',             icon: '🗣️', color: 'green',  description: 'English, Hindi, Regional language, Foreign language…' },
  { value: 'ELECTIVE',        label: 'Elective',             icon: '🎓', color: 'purple', description: 'Commerce, Economics, Psychology, Accountancy…' },
  { value: 'PRACTICAL',       label: 'Practical / Lab',      icon: '🔬', color: 'teal',   description: 'Physics Lab, Chemistry Lab, Computer Lab…' },
  { value: 'SPORTS',          label: 'Sports & Games',       icon: '⚽', color: 'orange', description: 'Cricket, Football, Badminton, Chess, Athletics…' },
  { value: 'ARTS',            label: 'Arts',                 icon: '🎨', color: 'pink',   description: 'Music (Vocal/Instrumental), Dance, Drama, Drawing…' },
  { value: 'TECHNOLOGY',      label: 'Technology',           icon: '🤖', color: 'indigo', description: 'Robotics, Coding, AI, Electronics, 3D Printing…' },
  { value: 'VALUE_EDUCATION', label: 'Value Education',      icon: '🌿', color: 'amber',  description: 'Moral Science, Environmental Studies, Yoga, Meditation…' },
  { value: 'REMEDIAL',        label: 'Remedial Support',     icon: '🆘', color: 'red',    description: 'Remedial classes for below-average performers' },
  { value: 'ENRICHMENT',      label: 'Enrichment',           icon: '🏆', color: 'yellow', description: 'Olympiad, NEET/JEE/IELTS coaching, Scholarship prep, beyond-curriculum programs' },
] as const;

export const LANGUAGE_LEVELS = [
  { value: 'L1', label: 'First Language',             description: 'Primary / medium of instruction' },
  { value: 'L2', label: 'Second Language',             description: 'Regional or modern Indian language' },
  { value: 'L3', label: 'Third Language',              description: 'Additional language' },
  { value: 'L4', label: 'Fourth Language (Optional)',  description: 'Classical or foreign language' },
] as const;

export const SCHEDULING_SLOTS = [
  { value: 'REGULAR',       label: 'Regular Period',   description: 'Scheduled in the main timetable grid' },
  { value: 'ACTIVITY',      label: 'Activity Period',  description: 'Dedicated activity period (after academics)' },
  { value: 'DOUBLE_PERIOD', label: 'Double Period',    description: 'Requires back-to-back periods' },
  { value: 'AFTER_SCHOOL',  label: 'After School',     description: 'Outside regular school hours' },
  { value: 'WEEKEND',       label: 'Weekend Only',     description: 'Saturday / Sunday sessions' },
] as const;
