import type { Metadata } from 'next';
import MHSSidebar from './_components/MHSSidebar';
import MHSTopbar from './_components/MHSTopbar';

export const metadata: Metadata = {
  title: 'Muraliganj High School — AI Timetable Engine | SchoolOS',
  description: 'AI-Powered Timetable Engine for Muraliganj High School (H.S), Murshidabad, West Bengal.',
};

export default function MuraliganjLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MHSSidebar />
      <MHSTopbar />
      <main className="ml-64 pt-16 min-h-screen bg-gray-50">
        {children}
      </main>
    </>
  );
}
