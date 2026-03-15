import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { T, FONTS, getStatusColor } from '../../utils/theme';
import { KPICard, StatusBadge, SectionTitle, EmptyState } from '../Layout/PageShell';
import { getJob, getTimeline } from '../../utils/api';

export default function JobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [timeline, setTimeline] = useState([]);
  useEffect(() => { getJob(id).then(setJob).catch(() => {}); getTimeline(id).then(setTimeline).catch(() => {}); }, [id]);
  if (!job) return <EmptyState icon="◉" title="Loading job..." />;
  return (<div>
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: T.text }}>{job.ref}</div>
      <StatusBadge status={job.status} color={getStatusColor(job.status)} />
    </div>
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
      <KPICard label="Client" value={job.client?.name || "—"} color={T.gold} />
      <KPICard label="Items" value={job.totalItems} color={T.blue} />
      <KPICard label="Weight" value={job.totalWeightKg + " kg"} color={T.purple} />
      <KPICard label="Volume" value={job.totalCbm + " CBM"} color={T.green} />
    </div>
    <SectionTitle>Timeline ({timeline.length} events)</SectionTitle>
    <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 12, padding: 16 }}>
      {timeline.map((e, i) => (
        <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < timeline.length - 1 ? "1px solid " + T.border : "none" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: T.textMuted, minWidth: 100 }}>{new Date(e.timestamp).toLocaleString("fr-FR")}</div>
          <StatusBadge status={e.eventType} color={T.blue} />
          <div style={{ fontSize: 12, color: T.text }}>{e.description}</div>
        </div>
      ))}
      {timeline.length === 0 && <div style={{ color: T.textMuted, fontSize: 12 }}>No events yet</div>}
    </div>
  </div>);
}