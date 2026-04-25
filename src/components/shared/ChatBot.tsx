'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare, X, Send, Bot, User, Sparkles,
  Minimize2, Maximize2, RefreshCw, ChevronRight,
} from 'lucide-react';

// ─── Data imports ─────────────────────────────────────────────────────────────
import studentsData   from '@/data/students.json';
import staffData      from '@/data/staff.json';
import attendanceData from '@/data/attendance.json';
import feeData        from '@/data/fee.json';
import homeworkData   from '@/data/homework.json';
import healthData     from '@/data/health.json';
import libraryData    from '@/data/library.json';
import admissionsData from '@/data/admissions.json';
import analyticsData  from '@/data/analytics.json';
import transportData  from '@/data/transport.json';
import timetableData  from '@/data/timetable.json';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChatBotMode = 'school' | 'parent';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  cards?: Card[];
  chips?: string[];
  ts: number;
};

type Card = {
  label: string;
  value: string;
  sub?: string;
  color?: string;
};

type QueryResult = {
  text: string;
  cards?: Card[];
  chips?: string[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtAmt = (n: number) => '₹' + n.toLocaleString('en-IN');
const fmtPct = (n: number) => `${n}%`;
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
const includes  = (haystack: string, needle: string) => normalize(haystack).includes(normalize(needle));

function findStudent(query: string) {
  const q = normalize(query);
  return studentsData.find(s =>
    normalize(s.name).includes(q) ||
    normalize(s.id).includes(q) ||
    normalize(s.rollNo).includes(q)
  );
}

function findStaff(query: string) {
  const q = normalize(query);
  return staffData.find(s =>
    normalize(s.name).includes(q) ||
    normalize(s.designation).includes(q) ||
    normalize(s.subject ?? '').includes(q)
  );
}

// ─── Query Engine ─────────────────────────────────────────────────────────────

function resolveQuery(rawInput: string, mode: ChatBotMode, parentChildIds?: string[]): QueryResult {
  const q = normalize(rawInput);
  const words = q.split(' ');

  // ── Greetings ──
  if (/^(hi|hello|hey|namaste|namaskar|good morning|good afternoon|good evening)/.test(q)) {
    const greets = mode === 'parent'
      ? "Hello! I'm your SchoolOS assistant. I can help you with your child's attendance, fee status, homework, health records, and more. What would you like to know?"
      : "Hello! I'm the SchoolOS AI assistant for Sundarban Academy. I can answer questions about students, staff, attendance, fees, admissions, library, and more. How can I help?";
    return {
      text: greets,
      chips: mode === 'parent'
        ? ["My child's attendance", "Fee status", "Pending homework", "Health records"]
        : ["Today's attendance", "Fee overview", "At-risk students", "Admissions pipeline"],
    };
  }

  // ── Help ──
  if (/\b(help|what can you|capabilities|commands|options)\b/.test(q)) {
    const schoolTopics = ['Student info & search', 'Attendance (overall / class / student)', 'Fee status & collections', 'Staff directory & leaves', 'Admissions pipeline', 'Library & overdue books', 'Homework & assignments', 'Health & nurse records', 'Transport routes', 'Analytics & trends'];
    const parentTopics = ['Child attendance & calendar', 'Fee status & Pay now', 'Pending homework', 'Health & medical records', 'Bus location & ETA', 'Academic scores', 'Announcements', 'School shop orders'];
    const topics = mode === 'parent' ? parentTopics : schoolTopics;
    return {
      text: `Here's what I can help you with:`,
      cards: topics.map(t => ({ label: t, value: '→', color: 'navy' })),
      chips: mode === 'parent'
        ? ["Show fee status", "Attendance this month", "What homework is due?"]
        : ["Show all overdue fees", "Who is at-risk?", "Today's attendance summary"],
    };
  }

  // ── Today's overall attendance ──
  if (/\b(today|overall|school).{0,20}attendance\b|\battendance.{0,20}(today|overall|school)\b/.test(q)) {
    const a = attendanceData.schoolOverall;
    return {
      text: `📊 Today's school-wide attendance at Sundarban Academy:\n\n**${a.present}** students present out of **${a.total}** enrolled — **${a.percent}%** overall.\n\n${a.percent >= 90 ? '✅ Excellent turnout today!' : a.percent >= 80 ? '⚠️ Slightly below the 90% target.' : '🔴 Attendance is critically low today.'}`,
      cards: [
        { label: 'Present', value: String(a.present), color: 'green' },
        { label: 'Absent', value: String(a.absent), color: 'red' },
        { label: 'Rate', value: fmtPct(a.percent), color: a.percent >= 90 ? 'green' : 'amber' },
      ],
    };
  }

  // ── Class-wise attendance ──
  if (/attendance.{0,20}class|class.{0,20}attendance/.test(q)) {
    const classMatch = q.match(/class\s*(vi{0,3}|i{1,3}v?|x{1,2}i{0,2}|[0-9]+)/i);
    if (classMatch) {
      const clsRaw = classMatch[0].replace('class', '').trim();
      const row = attendanceData.classWise.find(c =>
        normalize(c.class).includes(normalize(clsRaw))
      );
      if (row) {
        return {
          text: `📋 Attendance for **${row.class}** today:\n\n${row.present}/${row.total} students present — **${row.percent}%**\nTeacher: ${row.teacher}`,
          cards: [
            { label: 'Present', value: String(row.present), color: 'green' },
            { label: 'Absent',  value: String(row.absent),  color: 'red' },
            { label: '%',       value: fmtPct(row.percent), color: row.percent >= 90 ? 'green' : row.percent >= 75 ? 'amber' : 'red' },
          ],
        };
      }
    }
    // All classes summary
    const low = attendanceData.classWise.filter(c => c.percent < 85);
    return {
      text: `📊 Class-wise attendance summary for today:\n\n${attendanceData.classWise.map(c => `• ${c.class}: ${c.percent}%`).join('\n')}\n\n${low.length > 0 ? `⚠️ ${low.length} class(es) below 85%: ${low.map(c => c.class).join(', ')}` : '✅ All classes above 85%'}`,
    };
  }

  // ── Absentees today ──
  if (/\b(absent|absentee|missing|not present).{0,20}today\b|\btoday.{0,20}absent\b/.test(q)) {
    const abs = attendanceData.absentees;
    return {
      text: `🔴 **${abs.length} students** absent today:\n\n${abs.map(a => `• ${a.name} (${a.class}) — ${a.reason ?? 'No reason'}${a.parentNotified ? ' ✓' : ' — Parent not notified'}`).join('\n')}`,
      cards: abs.map(a => ({ label: a.name, value: a.class, sub: a.reason ?? 'No reason given', color: 'red' })),
    };
  }

  // ── Student attendance by name ──
  if (/attendance.{0,30}(of|for)?|who.{0,20}attendance/.test(q)) {
    // extract a name from the query
    const nameWords = words.filter(w => w.length > 3 && !['attendance','what','show','give','tell','about','their','student','today','overall'].includes(w));
    if (nameWords.length > 0) {
      const student = studentsData.find(s =>
        nameWords.some(w => normalize(s.name).includes(w))
      );
      if (student) {
        return {
          text: `📅 Attendance for **${student.name}** (${student.class}):\n\n**${student.attendancePercent}%** this academic year.\n\n${student.attendancePercent >= 85 ? '✅ Good standing' : student.attendancePercent >= 75 ? '⚠️ Below 85% — at risk of shortage' : '🔴 Critical — below 75%, parent counselling required'}`,
          cards: [
            { label: 'Attendance', value: fmtPct(student.attendancePercent), color: student.attendancePercent >= 85 ? 'green' : student.attendancePercent >= 75 ? 'amber' : 'red' },
            { label: 'Class', value: `${student.class} ${student.section}`, color: 'navy' },
            { label: 'Roll No', value: student.rollNo, color: 'navy' },
          ],
        };
      }
    }
  }

  // ── Fee overview ──
  if (/\b(fee|fees|payment|collection).{0,20}(overview|summary|total|status)\b|\b(total|overall).{0,20}(fee|collection)\b/.test(q)) {
    const s = feeData.summary;
    const rate = Math.round((s.collected / s.totalDue) * 100);
    return {
      text: `💰 **Fee Collection Summary — Term 2 2024-25:**\n\n• Total Due: ${fmtAmt(s.totalDue)}\n• Collected: ${fmtAmt(s.collected)} (${rate}%)\n• Pending: ${fmtAmt(s.pending)}\n• Overdue accounts: ${s.overdueCount}\n\n${rate >= 90 ? '✅ Collection on track' : '⚠️ Below 90% collection target'}`,
      cards: [
        { label: 'Collected',  value: fmtAmt(s.collected),  color: 'green' },
        { label: 'Pending',    value: fmtAmt(s.pending),    color: 'amber' },
        { label: 'Overdue',    value: String(s.overdueCount), color: 'red' },
        { label: 'Rate',       value: fmtPct(rate),          color: rate >= 90 ? 'green' : 'amber' },
      ],
      chips: ['Who has overdue fees?', 'Pending payments list'],
    };
  }

  // ── Overdue fees ──
  if (/\b(overdue|defaulter|default).{0,20}fee|\bfee.{0,20}overdue\b/.test(q)) {
    const ov = feeData.records.filter(r => r.status === 'overdue');
    return {
      text: `🔴 **${ov.length} students** with overdue fees:\n\n${ov.map(r => `• ${r.studentName} (${r.class}) — ${fmtAmt(r.amount)} overdue`).join('\n')}`,
      cards: ov.map(r => ({ label: r.studentName, value: fmtAmt(r.amount), sub: r.class, color: 'red' })),
      chips: ['Send reminders to all', 'Fee collection rate'],
    };
  }

  // ── Pending fees ──
  if (/\b(pending).{0,20}fee|\bfee.{0,20}pending\b/.test(q)) {
    const pend = feeData.records.filter(r => r.status === 'pending');
    return {
      text: `⏳ **${pend.length} students** with pending fee payments:\n\n${pend.map(r => `• ${r.studentName} (${r.class}) — ${fmtAmt(r.amount)} due ${r.dueDate}`).join('\n')}`,
      cards: pend.slice(0, 5).map(r => ({ label: r.studentName, value: fmtAmt(r.amount), sub: r.class, color: 'amber' })),
    };
  }

  // ── Fee status of specific student ──
  if (/\bfee.{0,30}(of|for|status)\b/.test(q) || /\b(paid|unpaid|dues).{0,30}(student|for)\b/.test(q)) {
    const nameWords = words.filter(w => w.length > 3 && !['fees','status','paid','unpaid','show','what','their','check'].includes(w));
    if (nameWords.length > 0) {
      const student = studentsData.find(s => nameWords.some(w => normalize(s.name).includes(w)));
      if (student) {
        const rec = feeData.records.filter(r => r.studentId === student.id);
        if (rec.length > 0) {
          const latest = rec.find(r => r.status !== 'paid') ?? rec[rec.length - 1];
          return {
            text: `💳 Fee status for **${student.name}** (${student.class}):\n\n• Term: ${latest.term}\n• Amount: ${fmtAmt(latest.amount)}\n• Status: **${latest.status.toUpperCase()}**${latest.paidDate ? `\n• Paid on: ${latest.paidDate}` : `\n• Due: ${latest.dueDate}`}${latest.paymentMode ? `\n• Mode: ${latest.paymentMode}` : ''}${latest.receiptNo ? `\n• Receipt: ${latest.receiptNo}` : ''}`,
            cards: [{ label: 'Status', value: latest.status.toUpperCase(), color: latest.status === 'paid' ? 'green' : latest.status === 'overdue' ? 'red' : 'amber' }],
          };
        }
        return { text: `No fee records found for ${student.name}.` };
      }
    }
  }

  // ── Student info / profile ──
  if (/\b(student|profile|info|details|about|show me|who is|find)\b/.test(q)) {
    const nameWords = words.filter(w => w.length > 3 && !['student','profile','info','details','about','show','find','who','class','tell'].includes(w));
    if (nameWords.length > 0) {
      const student = studentsData.find(s => nameWords.some(w => normalize(s.name).includes(w)));
      if (student) {
        const scores = student.academicScore as Record<string, number>;
        const avg = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length);
        return {
          text: `👤 **${student.name}**\n\n📚 ${student.class} — Section ${student.section} | Roll: ${student.rollNo}\n🏠 House: ${student.house} | Blood: ${student.bloodGroup}\n📅 DOB: ${student.dob} | Joined: ${student.admissionDate}\n📊 Attendance: ${student.attendancePercent}% | Avg Score: ${avg}%\n💰 Fee: ${student.feeStatus.toUpperCase()}\n👨‍👩‍👦 Parent: ${student.parent.father} | 📱 ${student.parent.phone}${student.medicalNotes ? `\n⚕️ Medical: ${student.medicalNotes}` : ''}`,
          cards: [
            { label: 'Attendance', value: fmtPct(student.attendancePercent), color: student.attendancePercent >= 85 ? 'green' : 'amber' },
            { label: 'Avg Score',  value: fmtPct(avg),   color: avg >= 75 ? 'green' : 'amber' },
            { label: 'Fee',        value: student.feeStatus.toUpperCase(), color: student.feeStatus === 'paid' ? 'green' : 'red' },
          ],
          chips: [`${student.name}'s attendance`, `${student.name}'s fee status`, `${student.name}'s subjects`],
        };
      }
    }
  }

  // ── Students in a class ──
  if (/\b(students|list).{0,20}class\s*(vi{0,3}|i{1,3}v?|x{1,2}i{0,2}|[0-9]+)\b|\bclass\s*(vi{0,3}|i{1,3}v?|x{1,2}i{0,2}|[0-9]+).{0,20}students\b/i.test(q)) {
    const classMatch = q.match(/class\s*(vi{0,3}|i{1,3}v?|x{1,2}i{0,2}|[0-9]+)/i);
    if (classMatch) {
      const clsRaw = classMatch[0].trim();
      const students = studentsData.filter(s => normalize(s.class).startsWith(normalize(clsRaw)));
      if (students.length > 0) {
        return {
          text: `👨‍🎓 **${students.length} students** in ${clsRaw.charAt(0).toUpperCase() + clsRaw.slice(1)}:\n\n${students.slice(0, 8).map(s => `• ${s.name} (Roll ${s.rollNo}) — Att: ${s.attendancePercent}%`).join('\n')}${students.length > 8 ? `\n…and ${students.length - 8} more` : ''}`,
          cards: students.slice(0, 4).map(s => ({ label: s.name, value: s.rollNo, sub: `Att: ${s.attendancePercent}%`, color: 'navy' })),
        };
      }
    }
  }

  // ── At-risk students ──
  if (/\b(at.?risk|risk|struggling|low attendance|concern)\b/.test(q)) {
    const atRisk = (analyticsData.atRiskStudents as { studentId: string; reason: string }[]);
    const riskStudents = atRisk.map(r => {
      const s = studentsData.find(st => st.id === r.studentId);
      return { ...r, name: s?.name ?? r.studentId, class: s?.class ?? '' };
    });
    return {
      text: `⚠️ **${riskStudents.length} at-risk students** identified by AI:\n\n${riskStudents.map(r => `• ${r.name} (${r.class}) — ${r.reason}`).join('\n')}\n\nRecommend immediate counsellor follow-up.`,
      cards: riskStudents.map(r => ({ label: r.name, value: r.class, sub: r.reason, color: 'red' })),
      chips: ['Fee defaulters', 'Low attendance students'],
    };
  }

  // ── Total students ──
  if (/\b(how many|total|count).{0,20}student|\bstudent.{0,20}(count|total|number)\b/.test(q)) {
    const total = studentsData.length;
    const byClass = studentsData.reduce<Record<string, number>>((acc, s) => { acc[s.class] = (acc[s.class] ?? 0) + 1; return acc; }, {});
    return {
      text: `📊 **${total} students** enrolled at Sundarban Academy.\n\n${Object.entries(byClass).map(([c, n]) => `• ${c}: ${n}`).join('\n')}`,
      cards: [{ label: 'Total Enrolled', value: String(total), color: 'navy' }],
    };
  }

  // ── Staff / teacher lookup ──
  if (/\b(staff|teacher|principal|who teaches|faculty|employee)\b/.test(q)) {
    // Subject search
    const subjectMatch = q.match(/teaches?\s+(\w+)/);
    if (subjectMatch) {
      const subject = subjectMatch[1];
      const teachers = staffData.filter(s => s.subject && normalize(s.subject).includes(subject));
      if (teachers.length > 0) {
        return {
          text: `👩‍🏫 **${subject.charAt(0).toUpperCase() + subject.slice(1)}** is taught by:\n\n${teachers.map(t => `• ${t.name} (${t.designation}) — ${t.phone}`).join('\n')}`,
          cards: teachers.map(t => ({ label: t.name, value: t.designation, sub: t.subject ?? '', color: 'navy' })),
        };
      }
    }

    // Staff count / overview
    if (/\b(how many|total|count|list all)\b/.test(q)) {
      const active    = staffData.filter(s => s.status === 'active').length;
      const onLeave   = staffData.filter(s => s.status === 'on-leave').length;
      const teachers  = staffData.filter(s => s.designation.toLowerCase().includes('teacher')).length;
      return {
        text: `👥 **Staff at Sundarban Academy:**\n\n• Total: ${staffData.length}\n• Active: ${active}\n• On Leave: ${onLeave}\n• Teachers: ${teachers}`,
        cards: [
          { label: 'Total Staff',  value: String(staffData.length), color: 'navy' },
          { label: 'Active',       value: String(active),           color: 'green' },
          { label: 'On Leave',     value: String(onLeave),          color: 'amber' },
        ],
      };
    }

    // Staff on leave
    if (/\b(leave|absent|off)\b/.test(q)) {
      const onLeave = staffData.filter(s => s.status === 'on-leave');
      return {
        text: `📋 **${onLeave.length} staff member(s) on leave:**\n\n${onLeave.map(s => `• ${s.name} (${s.designation})`).join('\n') || 'No staff on leave currently.'}`,
        cards: onLeave.map(s => ({ label: s.name, value: s.designation, sub: s.department, color: 'amber' })),
      };
    }

    // Principal
    if (/\b(principal)\b/.test(q)) {
      const p = staffData.find(s => s.designation.toLowerCase().includes('principal') && !s.designation.toLowerCase().includes('vice'));
      if (p) {
        return {
          text: `🎓 **${p.name}** is the Principal of Sundarban Academy.\n\n• Qualification: ${p.qualification}\n• Phone: ${p.phone}\n• Email: ${p.email}\n• Joined: ${p.joiningDate}`,
        };
      }
    }

    // Name search
    const nameWords = words.filter(w => w.length > 3 && !['staff','teacher','faculty','show','find','who','about','their','details'].includes(w));
    if (nameWords.length > 0) {
      const staffMember = staffData.find(s => nameWords.some(w => normalize(s.name).includes(w)));
      if (staffMember) {
        return {
          text: `👨‍🏫 **${staffMember.name}**\n\n• Designation: ${staffMember.designation}\n• Department: ${staffMember.department}${staffMember.subject ? `\n• Subject: ${staffMember.subject}` : ''}\n• Qualification: ${staffMember.qualification}\n• Phone: ${staffMember.phone}\n• Email: ${staffMember.email}\n• Status: ${staffMember.status.toUpperCase()}\n• Leave Balance: ${staffMember.leaveBalance} days`,
        };
      }
    }
  }

  // ── Homework / assignments ──
  if (/\b(homework|assignment|task|due|submit)\b/.test(q)) {
    // Class specific
    const classMatch = q.match(/class\s*(vi{0,3}|i{1,3}v?|x{1,2}i{0,2}|[0-9]+)/i);
    if (classMatch) {
      const clsRaw = classMatch[0].trim();
      const hw = homeworkData.assignments.filter(h => normalize(h.class).startsWith(normalize(clsRaw)));
      const active = hw.filter(h => h.status === 'active');
      if (hw.length > 0) {
        return {
          text: `📚 **${active.length} active assignments** for ${clsRaw.charAt(0).toUpperCase() + clsRaw.slice(1)}:\n\n${active.map(h => `• ${h.subject}: ${h.description.slice(0, 60)}… (Due: ${h.dueDate})`).join('\n')}`,
          cards: active.map(h => ({ label: h.subject, value: h.dueDate, sub: h.teacher, color: 'purple' })),
        };
      }
    }
    // Pending/overdue
    if (/\b(pending|active|due|overdue)\b/.test(q)) {
      const active = homeworkData.assignments.filter(h => h.status === 'active');
      return {
        text: `📋 **${active.length} active assignments** across all classes:\n\n${active.slice(0, 6).map(h => `• ${h.class} — ${h.subject} (Due: ${h.dueDate})`).join('\n')}`,
        cards: active.slice(0, 4).map(h => ({ label: `${h.class} · ${h.subject}`, value: h.dueDate, sub: h.teacher, color: 'purple' })),
      };
    }
  }

  // ── Library ──
  if (/\b(library|book|borrow|issue|return|overdue book)\b/.test(q)) {
    const stats = libraryData.stats;

    if (/\b(overdue|late|return)\b/.test(q)) {
      // Build overdue list from books.issuedTo + student lookup
      const overdueList: { studentName: string; class: string; bookTitle: string; dueDate: string }[] = [];
      libraryData.books.forEach(book => {
        book.issuedTo.forEach((issue: { studentId: string; dueDate: string }) => {
          const s = studentsData.find(st => st.id === issue.studentId);
          if (s) overdueList.push({ studentName: s.name, class: s.class, bookTitle: book.title, dueDate: issue.dueDate });
        });
      });
      return {
        text: `📚 **${stats.overdueReturns} overdue book returns tracked:**\n\n${overdueList.slice(0, 5).map(b => `• ${b.bookTitle} — ${b.studentName} (${b.class}), due ${b.dueDate}`).join('\n')}`,
        cards: overdueList.slice(0, 4).map(b => ({ label: b.studentName, value: b.bookTitle.slice(0, 25), sub: `Due: ${b.dueDate}`, color: 'red' })),
      };
    }

    if (/\b(available|copies|stock)\b/.test(q)) {
      const available = libraryData.books.filter(b => b.available > 0).length;
      return {
        text: `📖 **Library Status:**\n\n• Total Books: ${stats.totalBooks}\n• Issued Today: ${stats.issuedToday}\n• Overdue Returns: ${stats.overdueReturns}\n• Books with available copies: ${available}/${libraryData.books.length}`,
        cards: [
          { label: 'Total Books',  value: String(stats.totalBooks),    color: 'navy' },
          { label: 'Issued Today', value: String(stats.issuedToday),   color: 'teal' },
          { label: 'Overdue',      value: String(stats.overdueReturns), color: 'red' },
        ],
      };
    }

    // Book title search
    const bookSearch = words.filter(w => w.length > 3 && !['library','book','books','find','search','available','about','show'].includes(w));
    if (bookSearch.length > 0) {
      const book = libraryData.books.find(b => bookSearch.some(w => normalize(b.title).includes(w)));
      if (book) {
        return {
          text: `📗 **${book.title}**\n\nAuthor: ${book.author}\nGenre: ${book.genre}\nTotal Copies: ${book.copies}\nAvailable: ${book.available}\nISSN: ${book.isbn}`,
          cards: [{ label: book.title.slice(0, 30), value: `${book.available}/${book.copies} available`, sub: book.author, color: book.available > 0 ? 'green' : 'red' }],
        };
      }
    }

    return {
      text: `📚 **Library Overview:**\n\n• Total Books: ${stats.totalBooks}\n• Issued Today: ${stats.issuedToday}\n• Overdue Returns: ${stats.overdueReturns}\n• New Arrivals: ${stats.newArrivals}`,
      chips: ['Overdue books', 'Available books', 'Most borrowed'],
    };
  }

  // ── Admissions ──
  if (/\b(admission|applicant|application|pipeline|enrol)\b/.test(q)) {
    const stages = admissionsData.stages.slice(0, 6); // exclude Rejected for summary
    const stageCounts = admissionsData.applicants.reduce<Record<string, number>>((acc, a) => {
      acc[a.stage] = (acc[a.stage] ?? 0) + 1; return acc;
    }, {});
    const total = admissionsData.applicants.length;
    const enrolled = stageCounts['Enrolled'] ?? 0;

    if (/\b(enrolled|confirmed)\b/.test(q)) {
      const enrolled = admissionsData.applicants.filter(a => a.stage === 'Enrolled');
      return {
        text: `✅ **${enrolled.length} applicants enrolled:**\n\n${enrolled.map(a => `• ${a.name} — ${a.applyingForClass} (via ${a.source})`).join('\n')}`,
        cards: enrolled.map(a => ({ label: a.name, value: a.applyingForClass, sub: a.source, color: 'green' })),
      };
    }

    return {
      text: `🏫 **Admissions Pipeline — AY 2025-26:**\n\nTotal applications: ${total}\n\n${stages.map(s => `• ${s}: ${stageCounts[s] ?? 0}`).join('\n')}\n\nConversion rate: ${Math.round((enrolled / total) * 100)}%`,
      cards: stages.slice(0, 4).map(s => ({ label: s, value: String(stageCounts[s] ?? 0), color: s === 'Enrolled' ? 'green' : s === 'Rejected' ? 'red' : 'navy' })),
      chips: ['Enrolled students', 'Pending interviews'],
    };
  }

  // ── Transport ──
  if (/\b(bus|transport|route|vehicle|driver|gps|track)\b/.test(q)) {
    if (/\b(route|routes|all)\b/.test(q)) {
      return {
        text: `🚌 **${transportData.routes.length} bus routes** operating:\n\n${transportData.routes.map(r => `• ${r.routeName} — ${r.driver} | ${r.studentsCount}/${r.capacity} students | Bus: ${r.vehicle}`).join('\n')}`,
        cards: transportData.routes.map(r => ({ label: r.routeName, value: `${r.studentsCount} students`, sub: r.driver, color: 'teal' })),
      };
    }
    return {
      text: `🚌 **Transport Summary:**\n\n• ${transportData.routes.length} routes operational\n• Total students: ${transportData.routes.reduce((s, r) => s + r.studentsCount, 0)}\n• All GPS-enabled vehicles\n\nBus 1 is currently at Behala Chowrasta — ETA school: 8 mins ✅`,
      chips: ['All bus routes', 'Bus 1 status', 'Route 2 stops'],
    };
  }

  // ── Timetable ──
  if (/\b(timetable|schedule|period|class.{0,10}x|today.{0,10}period)\b/.test(q)) {
    const schedule = (timetableData.schedule as Record<string, Record<string, { periodNo: number; subject: string; teacher: string; startTime: string; endTime: string; room: string }[]>>)['Class X-A'];
    const dayPeriods = schedule?.['Monday'] ?? [];
    return {
      text: `📅 **Timetable for Class X-A — Monday:**\n\n${dayPeriods.map(p => `• P${p.periodNo} (${p.startTime}–${p.endTime}): ${p.subject} — ${p.teacher} | Room ${p.room}`).join('\n')}`,
      cards: dayPeriods.slice(0, 4).map(p => ({ label: `P${p.periodNo}: ${p.subject}`, value: p.startTime, sub: p.teacher, color: 'navy' })),
    };
  }

  // ── Analytics / forecasts ──
  if (/\b(analytics|forecast|predict|trend|enrollment|enrolment)\b/.test(q)) {
    const trend    = analyticsData.enrollmentTrend as { year: string; students: number }[];
    const brd      = analyticsData.boardResultPrediction as Record<string, { predicted: number; target: number }>;
    const latest   = trend[trend.length - 1];
    const forecasts = analyticsData.forecasts as { enrollment2026: number; enrollmentGrowth: number; projectedRevenue: number };
    return {
      text: `📈 **Analytics & Forecasts — Sundarban Academy:**\n\n• Enrollment (${latest.year}): ${latest.students} students\n• Forecast 2026: ~${forecasts.enrollment2026} students (+${forecasts.enrollmentGrowth}%)\n• Projected Revenue: ₹${(forecasts.projectedRevenue / 10000000).toFixed(2)} Cr\n• Class X Board Prediction: ${brd['Class X']?.predicted}%\n• Class XII Board Prediction: ${brd['Class XII']?.predicted}%\n• Teacher Attendance: ${analyticsData.teacherAttendance.percent}%\n• Parent App Adoption: ${analyticsData.parentAppAdoption.percent}%`,
      cards: [
        { label: 'Enrolled',      value: String(latest.students),              color: 'navy' },
        { label: 'Class X Pred.', value: `${brd['Class X']?.predicted}%`,      color: 'green' },
        { label: 'Class XII',     value: `${brd['Class XII']?.predicted}%`,     color: 'teal' },
      ],
    };
  }

  // ── Health ──
  if (/\b(health|nurse|sick|medical|hospital|medicine|complaint|unwell)\b/.test(q)) {
    const stats = healthData.stats;
    const recent = healthData.nurseLog.slice(0, 4);
    return {
      text: `🏥 **Health & Medical — Recent Log:**\n\n• Nurse visits today: ${stats.nurseVisitsToday}\n• Referred to doctor: ${stats.referredToDoctor}\n• Vaccinations due: ${stats.vaccinationsDueThisMonth}\n\nRecent visits:\n${recent.map(h => `• ${h.studentName} (${h.class}) — ${h.complaint}`).join('\n')}`,
      cards: [
        { label: 'Visits Today', value: String(stats.nurseVisitsToday),        color: 'navy' },
        { label: 'Referred',     value: String(stats.referredToDoctor),         color: 'red' },
        { label: 'Vax Due',      value: String(stats.vaccinationsDueThisMonth), color: 'amber' },
      ],
    };
  }

  // ── Parent mode: child-specific queries ──
  if (mode === 'parent' && parentChildIds) {
    const child = studentsData.find(s => parentChildIds.includes(s.id));
    if (child && /\b(my child|my son|my daughter|arjun|priya|child)\b/.test(q)) {
      const scores = child.academicScore as Record<string, number>;
      const avg = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length);
      return {
        text: `👤 Here's a quick summary for **${child.name}**:\n\n📚 ${child.class} — Roll: ${child.rollNo}\n📅 Attendance: ${child.attendancePercent}%\n📊 Average Score: ${avg}%\n💰 Fee: ${child.feeStatus.toUpperCase()}${child.medicalNotes ? `\n⚕️ Medical: ${child.medicalNotes}` : ''}`,
        cards: [
          { label: 'Attendance', value: fmtPct(child.attendancePercent), color: child.attendancePercent >= 85 ? 'green' : 'amber' },
          { label: 'Avg Score',  value: fmtPct(avg), color: 'navy' },
          { label: 'Fee Status', value: child.feeStatus.toUpperCase(), color: child.feeStatus === 'paid' ? 'green' : 'red' },
        ],
        chips: ["Pending homework", "Health records", "Academic scores"],
      };
    }
  }

  // ── School overview / general ──
  if (/\b(school|sundarban|overview|summary|about)\b/.test(q)) {
    return {
      text: `🏫 **Sundarban Academy, Kolkata**\n\nAI-Powered School ERP — CISCE Affiliated\nClasses: Playhouse to Class XII\n\n• Students Enrolled: ${studentsData.length}\n• Teaching Staff: ${staffData.filter(s => s.designation.toLowerCase().includes('teacher')).length}\n• Total Staff: ${staffData.length}\n• Today's Attendance: ${attendanceData.schoolOverall.percent}%\n• Fee Collection Rate: ${Math.round((feeData.summary.collected / feeData.summary.totalDue) * 100)}%`,
      cards: [
        { label: 'Students',    value: String(studentsData.length),                      color: 'navy' },
        { label: 'Staff',       value: String(staffData.length),                         color: 'teal' },
        { label: 'Attendance',  value: fmtPct(attendanceData.schoolOverall.percent),     color: 'green' },
      ],
    };
  }

  // ── Thank you ──
  if (/\b(thank|thanks|great|perfect|awesome|good|nice)\b/.test(q)) {
    return { text: "You're welcome! Is there anything else I can help you with?", chips: ["Back to overview", "Student search", "Today's attendance"] };
  }

  // ── Fallback ──
  return {
    text: `I'm not sure about that query. Here are some things I can help with:`,
    chips: mode === 'parent'
      ? ["My child's attendance", "Fee status", "Pending homework", "Health records", "Bus tracker"]
      : ["Today's attendance", "Fee collections", "Student search", "Staff info", "Admissions pipeline"],
  };
}

