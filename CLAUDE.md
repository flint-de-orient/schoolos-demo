# SchoolOS ERP — Full Demo Build Brief

## Project Identity

**Product name:** SchoolOS  
**Tagline:** AI-Powered School ERP · Playhouse to Class XII  
**Board:** CISCE (ICSE / ISC)  
**Client:** Flint De Orient Marketing & Technology Pvt. Ltd., Kolkata  
**Demo purpose:** Sales presentation to school principals and management committees.
The demo must feel like a real, shipped SaaS product — not a prototype.

---

## Tech Stack (mandatory — do not deviate)

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router, `src/` directory) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v3 |
| UI components | shadcn/ui |
| Charts | Recharts |
| Icons | lucide-react |
| State | React useState / useContext (no external lib needed) |
| Data | Local JSON files in `src/data/` — no backend, no API calls |
| Fonts | Google Fonts: `Sora` (headings) + `DM Sans` (body) |
| Deployment | Vercel (build must pass `next build` cleanly) |

---

## Brand & Design System

### Color Palette (use as Tailwind custom colors in `tailwind.config.ts`)

```
navy:      #1E2761   (primary brand, sidebar, headers)
navyMid:   #2E3E8C   (hover states, cards)
gold:      #F5C542   (primary accent, CTAs, highlights)
goldLight: #FEF3C7   (gold tints, badge backgrounds)
ice:       #CADCFC   (secondary text on dark backgrounds)
iceLight:  #E8EFFE   (light card backgrounds)
teal:      #028090   (attendance, live tracking)
coral:     #D85A30   (alerts, overdue, admin module)
purple:    #534AB7   (academics module)
green:     #3B6D11   (finance, fee paid)
pink:      #993556   (parent connect module)
amber:     #BA7517   (warnings, pending)
```

### Typography rules

- All headings: `font-sora font-semibold`
- All body: `font-dm-sans`
- Page titles: `text-2xl` or `text-3xl`
- Section headers: `text-lg font-semibold`
- Table headers: `text-xs uppercase tracking-wide text-gray-500`
- Never use Inter, Roboto, or system fonts

### Component conventions

- Sidebar width: `w-64` fixed, dark navy background
- Main content: `ml-64 p-6 bg-gray-50 min-h-screen`
- Cards: `bg-white rounded-xl shadow-sm border border-gray-100 p-5`
- Stat cards: metric in `text-3xl font-sora`, label in `text-sm text-gray-500`
- Buttons primary: gold background, navy text, `rounded-lg px-4 py-2`
- Buttons secondary: navy background, white text
- Badges: small pill with colored background, always rounded-full
- Tables: striped rows, sticky header, sortable columns where noted
- All AI-generated content: show a small `🤖 AI` badge in teal next to it

---

## Application Structure

```
src/
  app/
    layout.tsx                  # Root layout with sidebar + topbar
    page.tsx                    # Redirect to /dashboard
    dashboard/page.tsx
    admissions/page.tsx
    attendance/page.tsx
    timetable/page.tsx
    academics/
      page.tsx                  # Curriculum & assessment overview
      [studentId]/page.tsx      # Student 360° profile
    examinations/page.tsx
    fee/page.tsx
    library/page.tsx
    transport/page.tsx
    health/page.tsx
    hr/page.tsx
    parent-app/page.tsx         # Parent App preview (mockup-style)
    school-shop/page.tsx
    ai-advisor/page.tsx
    analytics/page.tsx
    settings/page.tsx
  components/
    layout/
      Sidebar.tsx
      Topbar.tsx
      PageWrapper.tsx
    ui/                         # shadcn components live here
    shared/
      StatCard.tsx
      DataTable.tsx
      AIBadge.tsx
      ModuleHeader.tsx
      EmptyState.tsx
      StatusBadge.tsx
  data/                         # ALL mock data as JSON
    students.json
    staff.json
    classes.json
    attendance.json
    fee.json
    admissions.json
    timetable.json
    library.json
    transport.json
    health.json
    homework.json
    shop-inventory.json
    analytics.json
    notifications.json
  lib/
    utils.ts
    constants.ts
```

---

## Mock Data Specifications

Generate realistic Indian school data. All names must be Bengali/Indian. Use CISCE class names (Nursery, LKG, UKG, Class I through XII). School name: **Sundarban Academy, Kolkata**.

### `students.json` — 40 students across 8 classes

