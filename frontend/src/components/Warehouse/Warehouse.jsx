import React from 'react';
import { T, FONTS } from '../../utils/theme';
import { SectionTitle, EmptyState } from '../Layout/PageShell';
import { getHubs } from '../../utils/api';

export default function Warehouse() {
  
  const [data, setData] = React.useState(null);
  React.useEffect(() => { getHubs().then(setData).catch(() => {}); }, []);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>▣</span>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: T.text }}>Warehouse & FIFO</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: T.textDim }}>Stock + FIFO Queue (priority 0-1000) + Hub Capacity + Movements</div>
        </div>
      </div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: T.textDim, marginBottom: 16 }}>API: getHubs() → {data ? "Connected" : "Loading..."}</div>
      <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 12, padding: 24 }}>
        <EmptyState icon="▣" title="Module Ready" sub="Connect to API endpoints to populate this view" />
      </div>
    </div>
  );
}
