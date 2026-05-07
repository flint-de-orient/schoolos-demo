export default function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 animate-fadeIn">
      {children}
    </div>
  );
}
