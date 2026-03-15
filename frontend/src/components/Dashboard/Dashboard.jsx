import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { T, FONTS, getStatusColor } from '../../utils/theme';
import { KPICard, DataTable, StatusBadge, SectionTitle, EmptyState } from '../Layout/PageShell';
import { getDashboard, getJobs, getOverdueTasks } from '../../utils/api';

// ── Mini Donut Chart (SVG, no deps) ──
const DonutChart = ({ data, size = 180 }) => {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (!total) return null;
  const cx = size / 2, cy = size / 2, r = size * 0.35, stroke = size * 0.12;
  let cumulative = 0;
  const arcs = data.filter(d => d.count > 0).map(d => {
    const pct = d.count / total;
    const start = cumulative;
    cumulative += pct;
    return { ...d, pct, start, end: cumulative };
  });

  const polarToCartesian = (cx, cy, r, angle) => ({
    x: cx + r * Math.cos(angle - Math.PI / 2),
    y: cy + r * Math.sin(angle - Math.PI / 2),
  });

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        {arcs.map((arc, i) => {
          const startAngle = arc.start * 2 * Math.PI;
          const endAngle = arc.end * 2 * Math.PI;
          const s = polarToCartesian(cx, cy, r, startAngle);
          const e = polarToCartesian(cx, cy, r, endAngle);
          const large = arc.pct > 0.5 ? 1 : 0;
          const d = `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
          return <path key={i} d={d} fill="none" stroke={arc.color} strokeWidth={stroke} strokeLinecap="round" />;
        })}
      </svg>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
        <div style={{ fontFamily: FONTS.display, fontSize: 28, fontWeight: 800, color: T.text }}>{total}</div>
        <div style={{ fontFamily: FONTS.mono, fontSize: 9, color: T.textDim }}>TOTAL JOBS</div>
      </div>
    </div>
  );
};

// ── Status grouping ──
const STATUS_GROUPS = [
  { label: 'Pre-Shipment', statuses: ['RFC_RECEIVED', 'BW_IMPORTED', 'QR_STICKERS_SENT', 'DOCS_PENDING', 'DOCS_COMPLETE', 'QUOTATION', 'PFI_SENT', 'PFI_APPROVED'], color: T.purple },
  { label: 'Planning', statuses: ['PLANNING', 'JEP_SENT', 'OPS_LAUNCHED'], color: T.blue },
  { label: 'Pickup & Hub', statuses: ['PICKUP_SCHEDULED', 'PICKUP_COMPLETED', 'AT_HUB', 'INSPECTION_DONE', 'CONSOLIDATED'], color: T.teal },
  { label: 'Customs & Transit', statuses: ['GL_SUBMITTED', 'GL_APPROVED', 'BOOKING_CONFIRMED', 'PRE_ALERT_SENT', 'EXPORT_CUSTOMS', 'IN_TRANSIT', 'IMPORT_CUSTOMS', 'CUSTOMS_CLEARED'], color: T.gold },
  { label: 'Delivery', statuses: ['DELIVERY_SCHEDULED', 'DELIVERED', 'POD_RECEIVED'], color: T.green },
  { label: 'Close & Billing', statuses: ['JCR_PENDING', 'JCR_COMPLETE', 'INVOICED', 'CLOSED'], color: T.pink },
  { label: 'Hold / Abort', statuses: ['CUSTOMS_HOLD', 'JOB_ABORTED'], color: T.red },
];

function groupByStatus(byStatus) {
  if (!byStatus || !byStatus.length) return [];
  return STATUS_GROUPS.map(g => {
    const count = byStatus.filter(s => g.statuses.includes(s.status)).reduce((sum, s) => sum + s._count, 0);
    return { ...g, count };
  }).filter(g => g.count > 0);
}

export default function Dashboard() {
  const [dash, setDash] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      getDashboard().catch(() => null),
      getJobs().catch(() => []),
      getOverdueTasks().catch(() => []),
    ]).then(([d, j, o]) => {
      setDash(d);
      setJobs(j.slice(0, 20));
      setOverdue(o);
      setLoading(false);
    });
  }, []);

  if (loading) return <EmptyState icon="◈" title="Loading dashboard..." />;

  const donutData = groupByStatus(dash?.byStatus || []);
  const activeCount = (dash?.byStatus || [])
    .filter(s => !['CLOSED', 'INVOICED', 'JOB_ABORTED'].includes(s.status))
    .reduce((sum, s) => sum + s._count, 0);
  const deliveredCount = (dash?.byStatus || [])
    .filter(s => ['DELIVERED', 'POD_RECEIVED', 'JCR_PENDING', 'JCR_COMPLETE'].includes(s.status))
    .reduce((sum, s) => sum + s._count, 0);
  const holdCount = (dash?.byStatus || [])
    .filter(s => s.status === 'CUSTOMS_HOLD')
    .reduce((sum, s) => sum + s._count, 0);

  return (
    <div>
      {/* ── KPI Row ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
        <KPICard label="Total Jobs" value={dash?.total || 0} color={T.gold} sub="All time" />
        <KPICard label="Active" value={activeCount} color={T.blue} sub="In progress" />
        <KPICard label="Delivered" value={deliveredCount} color={T.green} sub="Awaiting closure" />
        <KPICard label="Customs Hold" value={holdCount} color={T.red} sub={holdCount > 0 ? "Action required" : "Clear"} />
        <KPICard label="Overdue Tasks" value={overdue.length} color={overdue.length > 0 ? T.orange : T.green} sub={overdue.length > 0 ? "Needs attention" : "On track"} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, marginBottom: 28 }}>
        {/* ── Donut Chart ── */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontFamily: FONTS.display, fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 16 }}>Status Distribution</div>
          <DonutChart data={donutData} />
          <div style={{ marginTop: 16, width: '100%' }}>
            {donutData.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                <span style={{ fontFamily: FONTS.body, fontSize: 11, color: T.textDim, flex: 1 }}>{d.label}</span>
                <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: T.text, fontWeight: 600 }}>{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Status Breakdown ── */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontFamily: FONTS.display, fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 16 }}>All Statuses</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
            {(dash?.byStatus || []).sort((a, b) => b._count - a._count).map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: T.surfaceHover, cursor: 'pointer' }}
                onClick={() => navigate(`/jobs?status=${s.status}`)}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: getStatusColor(s.status) }} />
                <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim, flex: 1 }}>{s.status.replace(/_/g, ' ')}</span>
                <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: T.text, fontWeight: 700 }}>{s._count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Overdue Tasks Alert ── */}
      {overdue.length > 0 && (
        <div style={{ background: T.redDim, border: `1px solid ${T.red}33`, borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <div style={{ fontFamily: FONTS.display, fontSize: 13, fontWeight: 700, color: T.red, marginBottom: 8 }}>
            ⚠ {overdue.length} Overdue Task{overdue.length > 1 ? 's' : ''}
          </div>
          {overdue.slice(0, 5).map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: i < Math.min(overdue.length, 5) - 1 ? `1px solid ${T.border}` : 'none' }}>
              <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.red, minWidth: 80 }}>{t.job?.ref || '—'}</span>
              <span style={{ fontFamily: FONTS.body, fontSize: 11, color: T.text, flex: 1 }}>{t.title}</span>
              <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim }}>{t.assignee?.name || '—'}</span>
              <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.red }}>Due: {new Date(t.dueDate).toLocaleDateString('fr-FR')}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Recent Jobs Table ── */}
      <SectionTitle>Recent Jobs</SectionTitle>
      <DataTable
        headers={['Ref', 'Client', 'PO', 'Mode', 'Status', 'Expediter', 'Updated']}
        rows={jobs.map(j => [
          j.ref,
          j.client?.name || '—',
          j.poNumber || '—',
          j.transportMode,
          <StatusBadge status={j.status} color={getStatusColor(j.status)} />,
          j.expediter?.name || '—',
          new Date(j.updatedAt).toLocaleDateString('fr-FR'),
        ])}
        onRowClick={row => {
          const j = jobs.find(j => j.ref === row[0]);
          if (j) navigate('/jobs/' + j.id);
        }}
      />
    </div>
  );
}
