import React from 'react';
import { T, FONTS } from '../../utils/theme';
import { EmptyState } from '../Layout/PageShell';
import { api } from '../../utils/api';

const card = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 };
const VIEWS = ['Reports', 'DSR', 'WSR', 'JCR'];
const CAT_COLORS = { Operations: T.blue, Finance: T.green, KPIs: T.gold, Compliance: T.orange, Warehouse: T.teal, Executive: T.purple, Commercial: T.pink, Procurement: T.text };

export default function Reporting() {
  const [view, setView] = React.useState('Reports');
  const [types, setTypes] = React.useState(null);
  const [dsr, setDsr] = React.useState(null);
  const [wsr, setWsr] = React.useState(null);
  const [jcr, setJcr] = React.useState(null);
  const [jcrJobId, setJcrJobId] = React.useState('');
  const [jobs, setJobs] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => { loadTypes(); loadJobs(); }, []);
  React.useEffect(() => { if (view === 'DSR') loadDSR(); if (view === 'WSR') loadWSR(); }, [view]);

  const loadTypes = async () => { try { setTypes(await api.get('/reports/types')); } catch {} };
  const loadJobs = async () => { try { const j = await api.get('/jobs'); setJobs(Array.isArray(j) ? j : j.items || []); } catch {} };
  const loadDSR = async () => { setLoading(true); try { setDsr(await api.get('/reports/dsr')); } catch (e) { console.error(e); } setLoading(false); };
  const loadWSR = async () => { setLoading(true); try { setWsr(await api.get('/reports/wsr')); } catch (e) { console.error(e); } setLoading(false); };
  const loadJCR = async () => {
    if (!jcrJobId) return alert('Select a job');
    setLoading(true); try { setJcr(await api.get(`/reports/jcr/${jcrJobId}`)); } catch (e) { alert(e.message); } setLoading(false);
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const Badge = ({ color, children }) => <span style={{ background: color + '20', color, padding: '2px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, fontFamily: FONTS.mono }}>{children}</span>;

  const ReportsView = () => {
    if (!types) return <EmptyState icon="📊" title="Loading..." sub="" />;
    const byCategory = {};
    types.forEach(t => { if (!byCategory[t.category]) byCategory[t.category] = []; byCategory[t.category].push(t); });
    return Object.entries(byCategory).map(([cat, items]) => (
      <div key={cat} style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: 600, color: CAT_COLORS[cat] || T.text, marginBottom: 10 }}>{cat} ({items.length})</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {items.map((r, i) => (
            <div key={i} style={{ padding: '10px 12px', background: T.bg, borderRadius: 8, border: `1px solid ${T.border}` }}>
              <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: CAT_COLORS[cat] || T.gold, fontWeight: 600 }}>{r.code}</div>
              <div style={{ fontFamily: FONTS.body, fontSize: 12, color: T.text, marginTop: 2 }}>{r.name}</div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim, marginTop: 2 }}>{r.frequency}</div>
            </div>
          ))}
        </div>
      </div>
    ));
  };

  const DSRView = () => {
    if (loading || !dsr) return <EmptyState icon="📋" title="Loading DSR..." sub="" />;
    return (
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontFamily: FONTS.display, fontSize: 16, fontWeight: 700, color: T.text }}>Daily Status Report — {dsr.date}</div>
          <button onClick={loadDSR} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${T.gold}`, background: T.goldDim, color: T.gold, fontFamily: FONTS.body, fontSize: 12, cursor: 'pointer' }}>↻ Refresh</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
          {[{ l: 'Active Jobs', v: dsr.activeJobs, c: T.gold }, { l: 'Events Today', v: dsr.todayEvents, c: T.blue }, { l: 'Overdue Tasks', v: dsr.overdueTasksCount, c: T.red }, { l: 'Hubs', v: dsr.hubCapacity?.length || 0, c: T.teal }].map((k, i) => (
            <div key={i} style={{ background: T.bg, borderRadius: 8, padding: 16, textAlign: 'center' }}>
              <div style={{ fontFamily: FONTS.display, fontSize: 24, fontWeight: 700, color: k.c }}>{k.v}</div>
              <div style={{ fontFamily: FONTS.body, fontSize: 11, color: T.textDim }}>{k.l}</div>
            </div>
          ))}
        </div>
        {dsr.hubCapacity?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: FONTS.display, fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8 }}>Hub Utilization</div>
            <div style={{ display: 'flex', gap: 12 }}>
              {dsr.hubCapacity.map((h, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: T.textDim, marginBottom: 4 }}>{h.hub}</div>
                  <div style={{ height: 8, background: T.bg, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${h.utilization}%`, height: '100%', background: h.utilization > 80 ? T.red : h.utilization > 60 ? T.orange : T.green, borderRadius: 4 }} />
                  </div>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: T.text, marginTop: 2 }}>{h.utilization}%</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ fontFamily: FONTS.display, fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8 }}>Active Jobs</div>
        {(dsr.jobs || []).slice(0, 15).map((j, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: `1px solid ${T.border}`, alignItems: 'center' }}>
            <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: T.gold, minWidth: 100 }}>{j.ref}</span>
            <span style={{ fontFamily: FONTS.body, fontSize: 12, color: T.text, flex: 1 }}>{j.client}</span>
            <Badge color={T.blue}>{j.status}</Badge>
            <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim }}>{j.expediter || '—'}</span>
          </div>
        ))}
      </div>
    );
  };

  const WSRView = () => {
    if (loading || !wsr) return <EmptyState icon="📊" title="Loading WSR..." sub="" />;
    return (
      <div style={card}>
        <div style={{ fontFamily: FONTS.display, fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 4 }}>Weekly Status Report</div>
        <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: T.textDim, marginBottom: 16 }}>{wsr.period}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
          {[{ l: 'Delivered', v: wsr.delivered, c: T.green }, { l: 'In Transit', v: wsr.inTransit, c: T.blue }, { l: 'Pending', v: wsr.pending, c: T.orange }, { l: 'New Jobs', v: wsr.newJobs, c: T.gold }].map((k, i) => (
            <div key={i} style={{ background: T.bg, borderRadius: 12, padding: 20, textAlign: 'center' }}>
              <div style={{ fontFamily: FONTS.display, fontSize: 32, fontWeight: 700, color: k.c }}>{k.v}</div>
              <div style={{ fontFamily: FONTS.body, fontSize: 12, color: T.textDim, marginTop: 4 }}>{k.l}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const JCRView = () => (
    <div>
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 12 }}>Generate Job Completion Report</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONTS.body, fontSize: 11, color: T.textDim, marginBottom: 4 }}>Job</div>
            <select value={jcrJobId} onChange={e => setJcrJobId(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontFamily: FONTS.body, fontSize: 13 }}>
              <option value="">Select job...</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.ref} — {j.client?.name || ''} ({j.status})</option>)}
            </select>
          </div>
          <button onClick={loadJCR} disabled={loading}
            style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: T.gold, color: '#000', fontFamily: FONTS.body, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {loading ? 'Generating...' : 'Generate JCR'}
          </button>
        </div>
      </div>
      {jcr && (
        <div style={card}>
          <div style={{ fontFamily: FONTS.display, fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 4 }}>Job Completion Report — {jcr.jobRef}</div>
          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: T.textDim, marginBottom: 16 }}>{jcr.clientName} | {jcr.corridor} | {jcr.mode}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
            {[{ l: 'Items', v: jcr.itemCount }, { l: 'Weight', v: `${jcr.totalWeightKg} kg` }, { l: 'Volume', v: `${jcr.totalCbm} CBM` }, { l: 'Value', v: jcr.declaredValue ? `$${jcr.declaredValue.toLocaleString()}` : '—' }].map((k, i) => (
              <div key={i}><div style={{ fontFamily: FONTS.body, fontSize: 10, color: T.textDim }}>{k.l}</div><div style={{ fontFamily: FONTS.mono, fontSize: 14, color: T.text }}>{k.v}</div></div>
            ))}
          </div>
          <div style={{ fontFamily: FONTS.display, fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8 }}>Document Checklist</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
            {(jcr.documents || []).map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, background: d.present ? T.greenDim : T.redDim }}>
                <span style={{ color: d.present ? T.green : T.red, fontSize: 14 }}>{d.present ? '✓' : '✗'}</span>
                <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: d.present ? T.green : T.red }}>{d.type}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: '10px 14px', borderRadius: 8, background: jcr.allMandatoryPresent ? T.greenDim : T.redDim, marginBottom: 16 }}>
            <span style={{ fontFamily: FONTS.body, fontSize: 13, fontWeight: 600, color: jcr.allMandatoryPresent ? T.green : T.red }}>
              {jcr.allMandatoryPresent ? '✓ All mandatory documents present — JCR ready' : '✗ Missing mandatory documents — JCR blocked'}
            </span>
          </div>
          {jcr.timeline?.length > 0 && (<>
            <div style={{ fontFamily: FONTS.display, fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8 }}>Timeline ({jcr.timeline.length} events)</div>
            {jcr.timeline.slice(0, 20).map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '4px 0', borderBottom: `1px solid ${T.border}`, alignItems: 'center' }}>
                <Badge color={T.blue}>{e.event}</Badge>
                <span style={{ fontFamily: FONTS.body, fontSize: 11, color: T.text, flex: 1 }}>{e.desc}</span>
                <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim }}>{fmt(e.time)}</span>
              </div>
            ))}
          </>)}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>📊</span>
        <div>
          <div style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: 700, color: T.text }}>Reports & PDF Generation</div>
          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: T.textDim }}>27 report types • DSR / WSR / JCR • LSCM branded</div>
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
      {view === 'Reports' && <ReportsView />}
      {view === 'DSR' && <DSRView />}
      {view === 'WSR' && <WSRView />}
      {view === 'JCR' && <JCRView />}
    </div>
  );
}