Each student object:
```json
{
  "id": "STU001",
  "name": "Arjun Chatterjee",
  "class": "Class X",
  "section": "A",
  "rollNo": "X-A-01",
  "photo": null,
  "dob": "2009-04-15",
  "gender": "Male",
  "bloodGroup": "B+",
  "address": "12, Rabindra Sarani, Behala, Kolkata 700034",
  "parent": {
    "father": "Subrata Chatterjee",
    "mother": "Mala Chatterjee",
    "phone": "9831012345",
    "email": "subrata.c@gmail.com",
    "occupation": "Bank Manager"
  },
  "admissionDate": "2015-06-10",
  "house": "Tagore",
  "attendancePercent": 87,
  "feeStatus": "paid",
  "medicalNotes": "Mild asthma — keep inhaler",
  "academicScore": {
    "english": 82,
    "mathematics": 91,
    "science": 88,
    "history": 75,
    "geography": 79,
    "bengali": 85
  },
  "predictedBoardScore": 84,
  "learningStyle": "Visual",
  "achievements": ["Science Olympiad Runner-up 2024", "House Captain"],
  "libraryBooksIssued": 2
}
```

Include a mix of: fee paid / pending / overdue, varying attendance %, different houses (Tagore, Bose, Roy, Teresa), 3 students flagged as "at-risk" by AI.

### `staff.json` — 20 staff members

Fields: id, name, photo (null), designation, subject (for teachers), department, joiningDate, qualification, phone, email, salary, leaveBalance, status (active/on-leave).

Include: 1 Principal, 1 Vice Principal, 12 subject teachers, 2 admin staff, 2 support staff, 1 librarian, 1 nurse.

### `attendance.json`

Structure:
```json
{
  "todayDate": "2025-04-10",
  "classWise": [
    { "class": "Class X-A", "total": 38, "present": 34, "absent": 4, "percent": 89 }
  ],
  "schoolOverall": { "total": 520, "present": 468, "absent": 52, "percent": 90 },
  "absentees": [
    { "studentId": "STU005", "name": "Priya Sen", "class": "Class X-A", "reason": "Sick", "parentNotified": true }
  ],
  "monthlyTrend": [
    { "month": "Jan", "percent": 91 },
    { "month": "Feb", "percent": 88 }
  ]
}
```

### `fee.json`

```json
{
  "summary": {
    "totalDue": 2450000,
    "collected": 2180000,
    "pending": 270000,
    "overdueCount": 8
  },
  "records": [
    {
      "id": "FEE001",
      "studentId": "STU001",
      "studentName": "Arjun Chatterjee",
      "class": "Class X-A",
      "term": "Term 2 2024-25",
      "amount": 18500,
      "dueDate": "2025-02-15",
      "status": "paid",
      "paidDate": "2025-02-10",
      "paymentMode": "UPI",
      "receiptNo": "RCP2025-0341"
    }
  ],
  "feeStructure": {
    "Nursery": 9500,
    "LKG": 10000,
    "UKG": 10500,
    "Class I-IV": 13500,
    "Class V-VIII": 16000,
    "Class IX-X": 18500,
    "Class XI-XII": 22000
  }
}
```

### `admissions.json`

Pipeline stages: `["Inquiry", "Application Received", "Documents Verified", "Interview Scheduled", "Offer Made", "Enrolled", "Rejected"]`

20 applicants across stages. Fields: id, name, applyingForClass, parentName, phone, stage, inquiryDate, source (Walk-in / School website / Referral / Campaign).

### `timetable.json`

For Class X-A, Monday through Saturday. 8 periods per day. Each period: periodNo, subject, teacher, startTime, endTime, room.

### `library.json`

30 books with: id, title, author, genre, isbn, copies, available, issuedTo (array of studentIds with dueDate).

### `transport.json`

5 bus routes. Each route: id, routeName, driver, driverPhone, vehicle, capacity, studentsCount, stops (array with stopName, time, studentCount), currentLocation (dummy: lat/lng near Kolkata).

### `health.json`

Nurse log — 15 entries: date, studentId, studentName, complaint, action, referredToDoctor (bool), parentNotified (bool).

### `homework.json`

30 homework entries: id, class, subject, teacher, assignedDate, dueDate, description, submissionsReceived, totalStudents, status (active/closed).

### `shop-inventory.json`

