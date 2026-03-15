import React from 'react';
import { T, FONTS } from '../../utils/theme';

export const KPICard = ({ label, value, color = T.gold, sub }) => (
  <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 20px', minWidth: 140 }}>
    <div style={{ fontFamily: FONTS.mono, fontSize: 24, fontWeight: 700, color }}>{value}</div>
    <div style={{ fontFamily: FONTS.body, fontSize: 11, color: T.textDim, marginTop: 4 }}>{label}</div>
    {sub && <div style={{ fontFamily: FONTS.mono, fontSize: 9, color: T.textMuted, marginTop: 2 }}>{sub}</div>}
  </div>
);

export const DataTable = ({ headers, rows, onRowClick }) => (
  <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>{headers.map((h, i) => (
          <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontFamily: FONTS.mono, fontSize: 10, color: T.textMuted, borderBottom: `1px solid ${T.border}`, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
        ))}</tr>
      </thead>
      <tbody>{rows.map((row, ri) => (
        <tr key={ri} onClick={() => onRowClick?.(row)} style={{ cursor: onRowClick ? 'pointer' : 'default', borderBottom: `1px solid ${T.border}` }}
          onMouseEnter={e => e.currentTarget.style.background = T.surfaceHover}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          {row.map((cell, ci) => (
            <td key={ci} style={{ padding: '10px 14px', fontFamily: FONTS.body, fontSize: 12, color: T.text }}>{cell}</td>
          ))}
        </tr>
      ))}</tbody>
    </table>
  </div>
);

export const StatusBadge = ({ status, color }) => (
  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontFamily: FONTS.mono, fontWeight: 600, color: color || T.textDim, background: color ? color + '1F' : T.surfaceHover }}>{status}</span>
);

export const SectionTitle = ({ children }) => (
  <div style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12, marginTop: 20 }}>{children}</div>
);

export const EmptyState = ({ icon, title, sub }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, color: T.textMuted }}>
    <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>{icon}</div>
    <div style={{ fontFamily: FONTS.display, fontSize: 16, fontWeight: 600, color: T.textDim }}>{title}</div>
    {sub && <div style={{ fontSize: 12, marginTop: 6 }}>{sub}</div>}
  </div>
);
