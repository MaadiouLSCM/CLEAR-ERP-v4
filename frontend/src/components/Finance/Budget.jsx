import React from 'react';
import { T, FONTS } from '../../utils/theme';
import { SectionTitle, EmptyState } from '../Layout/PageShell';


export default function Budget() {
  
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>▦</span>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: T.text }}>Budget & CAPEX</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: T.textDim }}>Consolidated + per entity + monthly + 3 horizons</div>
        </div>
      </div>
      
      <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 12, padding: 24 }}>
        <EmptyState icon="▦" title="Module Ready" sub="Connect to API endpoints to populate this view" />
      </div>
    </div>
  );
}
