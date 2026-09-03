import React from 'react';
import { Sparkles, Video, Cpu, ShieldCheck, LogOut, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

export default function Header({ user, userData }) {
  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div className="brand-group">
        <img
          src="/tarteel-logo.png"
          alt="شعار ترتيل"
          className="brand-logo-img"
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            boxShadow: '0 0 16px rgba(20, 184, 166, 0.45), 0 0 10px rgba(229, 184, 105, 0.35)',
            flexShrink: 0,
            objectFit: 'contain',
          }}
        />
        <div>
          <h1 className="brand-title">
            ترتيل
            <span style={{ fontSize: '0.88rem', opacity: 0.85, fontWeight: 600, fontFamily: 'var(--font-latin)', letterSpacing: '0.5px' }}>
              Tarteel
            </span>
          </h1>
          <p className="brand-subtitle">صانع فيديوهات القرآن الكريم الاحترافية</p>
        </div>
      </div>

      <div className="header-badges" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        {userData?.role === 'admin' && (
          <Link to="/admin" style={{
            display: 'flex', alignItems: 'center', gap: '6px', background: '#3b82f633', color: '#60a5fa', padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', fontSize: '0.85rem'
          }}>
            <Settings size={14} /> الإدارة
          </Link>
        )}
        {user && (
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem'
          }}>
            <LogOut size={14} /> خروج
          </button>
        )}
        <div className="status-badge highlight">
          <Cpu size={14} />
          <span>معالجة محلية بالكامل عبر المتصفح (Client-Side)</span>
        </div>
        <div className="status-badge">
          <div className="dot" />
          <span>api.quran.com متصل</span>
        </div>
      </div>
    </header>
  );
}
