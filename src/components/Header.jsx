import React from 'react';
import { Sparkles, Video, Cpu, ShieldCheck } from 'lucide-react';

export default function Header() {
  return (
    <header className="app-header">
      <div className="brand-group">
        <img
          src="/tarteel-logo.svg"
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

      <div className="header-badges">
        <div className="status-badge highlight">
          <Cpu size={14} />
          <span>معالجة محلية بالكامل عبر المتصفح (Client-Side)</span>
        </div>
        <div className="status-badge">
          <div className="dot" />
          <span>api.quran.com متصل</span>
        </div>
        <div className="status-badge">
          <ShieldCheck size={14} />
          <span>مجاني 100% بدون خادم</span>
        </div>
      </div>
    </header>
  );
}
