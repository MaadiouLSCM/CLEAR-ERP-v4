import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { T, FONTS } from '../../utils/theme';

const MODULES = [
  { section: 'OPERATIONS' },
  { id: 'dashboard', icon: '◈', label: 'Dashboard', path: '/' },
  { id: 'jobs', icon: '◉', label: 'Job View', path: '/jobs' },
  { id: 'tasks', icon: '☷', label: 'Task Manager', path: '/tasks', badge: true },
  { id: 'comms', icon: '◱', label: 'Communications Hub', path: '/communications' },
  { id: 'documents', icon: '◧', label: 'Document Generator', path: '/documents' },
  { id: 'field-ops', icon: '⊞', label: 'Field Operations', path: '/field-ops' },
  { id: 'tracking', icon: '◎', label: 'Track & Trace', path: '/tracking' },
  { id: 'reporting', icon: '▤', label: 'Reporting Console', path: '/reporting' },
  { section: 'PLANNING & LOGISTICS' },
  { id: 'planning', icon: '▥', label: 'Integrated Planning', path: '/planning' },
  { id: 'loading', icon: '⊟', label: 'Loading Plan Engine', path: '/loading-plan' },
  { id: 'routing', icon: '◌', label: 'Routing Plan & Map', path: '/routing' },
  { id: 'consolidation', icon: '⊡', label: 'Consolidation & Groupage', path: '/consolidation' },
  { id: 'responsibility', icon: '◫', label: 'Responsibility Matrix', path: '/responsibility' },
  { section: 'WAREHOUSE & HUBS' },
  { id: 'warehouse', icon: '▣', label: 'Warehouse & FIFO', path: '/warehouse' },
  { id: 'hub-config', icon: '⬡', label: 'Hub Config & Capacity', path: '/hub-config' },
  { id: 'hub-3d', icon: '◍', label: 'Hub 3D Network', path: '/hub-network' },
  { section: 'PROCUREMENT' },
  { id: 'procurement', icon: '◇', label: 'Procurement Engine', path: '/procurement' },
  { id: 'lane-risk', icon: '⚑', label: 'Lane Risk Assessment', path: '/lane-risk' },
  { id: 'sea-air', icon: '⛵', label: 'Sea/Air Explorer', path: '/sea-air' },
  { section: 'COMMERCIAL' },
  { id: 'commercial', icon: '◈', label: 'Client Portfolio', path: '/commercial' },
  { id: 'finance', icon: '◇', label: 'Finance & Billing', path: '/finance' },
  { id: 'treasury', icon: '◑', label: 'Treasury & Close', path: '/treasury' },
  { id: 'budget', icon: '▦', label: 'Budget & CAPEX', path: '/budget' },
  { id: 'customs', icon: '★', label: 'Customs & HS Codes', path: '/customs' },
  { section: 'ANALYTICS & INTELLIGENCE' },
  { id: 'trend', icon: '◆', label: 'Trend Intelligence', path: '/trends' },
  { id: 'governance', icon: '◐', label: 'Governance & KPIs', path: '/governance' },
  { id: 'unit-economics', icon: '$', label: 'Unit Economics', path: '/unit-economics' },
  { id: 'co2', icon: '🌿', label: 'CO2 Calculator', path: '/co2' },
  { section: 'COMPLIANCE & QMS' },
  { id: 'compliance', icon: '◑', label: 'Compliance & Certs', path: '/compliance' },
  { id: 'qms', icon: '◒', label: 'QMS & Close', path: '/qms' },
  { section: 'HR & GOVERNANCE' },
  { id: 'hr', icon: '◔', label: 'HR / Assets / Gov', path: '/hr' },
  { section: 'CLEAR COPILOT' },
  { id: 'copilot', icon: '✦', label: 'CLEAR Copilot', path: '/copilot' },
];

const NavItem = ({ icon, label, active, onClick, badge }) => (
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
    padding: '9px 14px', border: 'none', borderRadius: 8,
    background: active ? T.goldDim : 'transparent',
    color: active ? T.gold : T.textDim, cursor: 'pointer',
    fontFamily: FONTS.body, fontSize: 12.5, fontWeight: active ? 600 : 400,
    textAlign: 'left', transition: 'all 0.12s ease', position: 'relative',
  }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = T.surfaceHover; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? T.goldDim : 'transparent'; }}
  >
    {active && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 20, background: T.gold, borderRadius: '0 2px 2px 0' }} />}
    <span style={{ fontSize: 15, width: 22, textAlign: 'center', flexShrink: 0, opacity: active ? 1 : 0.6 }}>{icon}</span>
    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    {badge && <span style={{ background: T.red, color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>•</span>}
  </button>
);

const SectionLabel = ({ label }) => (
  <div style={{ padding: '16px 14px 6px', fontFamily: FONTS.mono, fontSize: 9, fontWeight: 500, color: T.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' }}>
    {label}
  </div>
);

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const activeModule = MODULES.filter(m => m.path).find(m => m.path === location.pathname || (m.path !== '/' && location.pathname.startsWith(m.path)));

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg }}>
      {/* ── SIDEBAR ── */}
      <aside style={{ width: 260, background: T.surface, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Brand */}
        <div style={{ padding: '20px 16px 14px', borderBottom: `1px solid ${T.border}`, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, ${T.gold}, transparent)` }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: `linear-gradient(135deg, ${T.gold}, ${T.orange})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONTS.display, fontSize: 12, fontWeight: 800, color: T.bg }}>≡</div>
            <div>
              <div style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: 800, color: T.text }}>CLEAR ERP</div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 9, color: T.textDim }}>v4.2 — LSCM Ltd</div>
            </div>
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
            <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: T.gold, background: T.goldDim, padding: '2px 8px', borderRadius: 4 }}>LIVE</span>
            <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: T.textDim, background: T.surfaceHover, padding: '2px 8px', borderRadius: 4 }}>22 modules</span>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 16px' }}>
          {MODULES.map((item, i) => {
            if (item.section) return <SectionLabel key={i} label={item.section} />;
            return (
              <NavItem key={item.id} icon={item.icon} label={item.label}
                active={activeModule?.id === item.id}
                onClick={() => navigate(item.path)}
                badge={item.badge} />
            );
          })}
        </nav>

        {/* User */}
        <div style={{ padding: '12px 12px 16px', borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: T.surfaceHover }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg, ${T.gold}, ${T.orange})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONTS.display, fontSize: 11, fontWeight: 700, color: T.bg }}>{user?.name?.[0] || 'M'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>{user?.name || 'User'}</div>
              <div style={{ fontSize: 9, color: T.textDim }}>{user?.role || 'CEO'} • LSCM Ltd</div>
            </div>
            <button onClick={logout} style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', fontSize: 14 }}>⏻</button>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{ padding: '12px 28px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontFamily: FONTS.display, fontSize: 17, fontWeight: 700, color: T.text }}>
              {activeModule?.label || 'CLEAR ERP'}
            </div>
            <span style={{ padding: '3px 10px', borderRadius: 20, background: T.greenDim, color: T.green, fontFamily: FONTS.mono, fontSize: 10 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: T.green, display: 'inline-block', marginRight: 5 }} />LIVE
            </span>
          </div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: T.textDim }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
