import React from 'react';
import { T, FONTS } from '../../utils/theme';
import { EmptyState } from '../Layout/PageShell';
import { api } from '../../utils/api';

const card = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 };
const VIEWS = ['Dashboard', 'Scorecards', 'Lane Risk'];
const RATING_COL = { EXCELLENT: T.green, GOOD: T.blue, FAIR: T.orange, POOR: T.red };
const RISK_COL = { LOW: T.green, MEDIUM: T.orange, HIGH: T.red, NO_DATA: T.textDim };

export default function Procurement() {
  const [view, setView] = React.useState('Dashboard');
  const [dash, setDash] = React.useState(null);
  const [scorecards, setScorecards] = React.useState(null);
  const [laneRisk, setLaneRisk] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => { loadData(); }, [view]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (view === 'Dashboard') setDash(await api.get('/procurement/dashboard'));
      if (view === 'Scorecards') setScorecards(await api.get('/procurement/scorecards'));
      if (view === 'Lane Risk') setLaneRisk(await api.get('/procurement/lane-risk'));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const Badge = ({ color, children }) => <span style={{ background: color + '20', color, padding: '2px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, fontFamily: FONTS.mono }}>{children}</span>;

  const ScoreRing = ({ score, size = 56 }) => {
    const color = score >= 80 ? T.green : score >= 60 ? T.blue : score >= 40 ? T.orange : T.red;
    const circumference = 2 * Math.PI * ((size - 6) / 2);
    const offset = circumference - (score / 100) * circumference;
    return (
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        <circle cx={size/2} cy={size/2} r={(size-6)/2} fill="none" stroke={T.border} strokeWidth={3} />
        <circle cx={size/2} cy={size/2} r={(size-6)/2} fill="none" stroke={color} strokeWidth={3}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} />
        <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
          fill={color} fontFamily={FONTS.mono} fontSize={size > 50 ? 14 : 11} fontWeight={700}>{score}</text>
      </svg>
    );
  };

  const FactorBar = ({ label, value, max = 100 }) => {
    const color = value >= 70 ? T.green : value >= 40 ? T.orange : T.red;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontFamily: FONTS.body, fontSize: 10, color: T.textDim, width: 70, textAlign: 'right' }}>{label}</span>
        <div style={{ flex: 1, height: 6, background: T.bg, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${(value / max) * 100}%`, height: '100%', background: color, borderRadius: 3 }} />
        </div>
        <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: T.text, width: 30 }}>{value}</span>
      </div>
    );
  };

  const DashView = () => {
    if (!dash) return <EmptyState icon="◇" title="Loading..." sub="" />;
    const kpis = [
      { l: 'Total Spend', v: `$${(dash.totalSpend || 0).toLocaleString()}`, c: T.gold, icon: '💰' },
      { l: 'Agent Invoices', v: dash.totalAgentInvoices, c: T.blue, icon: '📄' },
      { l: 'Pending', v: dash.pendingInvoices, c: T.orange, icon: '⏳' },
      { l: 'Corridors', v: dash.corridorCount, c: T.teal, icon: '🛤' },
      { l: 'Sub Certs', v: dash.totalSubCerts, c: T.green, icon: '📋' },
      { l: 'Expired Certs', v: dash.expiredCerts, c: T.red, icon: '⚠' },
    ];
    return (<>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 16 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{k.icon}</div>
            <div style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: 700, color: k.c }}>{k.v}</div>
            <div style={{ fontFamily: FONTS.body, fontSize: 10, color: T.textDim }}>{k.l}</div>
          </div>
        ))}
      </div>
      <div style={card}>
        <div style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 12 }}>Top Agents by Spend</div>
        {(dash.topAgents || []).map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
            <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: T.gold, width: 24 }}>#{i + 1}</span>
            <span style={{ fontFamily: FONTS.body, fontSize: 13, color: T.text, flex: 1 }}>{a.agentName}</span>
            <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: T.text }}>${(a.totalSpend || 0).toLocaleString()}</span>
            <Badge color={T.blue}>{a.jobCount} jobs</Badge>
          </div>
        ))}
      </div>
    </>);
  };

  const ScorecardsView = () => {
    if (!scorecards) return <EmptyState icon="◇" title="Loading..." sub="" />;
    if (!scorecards.length) return <EmptyState icon="◇" title="No Agent Data" sub="Agent invoices are needed to compute scorecards" />;
    return scorecards.map((sc, i) => (
      <div key={i} style={{ ...card, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ScoreRing score={sc.totalScore} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontFamily: FONTS.display, fontSize: 16, fontWeight: 700, color: T.text }}>{sc.agentName}</span>
              <Badge color={RATING_COL[sc.rating] || T.textDim}>{sc.rating}</Badge>
            </div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: T.textDim }}>
              {sc.totalJobs} jobs | ${(sc.totalSpend || 0).toLocaleString()} spend | {sc.corridors?.join(', ') || '—'}
            </div>
          </div>
          <div style={{ width: 200 }}>
            <FactorBar label="Cost" value={sc.breakdown.cost} />
            <FactorBar label="Reliability" value={sc.breakdown.reliability} />
            <FactorBar label="Compliance" value={sc.breakdown.compliance} />
            <FactorBar label="Transit" value={sc.breakdown.transitTime} />
          </div>
        </div>
      </div>
    ));
  };

  const LaneRiskView = () => {
    if (!laneRisk) return <EmptyState icon="⚑" title="Loading..." sub="" />;
    if (!laneRisk.length) return <EmptyState icon="⚑" title="No Lane Data" sub="Jobs on corridors are needed for lane risk analysis" />;
    return laneRisk.map((lr, i) => (
      <div key={i} style={{ ...card, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ScoreRing score={lr.riskScore} size={50} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontFamily: FONTS.display, fontSize: 15, fontWeight: 700, color: T.text }}>{lr.corridor}</span>
              <Badge color={RISK_COL[lr.riskLevel] || T.textDim}>{lr.riskLevel} RISK</Badge>
              <Badge color={lr.mode === 'SEA' ? T.blue : T.purple}>{lr.mode}</Badge>
            </div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: T.textDim }}>
              {lr.totalJobs} jobs | Avg transit: {lr.avgTransitDays || '—'} days
            </div>
          </div>
          <div style={{ width: 220 }}>
            <FactorBar label="Customs" value={lr.factors?.customsRisk || 0} />
            <FactorBar label="Delays" value={lr.factors?.delayRate || 0} />
            <FactorBar label="Aborts" value={lr.factors?.abortRate || 0} />
            <FactorBar label="Docs" value={100 - (lr.factors?.docCompleteness || 100)} />
          </div>
        </div>
        {lr.factors?.avgDelayDays > 0 && (
          <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.orange, marginTop: 6, marginLeft: 66 }}>
            Avg delay: {lr.factors.avgDelayDays} days when delayed
          </div>
        )}
      </div>
    ));
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>◇</span>
        <div>
          <div style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: 700, color: T.text }}>Procurement Engine</div>
          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: T.textDim }}>Agent scorecard 0-100 • Lane risk per corridor • Best-fit analysis</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {VIEWS.map(v => (
          <button key={v} onClick={() => setView(v)}
            style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${view === v ? T.gold : T.border}`, background: view === v ? T.goldDim : 'transparent', color: view === v ? T.gold : T.textDim, fontFamily: FONTS.body, fontSize: 12, fontWeight: view === v ? 600 : 400, cursor: 'pointer' }}>
            {v}
          </button>
        ))}
      </div>
      {view === 'Dashboard' && <DashView />}
      {view === 'Scorecards' && <ScorecardsView />}
      {view === 'Lane Risk' && <LaneRiskView />}
    </div>
  );
}