// ─── Suggested prompts ────────────────────────────────────────────────────────

const SCHOOL_PROMPTS = [
  "What is today's attendance?",
  "Show overdue fee accounts",
  "Who are the at-risk students?",
  "How many students are enrolled?",
  "Show admissions pipeline",
  "Library overdue books",
  "Staff on leave today",
  "Class X timetable",
  "Health summary today",
  "Transport routes",
];

const PARENT_PROMPTS = [
  "What is my child's attendance?",
  "Is the fee paid?",
  "What homework is pending?",
  "Show my child's scores",
  "Any health records?",
  "When is the next PTM?",
  "Bus status today",
];

// ─── ChatBot Component ────────────────────────────────────────────────────────

const CARD_COLORS: Record<string, string> = {
  green:  'bg-green-50 border-green-200 text-green-700',
  red:    'bg-red-50 border-red-200 text-red-700',
  amber:  'bg-amber-50 border-amber-200 text-amber-700',
  navy:   'bg-navy/8 border-navy/20 text-navy',
  teal:   'bg-teal/8 border-teal/20 text-teal',
  purple: 'bg-purple/8 border-purple/20 text-purple',
};

function renderText(text: string) {
  return text.split('\n').map((line, i) => {
    const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return (
      <span key={i} className="block" dangerouslySetInnerHTML={{ __html: bold }} />
    );
  });
}

