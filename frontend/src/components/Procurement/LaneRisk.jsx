import React from 'react';
import { T, FONTS } from '../../utils/theme';
import { EmptyState } from '../Layout/PageShell';
import { api } from '../../utils/api';

const card = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 };
const RISK_COL = { LOW: T.green, MEDIUM: T.orange, HIGH: T.red, NO_DATA: T.textDim };

export default function LaneRisk() {
  const [data, setData] = React.useState(null);
  const [corridors, setCorridors] = React.useState([]);
  const [selected, setSelected] = React.useState('');
  const [comparison, setComparison] = React.useState(null);

  React.useEffect(() => {
    api.get('/procurement/lane-risk').then(setData).catch(() => {});
    api.get('/corridors').then(c => setCorridors(c || [])).catch(() => {});
  }, []);

  const loadComparison = async (cId) => {
    setSelected(cId);
    if (cId) { try { setComparison(await api.get(`/procurement/comparison/${cId}`)); } catch { setComparison(null); } }
    else setComparison(null);
  };

  const Badge = ({ color, children }) => <span style={{ background: color + '20', color, padding: '2px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, fontFamily: FONTS.mono }}>{children}</span>;

  if (!data) return <div><div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}><span style={{ fontSize: 28 }}>⚑</span><div><div style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: 700, color: T.text }}>Lane Risk Assessment</div></div></div><EmptyState icon="⚑" title="Loading..." sub="" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>⚑</span>
        <div>
          <div style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: 700, color: T.text }}>Lane Risk Assessment</div>
          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: T.textDim }}>Risk scoring per corridor • Agent comparison • Historical analysis</div>
        </div>
      </div>

      {/* Corridor selector for comparison */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 8 }}>Agent Comparison by Corridor</div>
        <select value={selected} onChange={e => loadComparison(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontFamily: FONTS.body, fontSize: 13, minWidth: 300 }}>
          <option value="">Select corridor...</option>
          {corridors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {comparison && comparison.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {comparison.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: T.gold, width: 24 }}>#{i + 1}</span>
                <span style={{ fontFamily: FONTS.body, fontSize: 13, color: T.text, flex: 1 }}>{a.agentName}</span>
                <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: T.text }}>${a.totalSpend?.toLocaleString()}</span>
                <Badge color={T.blue}>{a.jobCount} jobs</Badge>
                <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: T.textDim }}>${a.avgCostPerJob}/job</span>
                <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim }}>{a.categories?.join(', ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Risk grid */}
      {data.map((lr, i) => (
        <div key={i} style={{ ...card, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', border: `3px solid ${RISK_COL[lr.riskLevel]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: FONTS.mono, fontSize: 14, fontWeight: 700, color: RISK_COL[lr.riskLevel] }}>{lr.riskScore}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONTS.body, fontSize: 14, fontWeight: 600, color: T.text }}>{lr.corridor}</div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim }}>{lr.totalJobs} jobs | {lr.mode} | {lr.avgTransitDays || '—'} days avg</div>
            </div>
            <Badge color={RISK_COL[lr.riskLevel]}>{lr.riskLevel} RISK</Badge>
            <div style={{ display: 'flex', gap: 12, fontFamily: FONTS.mono, fontSize: 10 }}>
              <span style={{ color: T.textDim }}>Customs: <span style={{ color: (lr.factors?.customsRisk || 0) > 30 ? T.red : T.green }}>{lr.factors?.customsRisk || 0}%</span></span>
              <span style={{ color: T.textDim }}>Delays: <span style={{ color: (lr.factors?.delayRate || 0) > 30 ? T.red : T.green }}>{lr.factors?.delayRate || 0}%</span></span>
              <span style={{ color: T.textDim }}>Aborts: <span style={{ color: (lr.factors?.abortRate || 0) > 10 ? T.red : T.green }}>{lr.factors?.abortRate || 0}%</span></span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
