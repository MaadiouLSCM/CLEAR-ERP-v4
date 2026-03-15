import React from 'react';
import { T, FONTS } from '../../utils/theme';
import { SectionTitle, EmptyState } from '../Layout/PageShell';
import { getKanban } from '../../utils/api';

export default function Tasks() {
  
  const [data, setData] = React.useState(null);
  React.useEffect(() => { getKanban().then(setData).catch(() => {}); }, []);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>☷</span>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: T.text }}>Task Manager</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: T.textDim }}>Kanban board, Gantt 3D, CLEAR Copilot chatbox — from Orchestration Engine v3.1</div>
        </div>
      </div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: T.textDim, marginBottom: 16 }}>API: getKanban() → {data ? "Connected" : "Loading..."}</div>
      <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 12, padding: 24 }}>
        <EmptyState icon="☷" title="Module Ready" sub="Connect to API endpoints to populate this view" />
      </div>
    </div>
  );
}