export default function ChatBot({ mode = 'school', parentChildIds }: { mode?: ChatBotMode; parentChildIds?: string[] }) {
  const [open, setOpen]         = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput]       = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping]     = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const prompts = mode === 'parent' ? PARENT_PROMPTS : SCHOOL_PROMPTS;

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [messages, typing]);

  const handleOpen = () => {
    setOpen(true);
    setMinimized(false);
    if (messages.length === 0) {
      const welcome: Message = {
        id: 'welcome',
        role: 'assistant',
        text: mode === 'parent'
          ? "Hello! I'm your SchoolOS parent assistant. Ask me anything about your child — attendance, fees, homework, health records, or the school shop."
          : "Hello! I'm the SchoolOS AI assistant for Sundarban Academy. Ask me anything about students, attendance, fees, staff, admissions, library, or analytics.",
        chips: mode === 'parent'
          ? ["Child's attendance", "Fee status", "Pending homework"]
          : ["Today's attendance", "Fee overview", "At-risk students"],
        ts: Date.now(),
      };
      setMessages([welcome]);
    }
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: `u${Date.now()}`, role: 'user', text, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setShowSuggestions(false);
    setTyping(true);

    // Simulate AI response delay (800–1400ms)
    const delay = 800 + Math.random() * 600;
    setTimeout(() => {
      const result = resolveQuery(text, mode, parentChildIds);
      const botMsg: Message = {
        id: `a${Date.now()}`,
        role: 'assistant',
        text: result.text,
        cards: result.cards,
        chips: result.chips,
        ts: Date.now(),
      };
      setMessages(prev => [...prev, botMsg]);
      setTyping(false);
    }, delay);
  }, [mode, parentChildIds]);

  const clearChat = () => {
    setMessages([]);
    setShowSuggestions(true);
    setTimeout(() => handleOpen(), 50);
  };

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className={`fixed z-50 flex items-center gap-2 shadow-2xl transition-all active:scale-95 ${
          mode === 'parent'
            ? 'bottom-6 right-6 bg-teal text-white px-4 py-3 rounded-2xl hover:bg-teal/90'
            : 'bottom-6 right-6 bg-navy text-white px-4 py-3 rounded-2xl hover:bg-navyMid'
        }`}
        title="Open AI Assistant"
      >
        <div className="relative">
          <Bot className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border border-white animate-pulse" />
        </div>
        <span className="text-sm font-sora font-semibold">AI Assistant</span>
      </button>
    );
  }

  return (
    <div className={`fixed z-50 flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-gray-200 transition-all duration-200 ${
      minimized
        ? 'bottom-6 right-6 w-72 h-14'
        : 'bottom-6 right-6 w-[380px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[calc(100vh-5rem)]'
    }`}>
      {/* ── Header ── */}
      <div className={`flex items-center gap-3 px-4 py-3 flex-shrink-0 ${mode === 'parent' ? 'bg-teal' : 'bg-navy'}`}>
        <div className="relative">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
            <Bot className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-sora font-semibold text-sm leading-tight">SchoolOS AI</p>
          <p className="text-white/60 text-[10px]">{mode === 'parent' ? 'Parent Assistant' : 'School Admin Assistant'}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={clearChat} title="Clear chat" className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <RefreshCw className="w-3.5 h-3.5 text-white/80" />
          </button>
          <button onClick={() => setMinimized(!minimized)} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            {minimized ? <Maximize2 className="w-3.5 h-3.5 text-white/80" /> : <Minimize2 className="w-3.5 h-3.5 text-white/80" />}
          </button>
          <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <X className="w-3.5 h-3.5 text-white/80" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto bg-gray-50 p-3 space-y-3 scrollbar-thin">

            {/* Suggested prompts (initial state) */}
            {showSuggestions && messages.length <= 1 && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1">Suggested questions</p>
                <div className="flex flex-wrap gap-1.5">
                  {prompts.slice(0, 6).map(p => (
                    <button key={p} onClick={() => sendMessage(p)}
                      className="text-[11px] font-semibold px-2.5 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-full hover:border-navy hover:text-navy transition-colors">
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${mode === 'parent' ? 'bg-teal' : 'bg-navy'}`}>
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className={`max-w-[88%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? `${mode === 'parent' ? 'bg-teal' : 'bg-navy'} text-white rounded-tr-sm`
                      : 'bg-white border border-gray-100 text-gray-700 rounded-tl-sm shadow-sm'
                  }`}>
                    {renderText(msg.text)}
                  </div>

                  {/* Cards */}
                  {msg.cards && msg.cards.length > 0 && (
                    <div className="grid grid-cols-2 gap-1.5 w-full">
                      {msg.cards.slice(0, 4).map((card, i) => (
                        <div key={i} className={`rounded-xl border px-3 py-2 text-xs ${CARD_COLORS[card.color ?? 'navy'] ?? CARD_COLORS.navy}`}>
                          <p className="font-bold text-sm leading-tight">{card.value}</p>
                          <p className="font-semibold opacity-80 mt-0.5 leading-tight">{card.label}</p>
                          {card.sub && <p className="opacity-60 text-[10px] mt-0.5 leading-tight">{card.sub}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Chips */}
                  {msg.chips && msg.chips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.chips.map(chip => (
                        <button key={chip} onClick={() => sendMessage(chip)}
                          className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                            mode === 'parent'
                              ? 'bg-teal/5 border-teal/20 text-teal hover:bg-teal/10'
                              : 'bg-navy/5 border-navy/20 text-navy hover:bg-navy/10'
                          }`}>
                          {chip}<ChevronRight className="w-2.5 h-2.5" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${mode === 'parent' ? 'bg-teal/20' : 'bg-navy/20'}`}>
                    <User className="w-3.5 h-3.5 text-gray-600" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {typing && (
              <div className="flex gap-2 items-start">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${mode === 'parent' ? 'bg-teal' : 'bg-navy'}`}>
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map(i => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full animate-bounce ${mode === 'parent' ? 'bg-teal' : 'bg-navy'}`} style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Input ── */}
          <div className="bg-white border-t border-gray-100 p-3 flex-shrink-0">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 px-3 py-2 focus-within:border-navy/40 focus-within:bg-white transition-all">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                placeholder={mode === 'parent' ? "Ask about fees, attendance, homework…" : "Ask about students, staff, fees…"}
                className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || typing}
                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                  input.trim() && !typing
                    ? `${mode === 'parent' ? 'bg-teal hover:bg-teal/80' : 'bg-navy hover:bg-navyMid'} text-white`
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-2">Powered by SchoolOS AI · Data from school records</p>
          </div>
        </>
      )}
    </div>
  );
}
