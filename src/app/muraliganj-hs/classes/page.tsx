'use client';

import { Users, BookOpen, CheckCircle2 } from 'lucide-react';
import classesData  from '@/data/muraliganj/classes.json';
import teachersData from '@/data/muraliganj/teachers.json';
import schoolData   from '@/data/muraliganj/school.json';

const teacherMap  = Object.fromEntries(teachersData.map(t => [t.id, t.name]));

const subjectsByClass: Record<string, string[]> = {
  'V':   ['Bengali', 'English', 'Mathematics', 'History', 'Geography', 'Science', 'Physical Education'],
  'VI':  ['Bengali', 'English', 'Mathematics', 'History', 'Geography', 'Science', 'Physical Education'],
  'VII': ['Bengali', 'English', 'Mathematics', 'History', 'Geography', 'Science', 'Physical Education'],
  'VIII':['Bengali', 'English', 'Mathematics', 'History', 'Geography', 'Science', 'Physical Education'],
  'IX':  ['Bengali', 'English', 'Mathematics', 'History', 'Geography', 'Life Science', 'Physical Science', 'Computer Application', 'Physical Education'],
  'X':   ['Bengali', 'English', 'Mathematics', 'History', 'Geography', 'Life Science', 'Physical Science', 'Computer Application', 'Physical Education'],
};

const periodsPerWeek: Record<string, Record<string, number>> = {
  lower: { Bengali: 5, English: 5, Mathematics: 6, History: 4, Geography: 4, Science: 5, 'Physical Education': 2 },
  upper: { Bengali: 5, English: 5, Mathematics: 6, History: 4, Geography: 4, 'Life Science': 5, 'Physical Science': 5, 'Computer Application': 3, 'Physical Education': 2 },
};

const grouped = schoolData.classes.map(cls => ({
  cls,
  sections: classesData.filter(c => c.class === cls),
  subjects: subjectsByClass[cls] ?? [],
  periods: ['V','VI','VII','VIII'].includes(cls) ? periodsPerWeek.lower : periodsPerWeek.upper,
}));

export default function MHSClassesPage() {
  return (
    <div className="p-6 space-y-5 animate-fadeIn">
      <div>
        <h2 className="font-sora font-bold text-2xl text-gray-900">Classes &amp; Subjects</h2>
        <p className="text-sm text-gray-500 mt-1">
          {classesData.length} sections · Classes {schoolData.classes[0]}–{schoolData.classes[schoolData.classes.length - 1]} · WBBSE Board
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Sections',  value: classesData.length, icon: BookOpen, color: 'text-purple bg-purple/10' },
          { label: 'Total Students',  value: classesData.reduce((s, c) => s + c.students, 0), icon: Users, color: 'text-teal bg-teal/10' },
          { label: 'Subjects (V-VIII)',  value: 7,  icon: CheckCircle2, color: 'text-green bg-green/10' },
          { label: 'Subjects (IX-X)',    value: 9,  icon: CheckCircle2, color: 'text-gold bg-gold/10' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}><Icon className="w-4 h-4" /></div>
                <div>
                  <div className="font-sora font-bold text-2xl text-gray-900">{s.value}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Class-wise breakdown */}
      <div className="space-y-4">
        {grouped.map(({ cls, sections, subjects, periods }) => (
          <div key={cls} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-navy/3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="font-sora font-bold text-navy text-base">Class {cls}</span>
                <span className="text-xs text-gray-400 font-dm-sans">{sections.length} section{sections.length !== 1 ? 's' : ''} · {sections.reduce((s, c) => s + c.students, 0)} students</span>
              </div>
              <span className="text-xs bg-iceLight text-navy px-2 py-0.5 rounded-full font-semibold">{subjects.length} subjects</span>
            </div>
            <div className="p-5">
              {/* Sections */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {sections.map(sec => (
                  <div key={sec.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
                    <div>
                      <div className="font-sora font-semibold text-sm text-gray-800">Section {sec.section}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Class Teacher: {teacherMap[sec.classTeacher] ?? '—'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-sora font-bold text-lg text-gray-900">{sec.students}</div>
                      <div className="text-[10px] text-gray-400">{sec.room}</div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Subjects & periods */}
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Subject Distribution (periods/week)</div>
                <div className="flex flex-wrap gap-2">
                  {subjects.map(sub => (
                    <div key={sub} className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5">
                      <span className="text-xs text-gray-700 font-dm-sans">{sub}</span>
                      <span className="text-[11px] font-sora font-bold text-navy bg-iceLight px-1.5 py-0.5 rounded-full">{periods[sub] ?? 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
