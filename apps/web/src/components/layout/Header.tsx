"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

interface HeaderProps {
  userName?: string;
}

export function Header({ userName = "Jogador" }: HeaderProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const actualName = session?.user?.name || userName;
  const initial = actualName.charAt(0).toUpperCase();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="app-header">
      <div className="header-container">
        <Link href="/dashboard" className="logo-area">
          <Image src="/logo_icon.svg" alt="CogniQuest Icon" width={32} height={32} className="header-logo-icon" />
          <span className="logo-text">CogniQuest</span>
        </Link>
        
        <nav className="nav-links">
          <Link href="/dashboard">
            <button className={`nav-link-btn ${pathname === '/dashboard' ? 'active' : ''}`}>
              Dashboard
            </button>
          </Link>
          <Link href="/lobby">
            <button className={`nav-link-btn ${pathname?.startsWith('/lobby') ? 'active' : ''}`}>
              Salas PvP
            </button>
          </Link>
          <button className="nav-link-btn" disabled>
            Ranking
          </button>
        </nav>
        
        <div className="user-profile" ref={dropdownRef} onClick={() => setDropdownOpen(!dropdownOpen)} style={{ cursor: 'pointer', position: 'relative' }}>
          <div className="profile-info">
            <span className="profile-name">{actualName}</span>
            <span className="profile-level">Online</span>
          </div>
          <div className="profile-avatar">
            <span className="avatar-letter">{initial}</span>
          </div>

          {dropdownOpen && (
            <div className="profile-dropdown" style={{
              position: 'absolute', top: '100%', right: 0, marginTop: '10px',
              background: 'var(--bg-card)', border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: 'var(--radius-sm)', padding: '0.5rem', minWidth: '150px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 100
            }}>
              <Link href="/settings" style={{ textDecoration: 'none' }}>
                <button 
                  style={{
                    width: '100%', textAlign: 'left', padding: '0.5rem 1rem',
                    background: 'transparent', color: 'var(--text-main)', border: 'none',
                    cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
                    borderRadius: 'var(--radius-sm)'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  onClick={() => setDropdownOpen(false)}
                >
                  Configurações
                </button>
              </Link>
              <button 
                onClick={() => signOut({ callbackUrl: '/login' })}
                style={{
                  width: '100%', textAlign: 'left', padding: '0.5rem 1rem',
                  background: 'transparent', color: 'var(--error)', border: 'none',
                  cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
                  borderRadius: 'var(--radius-sm)'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
