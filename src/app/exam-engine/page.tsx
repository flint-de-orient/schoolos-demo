'use client';

import { useState, useMemo } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import AIBadge from '@/components/shared/AIBadge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  FileText, Brain, Search, Filter, CheckCircle2, Clock, Star,
  ChevronDown, Sparkles, BookOpen, BarChart3, Target, Zap,
  AlertCircle, Download, Layers, Award, RefreshCw,
  Upload, ScanLine, ClipboardCheck, Hash
} from 'lucide-react';
import questionBankData from '@/data/question-bank.json';

type Tab = 'generator' | 'copychecker' | 'questionbank' | 'marking';

const BOARDS = ['CISCE', 'CBSE', 'West Bengal Board'] as const;
const CLASSES = ['Class IX', 'Class X', 'Class XI', 'Class XII'] as const;
const SUBJECTS_BY_CLASS: Record<string, string[]> = {
  'Class IX':  ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Bengali', 'Geography'],
  'Class X':   ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Bengali', 'Geography'],
  'Class XI':  ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Economics', 'Bengali'],
  'Class XII': ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Economics', 'Bengali'],
};
const BLOOMS_LEVELS = ['Remember', 'Understand', 'Apply', 'Analyse', 'Evaluate', 'Create'] as const;
const DIFFICULTY_LEVELS = ['Easy', 'Medium', 'Hard'] as const;

const BLOOMS_COLORS: Record<string, string> = {
  Remember: 'bg-blue-100 text-blue-700', Understand: 'bg-green-100 text-green-700',
  Apply: 'bg-yellow-100 text-yellow-700', Analyse: 'bg-orange-100 text-orange-700',
  Evaluate: 'bg-purple-100 text-purple-700', Create: 'bg-pink-100 text-pink-700',
};
const DIFF_COLORS: Record<string, string> = {
  easy: 'bg-green/10 text-green', medium: 'bg-amber/10 text-amber', hard: 'bg-coral/10 text-coral',
};

const generationSteps = [
  { label: 'Analysing board syllabus & weightage',  icon: BookOpen },
  { label: 'Selecting questions from bank',         icon: Search },
  { label: 'Applying Bloom\'s taxonomy balance',    icon: Brain },
  { label: 'Checking difficulty distribution',      icon: BarChart3 },
  { label: 'Formatting paper & marking scheme',     icon: FileText },
];

const MOCK_PAPER = {
  sectionA: [
    { no: 1, q: 'Define quadratic equation. State the formula to find its roots.', marks: 1, type: 'MCQ', blooms: 'Remember' },
    { no: 2, q: 'Which of the following is the correct form of Ohm\'s Law?\n(a) V = IR  (b) I = V/R  (c) R = VI  (d) Both (a) and (b)', marks: 1, type: 'MCQ', blooms: 'Understand' },
    { no: 3, q: 'The pH of pure water at 25°C is ___________', marks: 1, type: 'MCQ', blooms: 'Remember' },
    { no: 4, q: 'Mendel\'s law of independent assortment applies when genes are located on ___________', marks: 1, type: 'MCQ', blooms: 'Remember' },
  ],
  sectionB: [
    { no: 5, q: 'Solve the quadratic equation: 2x² – 5x + 3 = 0 using the factorisation method.', marks: 3, type: 'Short', blooms: 'Apply' },
    { no: 6, q: 'State and explain Faraday\'s law of electromagnetic induction with an example.', marks: 3, type: 'Short', blooms: 'Understand' },
    { no: 7, q: 'Distinguish between acids and bases with three examples each.', marks: 3, type: 'Short', blooms: 'Understand' },
    { no: 8, q: 'Describe the structure and function of the human nervous system.', marks: 4, type: 'Short', blooms: 'Analyse' },
  ],
  sectionC: [
    { no: 9, q: 'Explain the process of photosynthesis with a labelled diagram. How does light intensity affect the rate of photosynthesis?', marks: 6, type: 'Long', blooms: 'Evaluate' },
    { no: 10, q: 'A question on Mendel\'s experiments and the law of segregation. Solve a dihybrid cross between TtRr × ttrr and explain the expected phenotypic ratio.', marks: 6, type: 'Long', blooms: 'Analyse' },
    { no: 11, q: '(a) Draw the energy level diagram for a hydrogen atom and mark the Balmer series transitions. (b) Calculate the wavelength of light emitted during n=4 to n=2 transition. (R = 1.097 × 10⁷ m⁻¹)', marks: 8, type: 'Long', blooms: 'Evaluate' },
  ],
};

