import { Header } from "@/components/layout/Header";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-layout-wrapper">
      <div className="cyber-bg-overlay"></div>
      <div className="glow-bg-orb orb-1"></div>
      <div className="glow-bg-orb orb-2"></div>
      
      <Header />
      
      <main className="main-wrapper">
        {children}
      </main>
    </div>
  );
}
