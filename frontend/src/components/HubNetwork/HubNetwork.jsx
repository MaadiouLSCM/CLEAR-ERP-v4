import React from 'react';
import { T, FONTS } from '../../utils/theme';
import { EmptyState } from '../Layout/PageShell';

const card = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 };

export default function HubNetwork() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>⊡</span>
        <div>
          <div style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: 700, color: T.text }}>Hub Network</div>
          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: T.textDim }}>Hub map • Inter-hub transfers • Network optimization</div>
        </div>
      </div>
      <div style={card}>
        <EmptyState icon="⊡" title="Phase 4 — Coming Soon" sub="Hub map • Inter-hub transfers • Network optimization" />
      </div>
    </div>
  );
}