const COPY_STEPS = [
  { id: 'upload',  label: 'Answer Sheet Upload',   icon: Upload,        desc: 'Scanned PDF · 8 pages' },
  { id: 'ocr',     label: 'OCR Extraction',         icon: ScanLine,      desc: '98.2% accuracy · 2,341 words' },
  { id: 'check',   label: 'AI Answer Matching',     icon: Brain,         desc: 'Matching against model answers' },
  { id: 'score',   label: 'Score & Feedback Report', icon: ClipboardCheck, desc: 'Detailed analysis complete' },
];

const COPY_RESULTS = [
  { qno: '1(a)', subject: 'Physics', maxMarks: 8, awarded: 6, feedback: 'Good explanation of electromagnetic induction. Missing second example. Diagram partially labelled.', blooms: 'Understand' },
  { qno: '2(b)', subject: 'Chemistry', maxMarks: 6, awarded: 5, feedback: 'Correct acid-base distinction. All examples accurate. Minor formatting issue in equations.', blooms: 'Apply' },
  { qno: '3',    subject: 'Biology', maxMarks: 10, awarded: 8, feedback: 'Photosynthesis diagram excellent. Rate discussion needs more quantitative support.', blooms: 'Evaluate' },
  { qno: '4(a)', subject: 'Mathematics', maxMarks: 6, awarded: 4, feedback: 'Correct method used. Arithmetic error in step 3 leads to wrong final answer. Working shown.', blooms: 'Apply' },
  { qno: '4(b)', subject: 'Mathematics', maxMarks: 6, awarded: 5, feedback: 'Trigonometric identity correctly applied. Proof complete and logically structured.', blooms: 'Analyse' },
  { qno: '5',    subject: 'History', maxMarks: 8, awarded: 6, feedback: 'Key events of Russian Revolution covered. Analysis of causes is strong but consequences are superficial.', blooms: 'Evaluate' },
  { qno: '6',    subject: 'English', maxMarks: 10, awarded: 8, feedback: 'Comprehension answers accurate. Essay is well-structured with good vocabulary. Minor grammatical errors.', blooms: 'Create' },
  { qno: '7',    subject: 'Physics', maxMarks: 6, awarded: 5, feedback: 'Circuit diagram drawn correctly. Derivation of V=IR is accurate with good mathematical steps.', blooms: 'Apply' },
  { qno: '8',    subject: 'Biology', maxMarks: 6, awarded: 4, feedback: 'Nervous system structure described well. Function section lacks detail on synapse transmission.', blooms: 'Understand' },
  { qno: '9',    subject: 'Chemistry', maxMarks: 6, awarded: 5, feedback: 'Electrolysis explained well with correct anode/cathode reactions. Faraday\'s laws stated correctly.', blooms: 'Apply' },
  { qno: '10',   subject: 'Mathematics', maxMarks: 8, awarded: 7, feedback: 'Probability calculation using Bayes theorem is correct. All steps clearly shown with proper notation.', blooms: 'Analyse' },
];

const MARKING_SCHEMES = [
  {
    qno: '5', subject: 'Mathematics', question: 'Solve: 2x² – 5x + 3 = 0', totalMarks: 3,
    points: [
      { point: 'Correct factorisation attempt: (2x – 3)(x – 1) = 0', marks: 1 },
      { point: 'Both roots: x = 3/2 and x = 1', marks: 1 },
      { point: 'Verification by substitution', marks: 1 },
    ],
    commonMistakes: ['Sign errors in factorisation', 'Not verifying roots', 'Incorrect splitting of middle term'],
  },
  {
    qno: '9', subject: 'Biology', question: 'Explain photosynthesis with diagram', totalMarks: 6,
    points: [
      { point: 'Labelled diagram (chloroplast, thylakoid, stroma)', marks: 2 },
      { point: 'Light reaction: ATP + NADPH production', marks: 1 },
      { point: 'Calvin cycle / dark reaction: CO₂ fixation', marks: 1 },
      { point: 'Effect of light intensity on rate (law of limiting factors)', marks: 1 },
      { point: 'Overall equation: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂', marks: 1 },
    ],
    commonMistakes: ['Confusion between light and dark reactions', 'Missing labels in diagram', 'Not mentioning chlorophyll'],
  },
];

