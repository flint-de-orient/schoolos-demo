export const metadata = {
  title: 'Privacy Policy — SchoolOS',
  description: 'Privacy Policy for SchoolOS AI-Powered School ERP Platform',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ background: 'linear-gradient(160deg, #1E2761 0%, #2E3E8C 100%)' }} className="py-12 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
          <p className="text-blue-200 mt-2 text-sm">SchoolOS · AI-Powered School ERP Platform</p>
          <p className="text-blue-300 mt-1 text-xs">Last updated: 1 May 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8 text-gray-700 text-sm leading-relaxed">

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">1. About SchoolOS</h2>
          <p>
            SchoolOS is an AI-powered School ERP platform developed and operated by{' '}
            <strong>Flint De Orient Marketing &amp; Technology Pvt. Ltd.</strong>, registered in Kolkata,
            West Bengal, India. SchoolOS provides school management software to educational institutions,
            including student information systems, attendance, fee management, academics, and parent
            communication tools.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
          <p className="mb-2">We collect the following categories of information:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>School / Institution Data:</strong> School name, address, academic year configuration, and administrator contact details provided during onboarding.</li>
            <li><strong>Student Data:</strong> Student names, class, section, date of birth, guardian information, attendance records, academic scores, fee records, and health notes — entered by school staff.</li>
            <li><strong>Staff Data:</strong> Staff names, designations, subjects, contact details, leave records, and payroll information.</li>
            <li><strong>Usage Data:</strong> Log data, browser type, IP address, and pages accessed within SchoolOS for security and analytics purposes.</li>
            <li><strong>WhatsApp Business Account Data:</strong> When schools connect their WhatsApp Business Account via Meta Embedded Signup, we collect the WhatsApp Business Account ID and phone number ID to enable parent notifications. We do not store message content beyond delivery logs.</li>
            <li><strong>Authentication Data:</strong> Email addresses and encrypted passwords for school administrator accounts.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To provide and operate the SchoolOS platform for contracted schools.</li>
            <li>To send automated notifications to parents via WhatsApp and SMS on behalf of schools (attendance alerts, fee reminders, exam schedules, etc.).</li>
            <li>To generate AI-powered insights, attendance predictions, and academic reports.</li>
            <li>To respond to support requests and maintain service reliability.</li>
            <li>To comply with applicable laws and regulations in India.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">4. WhatsApp Integration</h2>
          <p className="mb-2">
            SchoolOS integrates with the <strong>WhatsApp Business Platform (Cloud API)</strong> provided by
            Meta Platforms, Inc. to send transactional messages to parents on behalf of schools.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Schools connect their own WhatsApp Business Account to SchoolOS via Meta&apos;s Embedded Signup flow.</li>
            <li>SchoolOS acts as a Technology Service Provider (Tech Provider) on the WhatsApp Business Platform.</li>
            <li>Messages sent via WhatsApp are transactional in nature: attendance notifications, fee reminders, exam timetables, and similar school communications.</li>
            <li>Parent phone numbers used for WhatsApp notifications are provided by the school and used solely for school communication purposes.</li>
            <li>SchoolOS does not use parent data for marketing or third-party advertising.</li>
            <li>WhatsApp message logs are retained for 90 days for delivery confirmation purposes.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Data Sharing</h2>
          <p className="mb-2">We do not sell personal data. We share data only in the following circumstances:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Meta Platforms, Inc.:</strong> For WhatsApp message delivery via the Cloud API.</li>
            <li><strong>SMS Gateway Providers:</strong> For SMS notifications (e.g., SMSGateHub) using DLT-registered templates under TRAI regulations.</li>
            <li><strong>Cloud Infrastructure:</strong> Data is hosted on secure cloud servers (Vercel / PostgreSQL). Servers may be located outside India; appropriate safeguards are applied.</li>
            <li><strong>Legal Requirements:</strong> If required by Indian law, court order, or government authority.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Data Retention</h2>
          <p>
            Student and staff data is retained for the duration of the school&apos;s active subscription and
            for 1 year thereafter to allow data export. Schools may request deletion of all their data
            by contacting us. WhatsApp and SMS logs are retained for 90 days.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Security</h2>
          <p>
            We implement industry-standard security measures including HTTPS encryption, hashed passwords,
            row-level data isolation per school (multi-tenant architecture), and access controls. API
            credentials and secrets are stored encrypted and are never exposed to the client browser.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Children's Privacy</h2>
          <p>
            SchoolOS processes data about students including minors as part of school administration
            services contracted by educational institutions. This data is processed solely on behalf of
            and under the instructions of the contracting school. Parents may contact their school
            administration to request access to or deletion of their child&apos;s data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Your Rights</h2>
          <p className="mb-2">
            Schools and their administrators have the right to:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Access all data stored for their institution.</li>
            <li>Export data in CSV/PDF format via the SchoolOS platform.</li>
            <li>Request correction or deletion of incorrect data.</li>
            <li>Disconnect WhatsApp Business Account integration at any time via Settings.</li>
            <li>Request account closure and data deletion by contacting us.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Contact Us</h2>
          <p>
            For privacy-related queries, data deletion requests, or concerns regarding this policy,
            contact:
          </p>
          <div className="mt-3 p-4 bg-white rounded-lg border border-gray-200">
            <p className="font-semibold text-gray-900">Flint De Orient Marketing &amp; Technology Pvt. Ltd.</p>
            <p>Kolkata, West Bengal, India</p>
            <p className="mt-1">
              Email:{' '}
              <a href="mailto:common.fdo@gmail.com" className="text-blue-600 hover:underline">
                common.fdo@gmail.com
              </a>
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. The &quot;Last updated&quot; date at the top
            reflects the most recent revision. Continued use of SchoolOS after changes constitutes
            acceptance of the updated policy.
          </p>
        </section>

      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 mt-8 py-6 text-center text-xs text-gray-400">
        © 2026 Flint De Orient Marketing &amp; Technology Pvt. Ltd. · SchoolOS
      </div>
    </div>
  );
}
