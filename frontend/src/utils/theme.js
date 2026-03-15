// CLEAR ERP v4.2 — Design System
// Source: Master Reference v3 → Design System sheet

export const T = {
  bg: '#0D0F14',
  surface: '#13161D',
  surfaceHover: '#1A1D26',
  border: '#1E2230',
  gold: '#F5A800',
  goldDim: 'rgba(245,168,0,0.12)',
  text: '#F0F0F0',
  textDim: '#8A8FA3',
  textMuted: '#5A5F73',
  green: '#34D399',
  greenDim: 'rgba(52,211,153,0.12)',
  blue: '#60A5FA',
  blueDim: 'rgba(96,165,250,0.12)',
  red: '#F87171',
  redDim: 'rgba(248,113,113,0.12)',
  orange: '#FB923C',
  orangeDim: 'rgba(251,146,60,0.12)',
  purple: '#A78BFA',
  purpleDim: 'rgba(167,139,250,0.12)',
  teal: '#2DD4BF',
  tealDim: 'rgba(45,212,191,0.12)',
  pink: '#F472B6',
  pinkDim: 'rgba(244,114,182,0.12)',
};

export const FONTS = {
  display: "'Syne', sans-serif",
  body: "'DM Sans', sans-serif",
  mono: "'DM Mono', monospace",
};

export const STATUS_COLORS = {
  DELIVERED: T.green, POD_RECEIVED: T.green, CLOSED: T.green,
  IN_TRANSIT: T.blue, EXPORT_CUSTOMS: T.blue, IMPORT_CUSTOMS: T.blue,
  GL_SUBMITTED: T.gold, GL_APPROVED: T.gold, BOOKING_CONFIRMED: T.gold,
  CUSTOMS_HOLD: T.red, ABORTED: T.red,
  DOCS_PENDING: T.orange, JCR_PENDING: T.orange,
  PLANNING: T.purple, JEP_SENT: T.purple, QUOTATION: T.purple, PFI_SENT: T.purple,
};

export const getStatusColor = (status) => STATUS_COLORS[status] || T.textDim;
