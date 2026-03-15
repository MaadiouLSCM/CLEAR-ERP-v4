import React from 'react';
import { T, FONTS } from '../../utils/theme';
import { EmptyState } from '../Layout/PageShell';

const card = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 };

export default function Copilot() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>⬡</span>
        <div>
          <div style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: 700, color: T.text }}>Copilot AI</div>
          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: T.textDim }}>Claude-powered operations assistant • Context-aware help • Phase 4.4</div>
        </div>
      </div>
      <div style={card}>
        <EmptyState icon="⬡" title="Phase 4 — Coming Soon" sub="Claude-powered operations assistant • Context-aware help • Phase 4.4" />
      </div>
    </div>
  );
}
