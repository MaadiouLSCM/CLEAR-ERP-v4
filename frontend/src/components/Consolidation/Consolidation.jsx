import React from 'react';
import { T, FONTS } from '../../utils/theme';
import { SectionTitle, EmptyState } from '../Layout/PageShell';
import { api } from '../../utils/api';

const card = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 };
const VIEWS = ['Recommendations', 'Pending Requests', 'Generate'];
const LVL_COLORS = { MAXIMUM: T.green, OPTIMAL: T.gold, MINIMUM: T.orange };
const ST_COLORS = { SUGGESTED: T.blue, ACCEPTED: T.green, REJECTED: T.red, EXPIRED: T.textDim };

export default function Consolidation() {
  const [view, setView] = React.useState('Recommendations');
  const [recs, setRecs] = React.useState(null);
  const [pending, setPending] = React.useState(null);
  const [corridors, setCorridors] = React.useState([]);
  const [genForm, setGenForm] = React.useState({ corridorId: '', mode: 'SEA' });
  const [genResult, setGenResult] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => { loadData(); loadCorridors(); }, [view]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (view === 'Recommendations') setRecs(await api.get('/consolidation/recommendations'));
      if (view === 'Pending Requests') setPending(await api.get('/consolidation/requests'));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadCorridors = async () => {
    try { const c = await api.get('/corridors'); setCorridors(c || []); } catch {}
  };

  const generate = async () => {
    if (!genForm.corridorId) return alert('Select a corridor');
    setLoading(true);
    try { const r = await api.post('/consolidation/recommend', genForm); setGenResult(r); } catch (e) { alert(e.message); }
    setLoading(false);
  };

  const accept = async (id) => {
    try { await api.post(`/consolidation/recommendations/${id}/accept`, {}); loadData(); } catch (e) { alert(e.message); }
  };

  const reject = async (id) => {
    const reason = prompt('Rejection reason (optional):');
    try { await api.post(`/consolidation/recommendations/${id}/reject`, { reason }); loadData(); } catch (e) { alert(e.message); }
  };

  const Badge = ({ color, children }) => (
    <span style={{ background: color + '20', color, padding: '2px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, fontFamily: FONTS.mono }}>{children}</span>
  );

  const FillBar = ({ pct }) => (
    <div style={{ width: 120, height: 10, background: T.bg, borderRadius: 5, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: pct >= 80 ? T.green : pct >= 50 ? T.gold : T.orange, borderRadius: 5 }} />
    </div>
  );

  const RecCard = ({ rec }) => (
    <div style={{ ...card, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Badge color={LVL_COLORS[rec.consolidationLevel] || T.textDim}>{rec.consolidationLevel}</Badge>
        <Badge color={ST_COLORS[rec.status] || T.textDim}>{rec.status}</Badge>
        <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: T.textDim }}>{rec.mode}</span>
        {rec.containerType && <Badge color={T.teal}>{rec.containerType}</Badge>}
        {rec.uldType && <Badge color={T.purple}>{rec.uldType}</Badge>}
        <div style={{ flex: 1 }} />
        {rec.status === 'SUGGESTED' && <>
          <button onClick={() => accept(rec.id)} style={{ padding: '4px 14px', borderRadius: 6, border: 'none', background: T.green, color: '#000', fontFamily: FONTS.body, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>✓ Accept</button>
          <button onClick={() => reject(rec.id)} style={{ padding: '4px 14px', borderRadius: 6, border: `1px solid ${T.red}`, background: 'transparent', color: T.red, fontFamily: FONTS.body, fontSize: 11, cursor: 'pointer' }}>✗ Reject</button>
        </>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        <div>
          <div style={{ fontFamily: FONTS.body, fontSize: 10, color: T.textDim }}>Ship Date</div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 13, color: T.text }}>{rec.recommendedDate ? new Date(rec.recommendedDate).toLocaleDateString('en-GB') : '—'}</div>
        </div>
        <div>
          <div style={{ fontFamily: FONTS.body, fontSize: 10, color: T.textDim }}>Fill Rate</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FillBar pct={rec.fillRatePct} />
            <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: T.gold }}>{rec.fillRatePct}%</span>
          </div>
        </div>
        <div>
          <div style={{ fontFamily: FONTS.body, fontSize: 10, color: T.textDim }}>Est. Cost</div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 13, color: T.text }}>$ {(rec.estimatedCost || 0).toLocaleString()}</div>
        </div>
        <div>
          <div style={{ fontFamily: FONTS.body, fontSize: 10, color: T.textDim }}>Savings</div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 13, color: T.green }}>{rec.savingsPct}%{rec.savingsAmount ? ` ($${rec.savingsAmount.toLocaleString()})` : ''}</div>
        </div>
        <div>
          <div style={{ fontFamily: FONTS.body, fontSize: 10, color: T.textDim }}>Expires</div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: T.textDim }}>{rec.expiresAt ? new Date(rec.expiresAt).toLocaleString('en-GB') : '—'}</div>
        </div>
      </div>
    </div>
  );

  const RecsView = () => {
    if (!recs) return <EmptyState icon="📦" title="Loading..." sub="" />;
    if (recs.length === 0) return <EmptyState icon="📦" title="No Active Recommendations" sub="Generate recommendations from the Generate tab" />;
    return recs.map((r, i) => <RecCard key={i} rec={r} />);
  };

  const PendingView = () => {
    if (!pending) return <EmptyState icon="📋" title="Loading..." sub="" />;
    if (pending.length === 0) return <EmptyState icon="📋" title="No Pending Requests" sub="Consolidation requests are created automatically from job items" />;
    return (<div style={card}>
      {pending.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
          <Badge color={T.gold}>{r.urgency}</Badge>
          <Badge color={r.mode === 'SEA' ? T.blue : T.purple}>{r.mode}</Badge>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONTS.body, fontSize: 13, color: T.text }}>{r.job?.ref || r.jobId} — {r.job?.client?.name || ''}</div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim }}>{r.corridor?.origin} → {r.corridor?.destination} | {r.cargoCbm} CBM | {r.cargoWeightKg} kg</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: T.text }}>Ship: {new Date(r.earliestShipDate).toLocaleDateString('en-GB')}</div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim }}>Latest: {new Date(r.latestShipDate).toLocaleDateString('en-GB')}</div>
          </div>
        </div>
      ))}
    </div>);
  };

  const GenerateView = () => (
    <div>
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 12 }}>Generate Consolidation Recommendations</div>
        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: T.textDim, marginBottom: 16, lineHeight: 1.6 }}>
          Advisory only — consolidation never blocks operations (D06). Generates 3 levels: MAXIMUM (wait for full container), OPTIMAL (balanced), MINIMUM (ship now as LCL).
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONTS.body, fontSize: 11, color: T.textDim, marginBottom: 4 }}>Corridor</div>
            <select value={genForm.corridorId} onChange={e => setGenForm({ ...genForm, corridorId: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontFamily: FONTS.body, fontSize: 13 }}>
              <option value="">Select corridor...</option>
              {corridors.map(c => <option key={c.id} value={c.id}>{c.origin} → {c.destination}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontFamily: FONTS.body, fontSize: 11, color: T.textDim, marginBottom: 4 }}>Mode</div>
            <select value={genForm.mode} onChange={e => setGenForm({ ...genForm, mode: e.target.value })}
              style={{ padding: '10px 16px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontFamily: FONTS.body, fontSize: 13 }}>
              <option value="SEA">Sea Freight</option>
              <option value="AIR">Air Freight</option>
            </select>
          </div>
          <button onClick={generate} disabled={loading}
            style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: T.gold, color: '#000', fontFamily: FONTS.body, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {loading ? 'Generating...' : '⚡ Generate'}
          </button>
        </div>
      </div>
      {genResult && (
        <div style={{ ...card }}>
          <div style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 12 }}>Results</div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: T.textDim }}>Consolidatable: <span style={{ color: T.gold }}>{genResult.consolidatable}</span></div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: T.textDim }}>Bypass (immediate): <span style={{ color: T.orange }}>{genResult.immediateBypass}</span></div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: T.textDim }}>Total: <span style={{ color: T.text }}>{genResult.totalCbm?.toFixed(1)} CBM / {genResult.totalKg?.toFixed(0)} kg</span></div>
          </div>
          {(genResult.recommendations || []).map((r, i) => <RecCard key={i} rec={r} />)}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>📦</span>
        <div>
          <div style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: 700, color: T.text }}>Consolidation Engine</div>
          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: T.textDim }}>3-level advisory • Sea & Air • Weight breaks • Accept/Reject flow</div>
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
      {view === 'Recommendations' && <RecsView />}
      {view === 'Pending Requests' && <PendingView />}
      {view === 'Generate' && <GenerateView />}
    </div>
  );
}
