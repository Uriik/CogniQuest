import { Header } from "@/components/layout/Header";
import { GameSocketProvider } from "@/hooks/GameSocketProvider";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GameSocketProvider>
      <div className="app-layout-wrapper">
        <div className="cyber-bg-overlay"></div>
        <div className="glow-bg-orb orb-1"></div>
        <div className="glow-bg-orb orb-2"></div>

        <Header />

        <main className="main-wrapper">
          {children}
        </main>
      </div>
    </GameSocketProvider>
  );
}
