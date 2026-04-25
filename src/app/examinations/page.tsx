'use client';

import { useState } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { Calendar, Download, Grid, FileText } from 'lucide-react';
import { toast } from 'sonner';
import studentsData from '@/data/students.json';

const exams = [
  { id: 'EX001', name: 'Pre-Board Examination', dateRange: 'Apr 14–25, 2025', classes: 'Class X & XII', status: 'Scheduled', highlight: true },
  { id: 'EX002', name: 'Unit Test III', dateRange: 'Mar 10–14, 2025', classes: 'Class VI–IX', status: 'Results Declared', highlight: false },
  { id: 'EX003', name: 'Half-Yearly Examination', dateRange: 'Dec 2–12, 2024', classes: 'All Classes', status: 'Results Declared', highlight: false },
  { id: 'EX004', name: 'Annual Examination', dateRange: 'Feb 17–Mar 5, 2025', classes: 'Class VI–IX', status: 'Results Declared', highlight: false },
  { id: 'EX005', name: 'ICSE Board Examination', dateRange: 'Feb 27–Mar 28, 2025', classes: 'Class X', status: 'Results Declared', highlight: false },
];

const sampleHallTicket = studentsData.filter(s => s.class === 'Class X').slice(0, 5);

const seatingNames = studentsData.slice(0, 36).map(s => s.name.split(' ')[0]);

export default function ExaminationsPage() {
  const [hallClass, setHallClass] = useState('');
  const [showHall, setShowHall] = useState(false);
  const [showSeating, setShowSeating] = useState(false);

  const handleGenerate = () => {
    if (!hallClass) { toast.error('Please select a class first'); return; }
    setShowHall(true);
    toast.success('Hall tickets generated for ' + hallClass);
  };

  const statusColor: Record<string, string> = {
    'Scheduled': 'bg-blue-100 text-blue-700',
    'Ongoing': 'bg-amber/10 text-amber',
    'Results Declared': 'bg-green/10 text-green',
  };

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Upcoming Exams */}
        <div>
          <h3 className="font-sora font-semibold text-navy text-lg mb-4">Upcoming & Recent Examinations</h3>
          <div className="grid grid-cols-3 gap-4">
            {exams.map(e => (
              <div key={e.id} className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow ${e.highlight ? 'border-gold ring-2 ring-gold/20' : 'border-gray-100'}`}>
                {e.highlight && (
                  <span className="text-[10px] bg-gold text-navy font-bold px-2 py-0.5 rounded-full mb-2 inline-block">UPCOMING</span>
                )}
                <h4 className="font-sora font-semibold text-navy text-sm mb-1">{e.name}</h4>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <Calendar className="w-3.5 h-3.5" />{e.dateRange}
                </div>
                <p className="text-xs text-gray-400 mb-3">{e.classes}</p>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[e.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {e.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Hall Ticket Generator */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-navy" />
              <h3 className="font-sora font-semibold text-navy">Hall Ticket Generator</h3>
            </div>
            <div className="flex gap-3 mb-4">
              <select
                value={hallClass}
                onChange={e => setHallClass(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 h-9 text-sm text-gray-700 focus:outline-none"
              >
                <option value="">Select class...</option>
                {['Class X-A', 'Class X-B', 'Class XII-A', 'Class XII-B'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button
                onClick={handleGenerate}
                className="bg-gold text-navy font-semibold text-sm px-4 py-2 rounded-lg hover:bg-gold/90 transition-colors"
              >
                Generate
              </button>
            </div>
            {showHall && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="gradient-navy text-white text-center py-2 text-xs font-sora font-semibold">
                  SUNDARBAN ACADEMY, KOLKATA — HALL TICKETS ({hallClass})
                </div>
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Name', 'Roll No', 'Exam Centre', 'Dates'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-gray-400 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sampleHallTicket.map(s => (
                      <tr key={s.id} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-semibold">{s.name}</td>
                        <td className="px-3 py-2 text-gray-500">{s.rollNo}</td>
                        <td className="px-3 py-2 text-gray-500">Hall A, Sundarban Academy</td>
                        <td className="px-3 py-2 text-gray-500">Apr 14–25</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  onClick={() => toast.success('Hall tickets downloaded as PDF')}
                  className="w-full py-2 text-xs font-semibold text-navyMid hover:bg-gray-50 flex items-center justify-center gap-1 border-t border-gray-100"
                >
                  <Download className="w-3.5 h-3.5" /> Download All
                </button>
              </div>
            )}
          </div>

          {/* Seating Plan */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Grid className="w-5 h-5 text-navy" />
                <h3 className="font-sora font-semibold text-navy">Seating Plan — Hall A</h3>
              </div>
              <button
                onClick={() => { setShowSeating(true); toast.success('Seating plan auto-generated'); }}
                className="text-xs bg-navy text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-navyMid transition-colors"
              >
                Auto-Generate
              </button>
            </div>
            {showSeating ? (
              <div className="grid grid-cols-6 gap-1">
                {seatingNames.map((name, i) => (
                  <div
                    key={i}
                    className={`text-[9px] rounded-lg p-1 text-center font-semibold border ${i % 2 === 0 ? 'bg-iceLight text-navy border-ice' : 'bg-goldLight text-amber border-gold/20'}`}
                  >
                    {name}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-sm text-gray-400">Click Auto-Generate to create seating plan</p>
              </div>
            )}
          </div>
        </div>

        {/* Results Entry */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-sora font-semibold text-navy mb-4">Results Entry — Pre-Board (Class X-A)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs uppercase tracking-wide text-gray-400 px-4 py-3 font-medium">Student</th>
                  {['Eng', 'Maths', 'Physics', 'Chem', 'Bio', 'History', 'Total'].map(s => (
                    <th key={s} className="text-center text-xs uppercase tracking-wide text-gray-400 px-3 py-3 font-medium">{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {studentsData.filter(s => s.class === 'Class X').slice(0, 6).map((s, i) => {
                  const sc = s.academicScore;
                  const vals = [sc.english, sc.mathematics, sc.science, sc.science - 5, sc.science - 3, sc.history];
                  const total = vals.reduce((a, b) => a + b, 0);
                  return (
                    <tr key={s.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                      <td className="px-4 py-2.5 font-semibold text-gray-800">{s.name}</td>
                      {vals.map((v, vi) => (
                        <td key={vi} className="px-3 py-2.5 text-center">
                          <input
                            type="number"
                            defaultValue={v}
                            min={0}
                            max={100}
                            className="w-14 text-center text-sm font-semibold border border-gray-200 rounded-lg py-0.5 focus:outline-none focus:ring-1 focus:ring-navy"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center font-bold text-navy">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => toast.success('Results saved successfully')}
            className="mt-4 bg-gold text-navy font-semibold text-sm px-4 py-2 rounded-lg hover:bg-gold/90 transition-colors"
          >
            Save Results
          </button>
        </div>
      </div>
    </PageWrapper>
  );
}
