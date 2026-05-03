import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import ChatBot from "@/components/shared/ChatBot";

export default function SundarbanLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <Topbar />
      {children}
      <ChatBot mode="school" />
    </>
  );
}
