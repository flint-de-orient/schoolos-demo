'use client';

import { useState, useMemo } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { toast } from 'sonner';
import {
  IdCard, FileText, Printer, Download, Search, X, Check,
  Users, Award, Shield, GraduationCap, Phone, Heart,
  MapPin, Star, Calendar, BookOpen, ChevronDown, Plus
} from 'lucide-react';
import studentsData from '@/data/students.json';

type Student = typeof studentsData[number];
type Tab = 'id-cards' | 'certificates';
type CertType = 'bonafide' | 'tc' | 'character' | 'migration' | 'achievement' | 'sports';

// ─── Config ───────────────────────────────────────────────────────────────────

const CLASSES_LIST = [
  'All Classes','Nursery','LKG','UKG',
  'Class I','Class II','Class III','Class IV','Class V','Class VI',
  'Class VII','Class VIII','Class IX','Class X','Class XI','Class XII',
];

const CERT_TYPES: { id: CertType; label: string; icon: React.ElementType; desc: string; color: string }[] = [
  { id: 'bonafide',    label: 'Bonafide Certificate',   icon: GraduationCap, desc: 'Confirms student enrolment status',      color: 'border-navy/30 bg-navy/5 text-navy' },
  { id: 'tc',          label: 'Transfer Certificate',   icon: FileText,      desc: 'For transfer to another institution',    color: 'border-teal/30 bg-teal/5 text-teal' },
  { id: 'character',   label: 'Character Certificate',  icon: Shield,        desc: 'Certifies conduct and character',        color: 'border-purple/30 bg-purple/5 text-purple' },
  { id: 'migration',   label: 'Migration Certificate',  icon: MapPin,        desc: 'For CISCE board migration',              color: 'border-amber/30 bg-amber/5 text-amber' },
  { id: 'achievement', label: 'Merit Certificate',      icon: Award,         desc: 'Academic excellence recognition',        color: 'border-gold/40 bg-gold/5 text-amber' },
  { id: 'sports',      label: 'Sports Certificate',     icon: Star,          desc: 'Sporting achievement recognition',       color: 'border-green/30 bg-green/5 text-green' },
];

const HOUSE_COLORS: Record<string, string> = {
  Tagore:  'bg-blue-100 text-blue-700',
  Bose:    'bg-purple-100 text-purple-700',
  Roy:     'bg-amber-100 text-amber-700',
  Teresa:  'bg-rose-100 text-rose-700',
};

const fmtDOB = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

// ─── ID Card Component ────────────────────────────────────────────────────────

