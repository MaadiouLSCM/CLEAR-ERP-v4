import React from 'react';
import { T, FONTS } from '../../utils/theme';
import { SectionTitle, EmptyState } from '../Layout/PageShell';
import { getCertifications } from '../../utils/api';

export default function Compliance() {
  
  const [data, setData] = React.useState(null);
  React.useEffect(() => { getCertifications().then(setData).catch(() => {}); }, []);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>◑</span>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: T.text }}>Compliance & Certs</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: T.textDim }}>13 certs + renewals + audits + timeline</div>
        </div>
      </div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: T.textDim, marginBottom: 16 }}>API: getCertifications() → {data ? "Connected" : "Loading..."}</div>
      <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 12, padding: 24 }}>
        <EmptyState icon="◑" title="Module Ready" sub="Connect to API endpoints to populate this view" />
      </div>
    </div>
  );
}
