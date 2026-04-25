import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import ChatBot from "@/components/shared/ChatBot";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "SchoolOS — AI-Powered School ERP | Sundarban Academy",
  description: "AI-Powered School ERP for Sundarban Academy, Kolkata. CISCE Board — Playhouse to Class XII.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-dm-sans antialiased bg-gray-50">
        <Sidebar />
        <Topbar />
        {children}
        <ChatBot mode="school" />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