function StudentIDCard({ student, compact = false }: { student: Student; compact?: boolean }) {
  const initials = student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
  const house = student.house ?? 'Tagore';
  return (
    <div className={`relative bg-white rounded-2xl overflow-hidden shadow-md border border-gray-200 select-none ${compact ? 'w-full' : 'w-72'}`} style={{ aspectRatio: '1.586' }}>
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-navy via-navyMid to-teal" />

      {/* School header */}
      <div className="absolute top-2 left-0 right-0 flex items-center gap-2 px-3 pt-0.5">
        <div className="w-6 h-6 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
          <GraduationCap className="w-3.5 h-3.5 text-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-sora font-bold text-navy text-[10px] leading-tight">SUNDARBAN ACADEMY</p>
          <p className="text-[8px] text-gray-500 leading-none">Kolkata · CISCE Affiliated</p>
        </div>
        <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded-full ${HOUSE_COLORS[house] ?? 'bg-gray-100 text-gray-600'}`}>{house}</span>
      </div>

      {/* Divider */}
      <div className="absolute top-11 left-3 right-3 h-px bg-gray-100" />

      {/* Main content */}
      <div className="absolute top-13 left-0 right-0 bottom-8 flex items-center gap-3 px-3 pt-1">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-navy to-navyMid flex items-center justify-center text-white font-sora font-bold text-lg flex-shrink-0 shadow-sm">
          {initials}
        </div>
        {/* Details */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="font-sora font-bold text-navy text-sm leading-tight truncate">{student.name}</p>
          <p className="text-[10px] font-semibold text-gray-600">{student.class}{student.section ? ` — ${student.section}` : ''}</p>
          <p className="text-[10px] text-gray-500 font-mono">Roll: {student.rollNo}</p>
          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-[9px] text-gray-500">DOB: {fmtDOB(student.dob)}</span>
            <span className="text-[9px] font-bold bg-red-50 text-red-600 px-1.5 py-0.5 rounded">{student.bloodGroup}</span>
          </div>
        </div>
      </div>

      {/* Bottom strip */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-navy/5 border-t border-navy/10 flex items-center justify-between px-3">
        <div className="flex items-center gap-1">
          <Phone className="w-2.5 h-2.5 text-gray-400" />
          <span className="text-[9px] text-gray-500">{student.parent.phone}</span>
        </div>
        <span className="text-[8px] text-gray-400 font-mono">{student.id}</span>
        {/* QR placeholder */}
        <div className="w-6 h-6 border border-gray-300 rounded flex items-center justify-center">
          <div className="grid grid-cols-3 gap-px">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-[1px] ${[0,1,3,4,6,8].includes(i) ? 'bg-navy' : 'bg-transparent'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Certificate Preview ──────────────────────────────────────────────────────

function CertificatePreview({ student, type, purpose, achievement }: {
  student: Student; type: CertType; purpose: string; achievement: string;
}) {
  const dateStr = fmtDate(new Date());
  const certNo = `${type.toUpperCase().slice(0,3)}/${new Date().getFullYear()}-${String(new Date().getFullYear()+1).slice(2)}/${String(Math.floor(Math.random()*900+100))}`;
  const gender = student.gender === 'Female' ? { sub: 'She', obj: 'Her', pos: 'her', rel: 'daughter' } : { sub: 'He', obj: 'His', pos: 'his', rel: 'son' };

  const bodies: Record<CertType, string> = {
    bonafide: `This is to certify that ${student.name.toUpperCase()}, ${gender.rel} of ${student.parent.father}, is a bonafide student of this institution studying in ${student.class}${student.section ? ` (Section ${student.section})` : ''} during the Academic Year 2024–25. ${gender.pos.charAt(0).toUpperCase() + gender.pos.slice(1)} date of birth as per school records is ${fmtDOB(student.dob)}. ${gender.obj} conduct and character are good.\n\nThis certificate is issued on request for the purpose of ${purpose || 'admission / bank account opening'}.`,

    tc: `This is to certify that ${student.name.toUpperCase()}, ${gender.rel} of ${student.parent.father}, was a bonafide student of Sundarban Academy from ${fmtDOB(student.admissionDate)} to ${dateStr}. ${gender.sub} has successfully completed the requirements of ${student.class} and has cleared all dues payable to the school.\n\n${gender.sub} bears a good moral character and conduct throughout ${gender.pos} stay in this institution. This Transfer Certificate is issued on ${gender.pos} own request.`,

    character: `This is to certify that ${student.name.toUpperCase()}, ${gender.rel} of ${student.parent.father}, is/was a student of Sundarban Academy, Kolkata. During ${gender.pos} association with this institution, ${gender.pos} character and conduct have been found to be GOOD. ${gender.sub} has been a well-disciplined student.\n\nThis certificate is issued on the request of the applicant for ${purpose || 'the purpose stated'}.`,

    migration: `This is to certify that ${student.name.toUpperCase()}, Roll No. ${student.rollNo}, is a student of ${student.class} at Sundarban Academy, Kolkata (CISCE Affiliation No: WB/0001/2024). ${gender.sub} is eligible for migration to ${purpose || 'another CISCE affiliated school / State Board'}. The school has no objection to such migration.\n\nAll dues have been cleared. ${gender.pos.charAt(0).toUpperCase() + gender.pos.slice(1)} behaviour and academic performance have been satisfactory.`,

    achievement: `This is to certify that ${student.name.toUpperCase()}, student of ${student.class}, has demonstrated exceptional academic performance and has achieved the following during the Academic Year 2024–25:\n\n${achievement || '• Academic Excellence Award — Top Performer in Class\n• Overall Score: 85% and above across all subjects'}\n\nThe school commends ${gender.pos} dedication, hard work, and outstanding achievement. We wish ${gender.obj} continued success in all future endeavours.`,

    sports: `This is to certify that ${student.name.toUpperCase()}, student of ${student.class}, has represented Sundarban Academy, Kolkata and has achieved the following distinction in Sports:\n\n${achievement || '• House Captain — Tagore House (2024–25)\n• Participated in Inter-School Athletics Meet, April 2025'}\n\nThe school recognises ${gender.pos} sporting spirit, discipline, and commitment to excellence in physical activities.`,
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden font-dm-sans text-gray-800 shadow-sm">
      {/* Certificate header */}
      <div className="bg-navy p-6 text-center text-white">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-gold flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-navy" />
          </div>
        </div>
        <h1 className="font-sora font-bold text-xl tracking-wide">SUNDARBAN ACADEMY</h1>
        <p className="text-ice/70 text-sm">12, Rabindra Pally, Kolkata — 700 001 · CISCE Affiliated</p>
        <p className="text-ice/50 text-xs mt-0.5">Tel: +91-33-2412-XXXX · Email: admin@sundarbanacademy.edu.in</p>
      </div>

      {/* Certificate title */}
      <div className="border-b-4 border-double border-navy/20 text-center py-4 bg-goldLight/30">
        <h2 className="font-sora font-bold text-navy text-lg uppercase tracking-widest">
          {CERT_TYPES.find(c => c.id === type)?.label}
        </h2>
        <div className="flex items-center justify-center gap-4 mt-1 text-xs text-gray-500">
          <span>No: {certNo}</span>
          <span>·</span>
          <span>Date: {dateStr}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        <div className="text-sm leading-7 text-gray-700 text-justify whitespace-pre-line">
          {bodies[type]}
        </div>
      </div>

      {/* Signature section */}
      <div className="px-6 pb-6">
        <div className="border-t border-gray-200 pt-5 mt-2 flex justify-between items-end">
          <div className="text-center">
            <div className="w-28 border-b border-gray-400 mb-1" />
            <p className="text-xs text-gray-500">Class Teacher</p>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center">
              <p className="text-[9px] text-gray-400 text-center leading-tight">School<br/>Seal</p>
            </div>
          </div>
          <div className="text-center">
            <div className="w-28 border-b border-gray-400 mb-1" />
            <p className="text-xs font-semibold text-navy">Principal</p>
            <p className="text-[10px] text-gray-500">Sundarban Academy, Kolkata</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function IDCardsPage() {
  const [tab, setTab] = useState<Tab>('id-cards');
  const [classFilter, setClassFilter] = useState('All Classes');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewStudent, setPreviewStudent] = useState<Student | null>(null);

  // Certificate state
  const [certType, setCertType] = useState<CertType>('bonafide');
  const [certStudentId, setCertStudentId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [achievement, setAchievement] = useState('');
  const [certPreview, setCertPreview] = useState(false);

  const filtered = useMemo(() =>
    studentsData.filter(s => {
      const matchClass = classFilter === 'All Classes' || s.class === classFilter;
      const q = search.toLowerCase();
      const matchSearch = s.name.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q);
      return matchClass && matchSearch;
    }), [classFilter, search]);

  const certStudent = studentsData.find(s => s.id === certStudentId);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectAll = () => setSelected(new Set(filtered.map(s => s.id)));
  const clearAll  = () => setSelected(new Set());

  const printCards = (ids: string[]) => {
    toast.success(`${ids.length} ID card${ids.length > 1 ? 's' : ''} sent to printer`, {
      description: 'Print preview opened in new window',
    });
  };

  const generateCert = () => {
    if (!certStudent) return;
    setCertPreview(true);
  };

  const printCert = () => {
    toast.success('Certificate sent to printer');
    setCertPreview(false);
  };

  return (
    <PageWrapper>
      {/* Tabs */}
      <div className="flex items-end gap-1 mb-6 border-b border-gray-200">
        {[
          { id: 'id-cards' as Tab, label: 'Student ID Cards', icon: IdCard },
          { id: 'certificates' as Tab, label: 'Certificates', icon: FileText },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px ${
                tab === t.id ? 'text-navy border-navy' : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}>
              <Icon className="w-4 h-4" />{t.label}
            </button>
          );
        })}
      </div>

      {/* ── ID Cards Tab ── */}
      {tab === 'id-cards' && (
        <div className="space-y-5">
          {/* Controls */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input placeholder="Search by name or roll no…" value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/20" />
              </div>
              <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 text-gray-600">
                {CLASSES_LIST.map(c => <option key={c}>{c}</option>)}
              </select>
              <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
                <button onClick={selectAll} className="text-xs font-semibold text-navy hover:underline">Select All</button>
                <span className="text-gray-300">|</span>
                <button onClick={clearAll} className="text-xs font-semibold text-gray-500 hover:underline">Clear</button>
              </div>
              {selected.size > 0 && (
                <>
                  <span className="text-xs font-semibold bg-navy/10 text-navy px-2.5 py-1 rounded-full">{selected.size} selected</span>
                  <button onClick={() => printCards([...selected])}
                    className="flex items-center gap-1.5 px-3 py-2 bg-navy text-white text-xs font-semibold rounded-lg hover:bg-navyMid transition-colors">
                    <Printer className="w-3.5 h-3.5" />Print Selected
                  </button>
                </>
              )}
              <button onClick={() => printCards(filtered.map(s => s.id))}
                className="flex items-center gap-1.5 px-3 py-2 border border-navy text-navy text-xs font-semibold rounded-lg hover:bg-navy/5 transition-colors">
                <Download className="w-3.5 h-3.5" />Export All PDF
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">{filtered.length} students · Click a card to select · Click preview icon to view full card</p>
          </div>

          {/* Card grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(s => (
              <div key={s.id} className="relative group cursor-pointer" onClick={() => toggleSelect(s.id)}>
                <div className={`transition-all ${selected.has(s.id) ? 'ring-2 ring-navy ring-offset-2 rounded-2xl' : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-2 rounded-2xl'}`}>
                  <StudentIDCard student={s} compact />
                </div>
                {/* Selection overlay */}
                {selected.has(s.id) && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-navy rounded-full flex items-center justify-center shadow-sm">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                {/* Hover actions */}
                <div className="absolute inset-0 bg-navy/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setPreviewStudent(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-navy text-xs font-bold rounded-lg hover:bg-gray-100 transition-colors">
                    <IdCard className="w-3.5 h-3.5" />Preview
                  </button>
                  <button onClick={() => { toast.success(`ID card for ${s.name} printed`); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gold text-navy text-xs font-bold rounded-lg hover:bg-gold/90 transition-colors">
                    <Printer className="w-3.5 h-3.5" />Print
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Certificates Tab ── */}
      {tab === 'certificates' && (
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">
          {/* Left: Form */}
          <div className="space-y-5">
            {/* Certificate type */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-sora font-semibold text-navy mb-3 text-sm">Select Certificate Type</h3>
              <div className="grid grid-cols-2 gap-2">
                {CERT_TYPES.map(ct => {
                  const Icon = ct.icon;
                  return (
                    <button key={ct.id} onClick={() => setCertType(ct.id)}
                      className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border-2 transition-all text-left ${
                        certType === ct.id ? `${ct.color} border-current` : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-bold leading-tight">{ct.label}</span>
                      <span className="text-[10px] opacity-70 leading-tight">{ct.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Student selector */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-sora font-semibold text-navy mb-3 text-sm">Student Details</h3>
              <select value={certStudentId} onChange={e => setCertStudentId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 mb-3">
                <option value="">— Select Student —</option>
                {studentsData.map(s => <option key={s.id} value={s.id}>{s.name} ({s.class})</option>)}
              </select>
              {certStudent && (
                <div className="bg-navy/5 rounded-lg p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-navy flex items-center justify-center text-white font-bold text-sm">
                    {certStudent.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-navy text-sm">{certStudent.name}</p>
                    <p className="text-xs text-gray-500">{certStudent.class} · {certStudent.rollNo}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Purpose / Achievement field */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-sora font-semibold text-navy mb-3 text-sm">
                {certType === 'achievement' || certType === 'sports' ? 'Achievement Details' : 'Purpose of Certificate'}
              </h3>
              {certType === 'achievement' || certType === 'sports' ? (
                <textarea value={achievement} onChange={e => setAchievement(e.target.value)} rows={4}
                  placeholder={certType === 'achievement' ? '• Academic Excellence Award\n• Score: 90% in Board Exams' : '• District Level Cricket — Gold Medal\n• School Team Captain 2024-25'}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy/20" />
              ) : (
                <input value={purpose} onChange={e => setPurpose(e.target.value)}
                  placeholder={certType === 'tc' ? 'Admission in New School' : certType === 'migration' ? 'Migration to State Board' : 'Bank account opening / scholarship'}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20" />
              )}
            </div>

            <button onClick={generateCert} disabled={!certStudent}
              className={`w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl transition-colors ${
                certStudent ? 'bg-navy text-white hover:bg-navyMid' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}>
              <FileText className="w-4 h-4" />Generate Certificate Preview
            </button>
          </div>

          {/* Right: Preview */}
          <div>
            {certPreview && certStudent ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-sora font-semibold text-navy">Certificate Preview</h3>
                  <div className="flex gap-2">
                    <button onClick={() => { toast.success('Certificate downloaded as PDF'); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors">
                      <Download className="w-3.5 h-3.5" />Download PDF
                    </button>
                    <button onClick={printCert}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-navy text-white text-xs font-semibold rounded-lg hover:bg-navyMid transition-colors">
                      <Printer className="w-3.5 h-3.5" />Print
                    </button>
                  </div>
                </div>
                <CertificatePreview student={certStudent} type={certType} purpose={purpose} achievement={achievement} />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center bg-white rounded-xl border border-dashed border-gray-200 shadow-sm min-h-96">
                <div className="text-center text-gray-400 p-8">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold text-gray-500 mb-1">Certificate Preview</p>
                  <p className="text-sm">Select a certificate type and student,<br />then click Generate to preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ID Card Preview Modal ── */}
      {previewStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPreviewStudent(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-sora font-semibold text-navy">ID Card Preview</h3>
              <button onClick={() => setPreviewStudent(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <StudentIDCard student={previewStudent} />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setPreviewStudent(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50">Close</button>
              <button onClick={() => { toast.success(`ID card for ${previewStudent.name} printed`); setPreviewStudent(null); }}
                className="flex-1 py-2.5 bg-navy text-white text-sm font-semibold rounded-xl hover:bg-navyMid flex items-center justify-center gap-2">
                <Printer className="w-4 h-4" />Print Card
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