Categories: Uniform, Books & Stationery, School Bag & Gear, Health & Hygiene, Achievement Items, Project & Activity.

Each item: id, category, name, price, stock, image (null), sizes (for uniform). 25 items total.

### `analytics.json`

```json
{
  "enrollmentTrend": [2019: 420, 2020: 438, ...2025: 520],
  "feeCollectionByMonth": [...12 months...],
  "subjectPerformance": { "Class X": { "english": 78, "math": 82, ... } },
  "atRiskStudents": [3 studentIds with reason],
  "boardResultPrediction": { "Class X": 84, "Class XII": 79 },
  "teacherAttendance": { "percent": 96 },
  "parentAppAdoption": { "percent": 73 }
}
```

---

## Pages — Detailed Specifications

### `/dashboard` — Command Centre

Layout: 4 stat cards top row + 2-column grid below.

**Stat cards (top row):**
- Total Students: 520 (↑ 12 from last month)
- Today's Attendance: 90% (468/520)
- Fee Collected This Month: ₹8.4L
- Active Staff: 20/20

**Left column (60% width):**
- Attendance bar chart by class (Recharts BarChart, gold bars)
- Recent admissions pipeline mini Kanban (last 5 applicants, stage badges)

**Right column (40% width):**
- 🤖 AI Alerts panel: 3 cards — "Riya Bose has dropped below 75% attendance", "8 fee accounts overdue — ₹2.7L at risk", "Class XII predicted board score: 79 — below target"
- Today's Timetable for Class X-A (quick view, 8 rows)
- Upcoming Events list (3 items)

**Topbar:** School name "Sundarban Academy" + current date + notification bell (badge: 5) + user avatar "Principal Sharma"

### `/admissions` — Admissions Pipeline

**Tab 1: Pipeline View**
Kanban-style columns for each stage. Each card shows: applicant name, class applying for, source badge, days-in-stage.

**Tab 2: All Applicants Table**
Columns: Name, Class, Parent, Phone, Source, Stage (badge), Inquiry Date, Action (View / Move Stage).
Sortable by date and stage. Search by name.

**Tab 3: Analytics**
- Pie chart: Applications by source
- Bar chart: Applications by class
- Funnel: Inquiry → Enrolled conversion

### `/attendance` — Attendance Intelligence

**Top:** School-wide stat bar — Present: 468, Absent: 52, Overall: 90%

**Main table:** Class-wise breakdown. Columns: Class, Teacher, Total, Present, Absent, %, Action (Mark / View).
Color-code %: green ≥90%, amber 75-89%, red <75%.

**Absentees panel (right sidebar):** Today's absent students list. Each row: name, class, reason, "Parent Notified" toggle (pre-toggled on for most).

**Monthly trend:** Line chart, last 6 months attendance %.

**🤖 AI Alert box:** "Priya Sen has been absent 8 days this month — at-risk. Recommend counsellor follow-up."

### `/timetable` — Smart Timetable

**Weekly grid:** Rows = periods (1–8 with times), Columns = Mon–Sat.
Each cell: subject name, teacher name (smaller), room number.
Color-coded by subject (consistent across week).