export default function ExamEnginePage() {
  const [activeTab, setActiveTab] = useState<Tab>('generator');

  // Generator state
  const [board, setBoard] = useState('CISCE');
  const [cls, setCls] = useState('Class X');
  const [subject, setSubject] = useState('Biology');
  const [totalMarks, setTotalMarks] = useState(80);
  const [duration, setDuration] = useState(180);
  const [bloomsToggle, setBloomsToggle] = useState<Record<string, boolean>>({
    Remember: true, Understand: true, Apply: true, Analyse: true, Evaluate: true, Create: false,
  });
  const [diffToggle, setDiffToggle] = useState<Record<string, boolean>>({ Easy: true, Medium: true, Hard: true });
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(-1);
  const [paperReady, setPaperReady] = useState(false);

  // Copy checker state
  const [copyStep, setCopyStep] = useState(0);
  const [copyRunning, setCopyRunning] = useState(false);
  const [copyDone, setCopyDone] = useState(false);

  // Question bank state
  const [qSearch, setQSearch] = useState('');
  const [qSubjectFilter, setQSubjectFilter] = useState('All');
  const [qTypeFilter, setQTypeFilter] = useState('All');
  const [qBloomsFilter, setQBloomsFilter] = useState('All');
  const [qDiffFilter, setQDiffFilter] = useState('All');
  const [expandedQ, setExpandedQ] = useState<string | null>(null);

  const allQuestions = questionBankData.questions;
  const subjects = useMemo(() => ['All', ...Array.from(new Set(allQuestions.map(q => q.subject)))], [allQuestions]);
  const qTypes = ['All', 'mcq', 'vsa', 'short', 'long'];

  const filteredQs = useMemo(() => allQuestions.filter(q => {
    if (qSubjectFilter !== 'All' && q.subject !== qSubjectFilter) return false;
    if (qTypeFilter !== 'All' && q.type !== qTypeFilter) return false;
    if (qBloomsFilter !== 'All' && q.bloomsLevel !== qBloomsFilter) return false;
    if (qDiffFilter !== 'All' && q.difficulty !== qDiffFilter) return false;
    if (qSearch && !q.question.toLowerCase().includes(qSearch.toLowerCase()) && !q.topic.toLowerCase().includes(qSearch.toLowerCase())) return false;
    return true;
  }), [allQuestions, qSearch, qSubjectFilter, qTypeFilter, qBloomsFilter, qDiffFilter]);

  const totalAwarded = COPY_RESULTS.reduce((s, r) => s + r.awarded, 0);
  const totalMax = COPY_RESULTS.reduce((s, r) => s + r.maxMarks, 0);
  const scorePercent = Math.round((totalAwarded / totalMax) * 100);

  function runGeneration() {
    setGenerating(true); setGenStep(0); setPaperReady(false);
    generationSteps.forEach((_, i) => {
      setTimeout(() => {
        setGenStep(i);
        if (i === generationSteps.length - 1) {
          setTimeout(() => { setGenerating(false); setPaperReady(true); toast.success('Question paper generated successfully!'); }, 600);
        }
      }, i * 700);
    });
  }

  function runCopyChecker() {
    setCopyRunning(true); setCopyStep(0); setCopyDone(false);
    COPY_STEPS.forEach((_, i) => {
      setTimeout(() => {
        setCopyStep(i);
        if (i === COPY_STEPS.length - 1) {
          setTimeout(() => { setCopyRunning(false); setCopyDone(true); toast.success(`Copy checking complete — Score: ${totalAwarded}/${totalMax} (${scorePercent}%)`); }, 800);
        }
      }, i * 900);
    });
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType; ai?: boolean }[] = [
    { id: 'generator',    label: 'Paper Generator',  icon: Sparkles, ai: true },
    { id: 'copychecker',  label: 'AI Copy Checker',  icon: Brain, ai: true },
    { id: 'questionbank', label: 'Question Bank',    icon: Layers },
    { id: 'marking',      label: 'Marking Scheme',   icon: Target },
  ];

  return (
    <PageWrapper>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-sora font-bold text-2xl text-navy">Exam Engine</h1>
            <AIBadge label="AI-Powered" />
          </div>
          <p className="text-sm text-gray-500 font-dm-sans">CISCE · CBSE · West Bengal Board syllabi pre-loaded — generate papers in seconds</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs bg-teal/10 text-teal font-semibold px-3 py-1.5 rounded-full border border-teal/20 flex items-center gap-1.5">
            <BookOpen className="w-3 h-3" /> 3 Boards · 8 Classes · 50+ Questions
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold font-dm-sans whitespace-nowrap transition-all border-b-2 ${
                  activeTab === tab.id ? 'border-navy text-navy bg-navy/3' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.ai && <span className="text-[9px] font-bold bg-teal text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Brain className="w-2.5 h-2.5" />AI</span>}
              </button>
            );
          })}
        </div>

        <div className="p-5 sm:p-6">

          {/* ─── PAPER GENERATOR ─────────────────────────────────────────── */}
          {activeTab === 'generator' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Config panel */}
              <div className="lg:col-span-2 space-y-5">
                <div>
                  <h3 className="font-sora font-semibold text-navy mb-4">Paper Configuration</h3>

                  {/* Board */}
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Board</label>
                    <div className="flex flex-wrap gap-2">
                      {BOARDS.map(b => (
                        <button key={b} onClick={() => setBoard(b)}
                          className={`text-sm px-3 py-1.5 rounded-lg border font-medium transition-all ${board === b ? 'bg-navy text-white border-navy' : 'bg-white text-gray-600 border-gray-200 hover:border-navy/40'}`}>
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Class + Subject row */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Class</label>
                      <select value={cls} onChange={e => setCls(e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-navy/20">
                        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Subject</label>
                      <select value={subject} onChange={e => setSubject(e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-navy/20">
                        {(SUBJECTS_BY_CLASS[cls] ?? []).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Marks + Duration */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Total Marks</label>
                      <select value={totalMarks} onChange={e => setTotalMarks(Number(e.target.value))}
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-navy/20">
                        {[40, 60, 80, 100].map(m => <option key={m} value={m}>{m} marks</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Duration</label>
                      <select value={duration} onChange={e => setDuration(Number(e.target.value))}
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-navy/20">
                        {[90, 120, 150, 180].map(d => <option key={d} value={d}>{d} min</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Bloom's distribution */}
                  <div className="mt-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Bloom&apos;s Taxonomy Levels</label>
                    <div className="flex flex-wrap gap-2">
                      {BLOOMS_LEVELS.map(level => (
                        <button key={level} onClick={() => setBloomsToggle(p => ({ ...p, [level]: !p[level] }))}
                          className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${bloomsToggle[level] ? BLOOMS_COLORS[level] + ' border-current/30' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Difficulty */}
                  <div className="mt-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Difficulty Mix</label>
                    <div className="flex gap-2">
                      {DIFFICULTY_LEVELS.map(d => (
                        <button key={d} onClick={() => setDiffToggle(p => ({ ...p, [d]: !p[d] }))}
                          className={`flex-1 text-xs py-1.5 rounded-xl border font-semibold transition-all ${diffToggle[d] ? DIFF_COLORS[d.toLowerCase()] + ' border-current/20' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Generate button */}
                <button onClick={runGeneration} disabled={generating}
                  className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold/90 disabled:opacity-60 text-navy font-sora font-bold py-3 rounded-xl transition-all shadow-sm">
                  {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {generating ? 'Generating…' : 'Generate Question Paper'}
                </button>

                {/* Generation progress */}
                {(generating || paperReady) && (
                  <div className="bg-navy/3 border border-navy/10 rounded-xl p-4 space-y-2.5">
                    {generationSteps.map((step, i) => {
                      const Icon = step.icon;
                      const done = genStep > i || paperReady;
                      const active = genStep === i && generating;
                      return (
                        <div key={i} className={`flex items-center gap-3 text-sm transition-all ${done ? 'text-green' : active ? 'text-navy font-semibold' : 'text-gray-300'}`}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-green/15' : active ? 'bg-navy/10 animate-pulse' : 'bg-gray-100'}`}>
                            {done ? <CheckCircle2 className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                          </div>
                          <span>{step.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Paper preview */}
              <div className="lg:col-span-3">
                {!paperReady ? (
                  <div className="h-full flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
                    <FileText className="w-12 h-12 text-gray-200 mb-4" />
                    <p className="font-sora font-semibold text-gray-400 mb-1">Configure & Generate</p>
                    <p className="text-sm text-gray-300">Set your paper parameters on the left,<br/>then click Generate.</p>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-2xl overflow-hidden">
                    {/* Paper header */}
                    <div className="gradient-navy text-white px-6 py-4 text-center">
                      <p className="font-sora font-bold text-lg">SUNDARBAN ACADEMY, KOLKATA</p>
                      <p className="text-ice/80 text-sm mt-0.5">{board} — {cls} — {subject}</p>
                      <div className="flex justify-center gap-8 mt-2 text-xs text-ice/70">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {duration} Minutes</span>
                        <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> {totalMarks} Marks</span>
                        <span className="flex items-center gap-1"><Star className="w-3 h-3" /> Term 2 · 2024-25</span>
                      </div>
                    </div>

                    <div className="p-5 space-y-5 max-h-[500px] overflow-y-auto text-sm">
                      {/* Instructions */}
                      <div className="bg-goldLight border border-gold/20 rounded-xl p-3">
                        <p className="text-xs font-semibold text-amber mb-1">General Instructions</p>
                        <ul className="text-xs text-gray-600 space-y-0.5 list-disc list-inside">
                          <li>This paper contains three sections: A, B and C.</li>
                          <li>All questions are compulsory. Internal choice is given wherever applicable.</li>
                          <li>Draw neat, labelled diagrams wherever necessary.</li>
                        </ul>
                      </div>

                      {/* Section A */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="bg-navy text-white text-xs font-bold px-3 py-1 rounded-lg font-sora">SECTION A</div>
                          <span className="text-xs text-gray-400">Multiple Choice Questions · 1 mark each</span>
                          <AIBadge />
                        </div>
                        <div className="space-y-3">
                          {MOCK_PAPER.sectionA.map(q => (
                            <div key={q.no} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm text-gray-800 whitespace-pre-line flex-1">
                                  <span className="font-bold text-navy mr-1">{q.no}.</span>{q.q}
                                </p>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${BLOOMS_COLORS[q.blooms]}`}>{q.blooms}</span>
                                  <span className="text-[10px] text-gray-400 font-semibold">[{q.marks}m]</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Section B */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="bg-navyMid text-white text-xs font-bold px-3 py-1 rounded-lg font-sora">SECTION B</div>
                          <span className="text-xs text-gray-400">Short Answer Questions · 3-4 marks each</span>
                        </div>
                        <div className="space-y-3">
                          {MOCK_PAPER.sectionB.map(q => (
                            <div key={q.no} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm text-gray-800 flex-1">
                                  <span className="font-bold text-navy mr-1">{q.no}.</span>{q.q}
                                </p>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${BLOOMS_COLORS[q.blooms]}`}>{q.blooms}</span>
                                  <span className="text-[10px] text-gray-400 font-semibold">[{q.marks}m]</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Section C */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="bg-purple text-white text-xs font-bold px-3 py-1 rounded-lg font-sora">SECTION C</div>
                          <span className="text-xs text-gray-400">Long Answer Questions · 6-8 marks each</span>
                        </div>
                        <div className="space-y-3">
                          {MOCK_PAPER.sectionC.map(q => (
                            <div key={q.no} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm text-gray-800 flex-1">
                                  <span className="font-bold text-navy mr-1">{q.no}.</span>{q.q}
                                </p>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${BLOOMS_COLORS[q.blooms]}`}>{q.blooms}</span>
                                  <span className="text-[10px] text-gray-400 font-semibold">[{q.marks}m]</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Footer actions */}
                    <div className="border-t border-gray-100 px-5 py-3 flex gap-2 bg-gray-50">
                      <button onClick={() => toast.success('Question paper downloaded as PDF')}
                        className="flex items-center gap-1.5 text-xs font-semibold bg-navy text-white px-3 py-2 rounded-lg hover:bg-navyMid transition-colors">
                        <Download className="w-3.5 h-3.5" /> Download PDF
                      </button>
                      <button onClick={() => toast.success('Marking scheme downloaded')}
                        className="flex items-center gap-1.5 text-xs font-semibold bg-white text-navy px-3 py-2 rounded-lg border border-gray-200 hover:border-navy transition-colors">
                        <Target className="w-3.5 h-3.5" /> Marking Scheme
                      </button>
                      <button onClick={runGeneration}
                        className="flex items-center gap-1.5 text-xs font-semibold bg-white text-gray-600 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors ml-auto">
                        <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── AI COPY CHECKER ─────────────────────────────────────────── */}
          {activeTab === 'copychecker' && (
            <div>
              {/* Demo banner */}
              <div className="bg-teal/5 border border-teal/20 rounded-xl p-4 mb-5 flex items-start gap-3">
                <Brain className="w-5 h-5 text-teal flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-teal">Demo Mode — Arjun Chatterjee · Class X-A · Pre-Board 2025</p>
                  <p className="text-xs text-gray-600 mt-0.5">AI scans the handwritten answer sheet, extracts text via OCR, matches against model answers, and awards marks with feedback. Total paper: 80 marks.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: pipeline */}
                <div className="space-y-4">
                  <h3 className="font-sora font-semibold text-navy">Processing Pipeline</h3>

                  {/* Simulated file upload */}
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center bg-gray-50">
                    <ScanLine className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 mb-2">arjun_prebd_2025.pdf</p>
                    <p className="text-[10px] text-gray-300">8 pages · 2.3 MB</p>
                  </div>

                  {/* Steps */}
                  <div className="space-y-2">
                    {COPY_STEPS.map((step, i) => {
                      const Icon = step.icon;
                      const done = copyDone || copyStep > i;
                      const active = copyRunning && copyStep === i;
                      return (
                        <div key={step.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          done ? 'bg-green/5 border-green/20' : active ? 'bg-navy/5 border-navy/15 animate-pulse' : 'bg-gray-50 border-gray-100'
                        }`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            done ? 'bg-green/15' : active ? 'bg-navy/10' : 'bg-gray-100'
                          }`}>
                            {done ? <CheckCircle2 className="w-4 h-4 text-green" /> : <Icon className={`w-4 h-4 ${active ? 'text-navy' : 'text-gray-300'}`} />}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-xs font-semibold ${done ? 'text-green' : active ? 'text-navy' : 'text-gray-400'}`}>{step.label}</p>
                            {(done || active) && <p className="text-[10px] text-gray-400 mt-0.5">{step.desc}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!copyDone && (
                    <button onClick={runCopyChecker} disabled={copyRunning}
                      className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold/90 disabled:opacity-60 text-navy font-sora font-bold py-3 rounded-xl transition-all">
                      {copyRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                      {copyRunning ? 'Checking…' : 'Run AI Copy Check'}
                    </button>
                  )}

                  {copyDone && (
                    <div className="bg-gradient-to-br from-goldLight to-white border border-gold/30 rounded-2xl p-4 text-center">
                      <p className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1"><AIBadge />Final Score</p>
                      <div className="text-4xl font-sora font-bold text-navy mb-1">{totalAwarded}/{totalMax}</div>
                      <div className="text-xl font-sora font-bold text-gold mb-2">{scorePercent}%</div>
                      <div className={`text-xs font-semibold ${scorePercent >= 75 ? 'text-green' : scorePercent >= 50 ? 'text-amber' : 'text-coral'}`}>
                        {scorePercent >= 75 ? 'First Division' : scorePercent >= 50 ? 'Second Division' : 'Needs Improvement'}
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full mt-3 overflow-hidden">
                        <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${scorePercent}%` }} />
                      </div>
                      <button onClick={() => toast.success('Detailed report downloaded')}
                        className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-semibold bg-navy text-white py-2 rounded-lg">
                        <Download className="w-3.5 h-3.5" /> Download Report
                      </button>
                    </div>
                  )}
                </div>

                {/* Right: results */}
                <div className="lg:col-span-2">
                  {!copyDone ? (
                    <div className="h-full flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
                      <ClipboardCheck className="w-12 h-12 text-gray-200 mb-4" />
                      <p className="font-sora font-semibold text-gray-400 mb-1">Results will appear here</p>
                      <p className="text-sm text-gray-300">Run AI Copy Check to see detailed marks and feedback.</p>
                    </div>
                  ) : (
                    <div>
                      {/* Summary row */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {[
                          { label: 'Questions', value: COPY_RESULTS.length, color: 'text-navy', bg: 'bg-navy/5' },
                          { label: 'Full Marks', value: COPY_RESULTS.filter(r => r.awarded === r.maxMarks).length, color: 'text-green', bg: 'bg-green/8' },
                          { label: 'Needs Work', value: COPY_RESULTS.filter(r => r.awarded < r.maxMarks * 0.7).length, color: 'text-coral', bg: 'bg-coral/8' },
                        ].map(s => (
                          <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                            <div className={`text-2xl font-sora font-bold ${s.color}`}>{s.value}</div>
                            <div className="text-xs text-gray-500">{s.label}</div>
                          </div>
                        ))}
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-gray-100 max-h-[400px] overflow-y-auto">
                        <table className="w-full min-w-[560px]">
                          <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                            <tr>
                              {['Q.No', 'Subject', 'Marks', 'Bloom\'s', 'AI Feedback'].map(h => (
                                <th key={h} className="text-left text-xs uppercase tracking-wide text-gray-400 px-4 py-3 font-medium">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {COPY_RESULTS.map((r, i) => {
                              const pct = (r.awarded / r.maxMarks) * 100;
                              return (
                                <tr key={r.qno} className={`border-b border-gray-50 hover:bg-gray-50 ${i % 2 !== 0 ? 'bg-gray-50/30' : ''}`}>
                                  <td className="px-4 py-3 font-bold text-sm text-navy">{r.qno}</td>
                                  <td className="px-4 py-3 text-xs text-gray-600">{r.subject}</td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`font-bold text-sm ${pct === 100 ? 'text-green' : pct >= 70 ? 'text-amber' : 'text-coral'}`}>{r.awarded}</span>
                                      <span className="text-gray-300 text-xs">/ {r.maxMarks}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${BLOOMS_COLORS[r.blooms]}`}>{r.blooms}</span>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[220px]">{r.feedback}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── QUESTION BANK ────────────────────────────────────────────── */}
          {activeTab === 'questionbank' && (
            <div>
              {/* Filters */}
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input placeholder="Search questions or topics…" className="pl-8 h-9 text-sm" value={qSearch} onChange={e => setQSearch(e.target.value)} />
                </div>
                {[
                  { val: qSubjectFilter, set: setQSubjectFilter, opts: subjects, placeholder: 'Subject' },
                  { val: qTypeFilter, set: setQTypeFilter, opts: qTypes, placeholder: 'Type' },
                  { val: qBloomsFilter, set: setQBloomsFilter, opts: ['All', ...BLOOMS_LEVELS], placeholder: "Bloom's" },
                  { val: qDiffFilter, set: setQDiffFilter, opts: ['All', 'easy', 'medium', 'hard'], placeholder: 'Difficulty' },
                ].map((f, fi) => (
                  <select key={fi} value={f.val} onChange={e => f.set(e.target.value)}
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-navy/20">
                    {f.opts.map(o => <option key={o} value={o}>{o === 'All' ? f.placeholder + ': All' : o}</option>)}
                  </select>
                ))}
                <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                  <Filter className="w-3 h-3" />{filteredQs.length} questions
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Total Questions', value: allQuestions.length, color: 'text-navy' },
                  { label: 'MCQ', value: allQuestions.filter(q => q.type === 'mcq').length, color: 'text-blue-600' },
                  { label: 'Short Answer', value: allQuestions.filter(q => q.type === 'short').length, color: 'text-amber' },
                  { label: 'Long Answer', value: allQuestions.filter(q => q.type === 'long').length, color: 'text-purple' },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                    <div className={`text-xl font-sora font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-gray-400">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Question list */}
              <div className="space-y-2">
                {filteredQs.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100">
                    <Search className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No questions match your filters</p>
                  </div>
                ) : filteredQs.map(q => {
                  const isExpanded = expandedQ === q.id;
                  return (
                    <div key={q.id} className="border border-gray-100 rounded-xl overflow-hidden hover:border-gray-200 transition-all">
                      <button onClick={() => setExpandedQ(isExpanded ? null : q.id)}
                        className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 transition-colors">
                        <div className={`w-14 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 ${
                          q.type === 'mcq' ? 'bg-blue-100 text-blue-700' :
                          q.type === 'short' ? 'bg-amber/15 text-amber' :
                          q.type === 'long' ? 'bg-purple/10 text-purple' : 'bg-gray-100 text-gray-600'
                        }`}>{q.type.toUpperCase()}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 font-medium line-clamp-2">{q.question}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-gray-400">{q.subject} · {q.chapter}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${BLOOMS_COLORS[q.bloomsLevel]}`}>{q.bloomsLevel}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${DIFF_COLORS[q.difficulty]}`}>{q.difficulty}</span>
                            <span className="text-[10px] text-gray-400">{q.marks}m</span>
                          </div>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-gray-50 bg-gray-50/50 space-y-3">
                          {q.type === 'mcq' && 'options' in q && q.options && (
                            <div className="grid grid-cols-2 gap-2 mt-3">
                              {(q.options as string[]).map((opt: string, oi: number) => (
                                <div key={oi} className={`text-xs px-3 py-2 rounded-lg border ${opt === q.correctAnswer ? 'bg-green/8 border-green/20 text-green font-semibold' : 'bg-white border-gray-100 text-gray-600'}`}>
                                  {['(a)', '(b)', '(c)', '(d)'][oi]} {opt}
                                  {opt === q.correctAnswer && <span className="ml-1">✓</span>}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="bg-white rounded-xl p-3 border border-gray-100">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Model Answer</p>
                            <p className="text-xs text-gray-700 leading-relaxed">{q.modelAnswer}</p>
                          </div>
                          {q.commonMistakes && q.commonMistakes.length > 0 && (
                            <div className="bg-coral/5 rounded-xl p-3 border border-coral/10">
                              <p className="text-[10px] font-semibold text-coral uppercase tracking-wide mb-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Common Mistakes</p>
                              <ul className="space-y-0.5">
                                {q.commonMistakes.map((m: string, mi: number) => (
                                  <li key={mi} className="text-xs text-gray-600">• {m}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── MARKING SCHEME ───────────────────────────────────────────── */}
          {activeTab === 'marking' && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-sora font-semibold text-navy">Structured Marking Schemes</h3>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5"><AIBadge />AI-generated point-wise breakdowns for examiners</p>
                </div>
                <button onClick={() => toast.success('Full marking scheme exported as PDF')}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-navy text-white px-3 py-2 rounded-lg hover:bg-navyMid transition-colors">
                  <Download className="w-3.5 h-3.5" /> Export All
                </button>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Section A (MCQ)', marks: '4 × 1 = 4', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-100' },
                  { label: 'Section B (Short)', marks: '4 × 3-4 = 13', color: 'text-amber', bg: 'bg-amber/8 border-amber/15' },
                  { label: 'Section C (Long)', marks: '3 × 6-8 = 20', color: 'text-purple', bg: 'bg-purple/8 border-purple/15' },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl p-3 border ${s.bg}`}>
                    <div className={`text-sm font-sora font-bold ${s.color}`}>{s.marks}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Marking scheme cards */}
              <div className="space-y-4">
                {MARKING_SCHEMES.map(scheme => (
                  <div key={scheme.qno} className="border border-gray-100 rounded-2xl overflow-hidden">
                    <div className="bg-gray-50 px-5 py-3 flex items-center justify-between border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="bg-navy text-white text-xs font-bold px-2 py-0.5 rounded-lg font-sora">Q.{scheme.qno}</div>
                        <span className="text-sm font-semibold text-gray-700">{scheme.subject}</span>
                        <span className="text-xs text-gray-400">{scheme.question}</span>
                      </div>
                      <span className="text-sm font-bold text-navy font-sora">[{scheme.totalMarks} marks]</span>
                    </div>
                    <div className="p-5 space-y-3">
                      {/* Points breakdown */}
                      <div className="space-y-2">
                        {scheme.points.map((point, pi) => (
                          <div key={pi} className="flex items-start gap-3 bg-green/3 border border-green/10 rounded-xl px-4 py-2.5">
                            <div className="w-5 h-5 rounded-full bg-green/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-[10px] font-bold text-green">{pi + 1}</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-gray-800">{point.point}</p>
                            </div>
                            <div className="flex-shrink-0">
                              <span className="text-sm font-bold text-green">+{point.marks}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Common mistakes */}
                      <div className="bg-coral/5 rounded-xl p-3 border border-coral/10">
                        <p className="text-xs font-semibold text-coral uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <AlertCircle className="w-3 h-3" /> Common Deduction Points
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {scheme.commonMistakes.map((m, mi) => (
                            <span key={mi} className="text-xs bg-white text-gray-600 border border-coral/15 px-2.5 py-1 rounded-lg">
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Examiner note */}
                      <div className="bg-goldLight border border-gold/20 rounded-xl p-3 flex items-start gap-2">
                        <Award className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-600">
                          <span className="font-semibold text-amber">Examiner&apos;s Note:</span> Award full marks if the student demonstrates correct understanding even with minor notational variations. Do not penalise for presentation unless specifically asked.
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Board comparison note */}
              <div className="mt-5 bg-iceLight border border-ice rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-navy" />
                  <p className="text-sm font-semibold text-navy">Board Marking Scheme Differences</p>
                  <AIBadge />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  {[
                    { board: 'CISCE', note: 'Holistic marking — partial credit allowed. Examiners instructed to reward method even if final answer is wrong.' },
                    { board: 'CBSE', note: 'Step-marking scheme strictly followed. Each step carries defined marks. No marks for correct answer without method.' },
                    { board: 'WB Board', note: 'Traditional full/half-mark system. Diagrams are compulsory for biology/physics. No partial marks for MCQ.' },
                  ].map(b => (
                    <div key={b.board} className="bg-white rounded-xl p-3 border border-gray-100">
                      <p className="text-xs font-bold text-navy mb-1">{b.board}</p>
                      <p className="text-xs text-gray-600">{b.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </PageWrapper>
  );
}
