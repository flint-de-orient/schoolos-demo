export default function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <main className="ml-64 pt-16 min-h-screen bg-gray-50">
      <div className="p-6 animate-fadeIn">
        {children}
      </div>
    </main>
  );
}