**Controls:** Class selector dropdown (show timetable for any class). Teacher view toggle (flip to teacher's personal schedule).

**Substitution panel (bottom):** "Mr. Das is on leave today — Period 3 Mathematics auto-assigned to Mrs. Roy." Show as a notification card.

### `/academics` — Curriculum & Assessment

**Tab 1: Syllabus Tracker**
Table: Subject | Total Topics | Covered | Remaining | Completion % (progress bar) | Teacher.
Data for Class X. Filter by class dropdown.

**Tab 2: Assessment Results**
Student performance table. Columns: Name, English, Maths, Science, History, Bengali, Average, Trend (↑↓ arrow), Predicted Board (🤖 badge).
Row click → opens Student 360° modal.

**Tab 3: Report Cards**
List of students. Each row has "Generate Report Card" button. One student shows "Generated" badge with download icon.

### `/academics/[studentId]` — Student 360° Profile

Full page profile. Two-column layout.

**Left column:**
- Large profile card: initials avatar (navy circle), name, class, roll no, house badge, blood group
- Contact info: parent names, phone, email
- Medical notes (amber alert box if exists)
- Achievements list with trophy icons

**Right column (tabs):**
- **Academic:** Subject score bars (horizontal progress bars, color coded). Predicted board score in large gold number with 🤖 badge. "AI Learning Summary" paragraph: "Arjun shows strength in quantitative subjects but needs support in essay-based answers. Recommend additional practice in History paper writing."
- **Attendance:** Circular progress ring (87%). Month-wise mini chart.
- **Fee:** Fee status card. Payment history table (last 3 transactions).
- **Health:** Nurse visit log. Vaccination status checklist.
- **Library:** Issued books (with due dates). Reading history.
- **Homework:** Submission rate (88%). Recent submissions list.

### `/examinations` — Exam Control Room

**Section 1: Upcoming Exams**
Cards grid: Exam name, date range, classes, status (Scheduled/Ongoing/Results Declared). "Pre-Board Examination" card highlighted in gold border.

**Section 2: Hall Ticket Generator**
Class dropdown + Generate button. Shows preview of a hall ticket (table format: Name, Roll No, Class, Exam Centre, Subjects with dates).

**Section 3: Seating Plan**
Visual room grid (6×6 seats), student names in cells, alternating classes. "Auto-Generate" button.

**Section 4: Results Entry**
Table with student names, subject columns, mark entry cells (pre-filled with data). Totals auto-calculated.

### `/fee` — Fee Management

**Top row stats:** Total Due / Collected / Pending / Overdue count (4 stat cards).

**Fee Records Table:**
Columns: Student, Class, Term, Amount, Due Date, Status (badge), Paid Date, Mode, Receipt.
Status badges: `paid` = green, `pending` = amber, `overdue` = red.
Filter: by status, class, term.
Search by student name.

**Actions:** "Send Reminder" button on overdue rows (shows toast "WhatsApp reminder sent to parent"). "Download Receipt" on paid rows.

**Fee Structure panel (right sidebar):** Class-wise annual fee table. Clean card.

**🤖 AI Prediction box:** "Based on payment history, 5 accounts are likely to default next term. Recommend proactive outreach." List 5 students with risk score bars.

### `/library` — Library Management

**Stats:** Total Books, Issued Today, Overdue Returns, New Arrivals.

**Books table:** Title, Author, Genre, Copies, Available, Status.
Search by title or author. Filter by genre.

**Issued Books panel:** Who has what. Columns: Student, Class, Book, Issue Date, Due Date, Status (overdue highlight in red).

**🤖 AI Recommendation box:** "Based on Class X reading patterns, consider adding more ICSE exam guides and Bengali literature titles."

### `/transport` — Transport & GPS

**Route cards:** 5 cards. Each card: Route name, bus number, driver, students count, progress bar for capacity.

**Live Tracking section:** Large placeholder map (use a styled div with Kolkata area label and route stops listed). 
Show: Bus 1 — "Currently at Behala Chowrasta — ETA School: 8 mins" in a live badge.

**Today's status table:** Route | Driver | Students | Departed | Arrived | Status.

**SOS Alert panel:** "No active alerts" green status. Show one historical: "Bus 3 — SOS triggered — 14 Feb 2025 — Resolved."

### `/health` — Health & Medical Records

**Stats:** Nurse Visits Today / Referred to Doctor / Vaccinations Due This Month.

**Nurse Log Table:** Date, Student, Class, Complaint, Action Taken, Referred, Parent Notified.

**Vaccination Tracker:** Student list with vaccination columns (BCG, Hepatitis B, MMR, etc.) — checkmarks for completed.

**Epidemic Alert box (green — all clear):** "No cluster illness patterns detected this week."

### `/hr` — Staff & HR

**Staff Directory:** Cards grid view (default) and table view toggle.
Each card: initials avatar, name, designation, subject/dept, phone, status badge (Active / On Leave).

**Leave Management section:** Table of leave requests. Columns: Staff, Type, From, To, Days, Status (Approved/Pending/Rejected). "Approve/Reject" action buttons.

**Payroll Summary:** Month selector. Table: Name, Basic, Allowances, Deductions (PF/TDS), Net Pay, Status (Paid/Pending). "Generate Payslip" button per row.

### `/parent-app` — Parent App Preview

**IMPORTANT:** This page should be designed as a **phone mockup showcase** — not a functional module. Show a large phone frame (CSS-drawn or SVG) in the center with a simulated app screen inside. Below, show 9 feature zone cards (matching the presentation deck).

**Phone screen shows:** A mini dashboard with child's name, today's attendance tick, 2 homework due items, fee status, and a "Bus arriving in 12 mins" banner.

**Zone cards below phone (3×3 grid):**
Each card: zone number badge (colored), zone name, 3-line description, "Activate" button.

Zones: My Child Dashboard, Homework & Assignments, Live Safety Tracker, Fee & Smart Payments, School Shop, Communication Hub, Academic Progress, Health & Wellness, Calendar & Events.

### `/school-shop` — School Shop

**Category tabs:** Uniform | Books & Stationery | School Bag & Gear | Health & Hygiene | Achievement | Project & Activity.

**Product grid (default: Uniform tab):**
Each product card: emoji icon (no real image needed), name, price (₹), stock badge, "Add to Cart" button (gold).

**Cart panel (right side, fixed width):**
Show 2 items pre-added. Subtotal, "Checkout & Pay" button. "All charges to parent wallet" note.

**Order History table (below):** Date, Student, Items, Total, Status (Delivered/Processing/Pending).

### `/ai-advisor` — AI Academic Advisor

**Page header:** "🤖 AI-powered insights — updated daily based on assessment data"

**At-Risk Students panel (top, red border):**
3 student cards. Each: name, class, risk reason, risk score bar, recommended action.

**Class Performance Heatmap:**
Grid: Rows = Classes (VIII to XII), Columns = Subjects. Cell color = performance (green to red gradient). Click cell = shows average score.

**Predicted Board Results:**
Two large score cards: "Class X — Predicted Average: 84%" and "Class XII — Predicted Average: 79%". Each with breakdown by subject.

**Individual Student AI Report:**
Search bar. Type student name → shows: Learning Style badge, Subject strength/gap analysis (horizontal bar chart), Peer group suggestion, Recommended revision plan (3 bullet points), Predicted score with confidence indicator.

### `/analytics` — Predictive Analytics Dashboard

**4 charts arranged in 2×2 grid:**

1. Enrollment Trend (2019–2025) — Line chart, gold line
2. Monthly Fee Collection — Bar chart, green bars
3. Subject Performance by Class — Grouped bar chart
4. Parent App Adoption — Donut chart (73% activated)

**Bottom section — Forecast cards:**
- "Enrollment forecast FY 2025-26: 545 students (↑ 4.8%)" 
- "Projected fee revenue: ₹1.24 Cr"
- "Teacher attrition risk: 2 staff members flagged"

All forecast cards have 🤖 badge and teal background.

### `/settings` — Settings (Static)

**Sections:** School Profile | Academic Year | Module Activation | User Roles | Notifications | Billing & Plan.

**Module Activation section (the key one):** Show all 24 modules as toggle switches, grouped by pillar. Some toggled on, some off. This reinforces the "choose your modules" sales message.

**Billing panel:** Show "Growth Plan — ₹3.2L/year — Renews April 2026" with module count.

---

## Global Components

### `Sidebar.tsx`

Fixed left sidebar. Navigation grouped by pillar with section labels:

```
[SchoolOS logo + gold spark icon]

OVERVIEW
  Dashboard

SCHOOL OPERATIONS  
  Admissions
  Attendance
  Timetable
  Examinations
  Transport
  Health

LEARNING
  Academics
  Library

PEOPLE
  HR & Staff

FINANCE
  Fee Management

AI & INSIGHTS
  AI Advisor         [AI badge]
  Analytics          [AI badge]

PARENT CONNECT
  Parent App
  School Shop

SYSTEM
  Settings
```

Active item: gold left border + light gold background. Hover: navy-mid background.

### `Topbar.tsx`

- Left: Current page title (dynamic)
- Center: School name "Sundarban Academy, Kolkata" in small italic text
- Right: Search icon | Notification bell (badge) | User avatar with "Principal Sharma" dropdown

### `StatCard.tsx`

Props: `title`, `value`, `subtitle` (optional trend text), `icon` (lucide), `color` (maps to tailwind color class), `trend` (up/down/neutral).

Renders a white card with colored icon circle, large metric, and small trend indicator.

---

## Interactions & Polish

- **Search:** All major tables must have a working search (filter from JSON data client-side).
- **Tabs:** Use shadcn `Tabs` component throughout.
- **Toasts:** Use shadcn `Toast` / `Sonner` for actions like "Reminder sent", "Report card generated", "Payment recorded".
- **Loading skeleton:** Add `Skeleton` components that show for 500ms on page load (simulate data fetching).
- **Hover states:** All table rows, cards, and nav items must have hover effects.
- **Responsive:** Desktop-first but must not break at 1280px width minimum.
- **Active nav highlighting:** Current route highlighted in sidebar.
- **Page transitions:** Subtle fade-in on page load (`animate-fadeIn`).
- **Empty states:** Use `EmptyState.tsx` component when filtered data returns nothing.

---

## Dummy Interactions to Build

These make the demo feel alive. Wire up these specific interactions:

1. **Attendance page:** Clicking "Mark Absent" on a student → opens a modal → marks them with a reason → updates the count in the stat card.

2. **Fee page:** Clicking "Send Reminder" on overdue row → shows toast "✓ WhatsApp reminder sent to Priya Sen's parent".

3. **Admissions Kanban:** Clicking "Move Stage" on an applicant → dropdown of stages → stage badge updates.

4. **AI Advisor:** Typing a student name in the search → their AI report appears below (pull from students.json).

5. **School Shop:** "Add to Cart" → cart panel updates with item and price total.

6. **Timetable:** Class dropdown change → grid updates to show that class's timetable.

7. **Student 360° profile:** Tab switching between Academic / Attendance / Fee / Health → content changes smoothly.

8. **Settings — Module toggles:** Clicking a toggle → it flips state and shows "Module activated/deactivated" toast.

9. **Report Card button:** Click → shows a toast "Generating report card for Arjun Chatterjee..." → after 1.5s → "Ready — click to download".

10. **Hall Ticket Generator:** Click Generate → hall ticket preview appears below with the class's students.

---

## Build Order (follow this sequence exactly)

1. Install dependencies and configure Tailwind with custom colors and fonts
2. Create all JSON data files in `src/data/`
3. Build `Sidebar.tsx`, `Topbar.tsx`, `PageWrapper.tsx`, and `StatCard.tsx`
4. Build root `layout.tsx` with sidebar + topbar shell
5. Build `/dashboard` page (most important — start here)
6. Build `/fee` page
7. Build `/admissions` page
8. Build `/attendance` page
9. Build `/academics` list page + `[studentId]` detail page
10. Build `/timetable` page
11. Build `/examinations` page
12. Build `/transport` page
13. Build `/hr` page
14. Build `/library` page
15. Build `/health` page
16. Build `/parent-app` phone mockup page
17. Build `/school-shop` page
18. Build `/ai-advisor` page
19. Build `/analytics` page
20. Build `/settings` page
21. Final pass: add loading skeletons, toasts, and all 10 dummy interactions
22. Run `next build` and fix all TypeScript / lint errors

---

## Quality Checklist (verify before declaring done)

- [ ] `next build` completes with zero errors
- [ ] All 20 pages/routes render without crashing
- [ ] All 10 dummy interactions work
- [ ] Search works on: Students table, Fee table, Admissions table, Library table
- [ ] All charts render with data (no empty chart areas)
- [ ] Sidebar active state highlights correct page
- [ ] No hardcoded placeholder text ("Lorem ipsum", "TODO", "coming soon")
- [ ] Student 360° profile reachable by clicking any student row in Academics
- [ ] Mobile-view (1280px) does not break layout
- [ ] All 🤖 AI badges show on: Dashboard alerts, Fee prediction, Advisor page, Analytics forecasts, Student predicted score
- [ ] School name "Sundarban Academy, Kolkata" appears in topbar
- [ ] Gold/navy brand colors consistent across all pages
- [ ] Sora font used for all headings, DM Sans for body

---

## Deployment

After `next build` passes:
1. Push to a GitHub repository named `schoolos-demo`
2. Connect to Vercel (free tier)
3. Deploy — the live URL will be shared with school prospects during sales demos

---

## Notes for Claude Code

- Generate all JSON data files completely — do not leave any as stubs or with placeholder comments.
- All 40 students must have complete, realistic Bengali/Indian names and data.
- When building charts, always pass actual data from the JSON imports — never hardcode chart data inline.
- If a shadcn component is needed, run `npx shadcn@latest add [component]` before using it.
- Do not create any `pages/` directory — this project uses the App Router exclusively.
- Use `'use client'` directive on any component that uses useState, useEffect, or event handlers.
- Keep each page file under 300 lines — extract sub-components into separate files in `components/`.
- After building each page, verify it renders correctly before moving to the next.
