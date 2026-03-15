import React from 'react';
import { T, FONTS } from '../../utils/theme';
import { EmptyState } from '../Layout/PageShell';
import { api } from '../../utils/api';

const card = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 };
const VIEWS = ['Certifications', 'Renewals', 'Expiring'];
const CS = { ACTIVE: T.green, EXPIRING_SOON: T.orange, EXPIRED: T.red, SUSPENDED: T.red, RENEWED: T.teal };
const RS = { IN_PROGRESS: T.gold, NOT_STARTED: T.textDim, COMPLETED: T.green, OVERDUE: T.red };

export default function Compliance() {
  const [view, setView] = React.useState('Certifications');
  const [certs, setCerts] = React.useState(null);
  const [expiring, setExpiring] = React.useState(null);
  const [renewals, setRenewals] = React.useState(null);
  const [detail, setDetail] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [expiryDays, setExpiryDays] = React.useState(90);
  const [showAuditForm, setShowAuditForm] = React.useState(false);
  const [auditForm, setAuditForm] = React.useState({ certId: '', auditType: 'INTERNAL', auditor: '', date: '', outcome: 'PASS' });

  React.useEffect(() => { loadData(); }, [view, expiryDays]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (view === 'Certifications') setCerts(await api.get('/compliance/certifications'));
      if (view === 'Expiring') setExpiring(await api.get(`/compliance/certifications/expiring?days=${expiryDays}`));
      if (view === 'Renewals') setRenewals(await api.get('/compliance/renewals/active'));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadDetail = async (id) => {
    try { setDetail(await api.get(`/compliance/certifications/${id}`)); } catch (e) { console.error(e); }
  };

  const runNightlyCheck = async () => {
    try {
      const r = await api.post('/compliance/renewals/check', {});
      alert(`Checked ${r.checked} certs. Created ${r.renewalsCreated} renewal(s).${r.details?.length ? '\n' + r.details.join('\n') : ''}`);
      loadData();
    } catch (e) { alert(e.message); }
  };

  const submitAudit = async () => {
    if (!auditForm.certId || !auditForm.auditor || !auditForm.date) return alert('Fill required fields');
    try {
      await api.post('/compliance/audits', { ...auditForm, date: new Date(auditForm.date).toISOString(), findingsCount: 0 });
      setShowAuditForm(false); loadData();
    } catch (e) { alert(e.message); }
  };

  const dLeft = (d) => Math.round((new Date(d).getTime() - Date.now()) / 86400000);
  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const Badge = ({ color, children }) => <span style={{ background: color + '20', color, padding: '2px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, fontFamily: FONTS.mono }}>{children}</span>;

  const CertsView = () => {
    if (!certs) return <EmptyState icon="◑" title="Loading..." sub="" />;
    if (!certs.length) return <EmptyState icon="◑" title="No Certifications" sub="Add via seed data" />;
    const byStatus = {};
    certs.forEach(c => { byStatus[c.status] = (byStatus[c.status] || 0) + 1; });
    return (<>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 16 }}>
        {Object.entries(CS).map(([st, col]) => (
          <div key={st} style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontFamily: FONTS.display, fontSize: 22, fontWeight: 700, color: col }}>{byStatus[st] || 0}</div>
            <div style={{ fontFamily: FONTS.body, fontSize: 11, color: T.textDim }}>{st.replace('_', ' ')}</div>
          </div>
        ))}
      </div>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: 600, color: T.text }}>Certification Calendar ({certs.length})</div>
          <button onClick={() => setShowAuditForm(true)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: T.gold, color: '#000', fontFamily: FONTS.body, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Record Audit</button>
        </div>
        {certs.map((c, i) => {
          const d = dLeft(c.expiryDate);
          return (
            <div key={i} onClick={() => loadDetail(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${T.border}`, cursor: 'pointer' }}>
              <Badge color={CS[c.status] || T.textDim}>{c.status}</Badge>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONTS.body, fontSize: 13, color: T.text, fontWeight: 600 }}>{c.certType} — {c.scope}</div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim }}>{c.issuer} | #{c.certNumber} | {c.office?.name || '—'}</div>
              </div>
              <div style={{ textAlign: 'right', minWidth: 110 }}>
                <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: d <= 30 ? T.red : d <= 90 ? T.orange : T.green }}>{d > 0 ? `${d}d left` : `${Math.abs(d)}d overdue`}</div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim }}>Exp: {fmt(c.expiryDate)}</div>
              </div>
              {c.renewalInstances?.length > 0 && <Badge color={T.gold}>RENEWAL</Badge>}
            </div>
          );
        })}
      </div>
      {detail && (
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontFamily: FONTS.display, fontSize: 16, fontWeight: 700, color: T.text }}>{detail.certType} — {detail.scope}</div>
            <button onClick={() => setDetail(null)} style={{ background: 'transparent', border: 'none', color: T.textDim, cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 16 }}>
            {[{ l: 'Issuer', v: detail.issuer }, { l: 'Cert #', v: detail.certNumber }, { l: 'Issued', v: fmt(detail.issueDate) }, { l: 'Expires', v: fmt(detail.expiryDate) },
              { l: 'Last Audit', v: fmt(detail.lastAuditDate) }, { l: 'Next Audit', v: fmt(detail.nextAuditDate) }, { l: 'Status', v: detail.status }, { l: 'Office', v: detail.office?.name || '—' }
            ].map((f, j) => <div key={j}><div style={{ fontFamily: FONTS.body, fontSize: 10, color: T.textDim }}>{f.l}</div><div style={{ fontFamily: FONTS.mono, fontSize: 13, color: T.text }}>{f.v}</div></div>)}
          </div>
          {detail.audits?.length > 0 && (<>
            <div style={{ fontFamily: FONTS.display, fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8 }}>Audit History</div>
            {detail.audits.map((a, j) => (
              <div key={j} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: `1px solid ${T.border}`, alignItems: 'center', flexWrap: 'wrap' }}>
                <Badge color={a.outcome === 'PASS' ? T.green : a.outcome === 'FAIL' ? T.red : T.orange}>{a.outcome}</Badge>
                <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: T.text }}>{a.auditType}</span>
                <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: T.textDim }}>by {a.auditor} on {fmt(a.date)}</span>
                <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: T.textDim }}>{a.findingsCount} findings</span>
              </div>
            ))}
          </>)}
          {detail.renewalInstances?.length > 0 && (<>
            <div style={{ fontFamily: FONTS.display, fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8, marginTop: 12 }}>Active Renewals</div>
            {detail.renewalInstances.map((ri, j) => (
              <div key={j} style={{ padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Badge color={RS[ri.status] || T.textDim}>{ri.status}</Badge>
                  <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: T.text }}>Step {ri.currentStep}/{ri.totalSteps}</span>
                  <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: T.textDim }}>Target: {fmt(ri.targetExpiryDate)}</span>
                </div>
                {(ri.tasks || []).map((t, k) => (
                  <div key={k} style={{ display: 'flex', gap: 8, marginLeft: 24, marginTop: 4, alignItems: 'center' }}>
                    <Badge color={t.status === 'DONE' ? T.green : t.status === 'BLOCKED' ? T.red : T.gold}>{t.status}</Badge>
                    <span style={{ fontFamily: FONTS.body, fontSize: 11, color: T.text }}>{t.title}</span>
                    <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim }}>Due: {fmt(t.dueDate)}</span>
                  </div>
                ))}
              </div>
            ))}
          </>)}
        </div>
      )}
    </>);
  };

  const RenewalsView = () => {
    if (!renewals) return <EmptyState icon="🔄" title="Loading..." sub="" />;
    return (<>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={runNightlyCheck} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: T.gold, color: '#000', fontFamily: FONTS.body, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Run Renewal Check</button>
      </div>
      {!renewals.length ? <EmptyState icon="✓" title="No Active Renewals" sub="Run the renewal check or wait for nightly trigger" /> :
        renewals.map((ri, i) => (
          <div key={i} style={{ ...card, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Badge color={RS[ri.status] || T.textDim}>{ri.status}</Badge>
              <div style={{ fontFamily: FONTS.body, fontSize: 14, fontWeight: 600, color: T.text }}>{ri.certification?.certType} — {ri.certification?.scope}</div>
              <div style={{ flex: 1 }} />
              <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: T.textDim }}>{ri.certification?.office?.name || ''}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 10 }}>
              <div><div style={{ fontFamily: FONTS.body, fontSize: 10, color: T.textDim }}>Progress</div><div style={{ fontFamily: FONTS.mono, fontSize: 14, color: T.gold }}>Step {ri.currentStep}/{ri.totalSteps}</div></div>
              <div><div style={{ fontFamily: FONTS.body, fontSize: 10, color: T.textDim }}>Started</div><div style={{ fontFamily: FONTS.mono, fontSize: 12, color: T.text }}>{fmt(ri.processStartDate)}</div></div>
              <div><div style={{ fontFamily: FONTS.body, fontSize: 10, color: T.textDim }}>Target Expiry</div><div style={{ fontFamily: FONTS.mono, fontSize: 12, color: T.orange }}>{fmt(ri.targetExpiryDate)}</div></div>
              <div><div style={{ fontFamily: FONTS.body, fontSize: 10, color: T.textDim }}>Template</div><div style={{ fontFamily: FONTS.mono, fontSize: 12, color: T.text }}>{ri.template?.certType || '—'}</div></div>
            </div>
            <div style={{ width: '100%', height: 6, background: T.bg, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${ri.totalSteps > 0 ? (ri.currentStep / ri.totalSteps) * 100 : 0}%`, height: '100%', background: T.gold, borderRadius: 3 }} />
            </div>
            {(ri.tasks || []).length > 0 && <div style={{ marginTop: 10 }}>
              {ri.tasks.map((t, j) => (
                <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0' }}>
                  <Badge color={t.status === 'DONE' ? T.green : t.status === 'BLOCKED' ? T.red : T.gold}>{t.status}</Badge>
                  <span style={{ fontFamily: FONTS.body, fontSize: 12, color: T.text, flex: 1 }}>{t.title}</span>
                  <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim }}>{fmt(t.dueDate)}</span>
                </div>
              ))}
            </div>}
          </div>
        ))}
    </>);
  };

  const ExpiringView = () => {
    if (!expiring) return <EmptyState icon="⏰" title="Loading..." sub="" />;
    return (<>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[30, 60, 90, 180].map(d => (
          <button key={d} onClick={() => setExpiryDays(d)}
            style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${expiryDays === d ? T.gold : T.border}`, background: expiryDays === d ? T.goldDim : 'transparent', color: expiryDays === d ? T.gold : T.textDim, fontFamily: FONTS.body, fontSize: 12, cursor: 'pointer' }}>
            {d} days
          </button>
        ))}
      </div>
      {!expiring.length ? <EmptyState icon="✓" title="None Expiring" sub={`No certs expiring within ${expiryDays} days`} /> :
        <div style={card}>
          {expiring.map((c, i) => {
            const dl = dLeft(c.expiryDate);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', border: `3px solid ${dl <= 30 ? T.red : dl <= 60 ? T.orange : T.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: FONTS.mono, fontSize: 13, fontWeight: 700, color: dl <= 30 ? T.red : dl <= 60 ? T.orange : T.gold }}>{dl}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FONTS.body, fontSize: 13, color: T.text, fontWeight: 600 }}>{c.certType} — {c.scope}</div>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim }}>{c.issuer} | #{c.certNumber} | {c.office?.name || '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: dl <= 30 ? T.red : T.orange }}>{fmt(c.expiryDate)}</div>
                  {c.renewalInstances?.length > 0 ? <Badge color={T.green}>RENEWAL ACTIVE</Badge> : <Badge color={T.red}>NO RENEWAL</Badge>}
                </div>
              </div>
            );
          })}
        </div>
      }
    </>);
  };

  const AuditModal = () => showAuditForm ? (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowAuditForm(false)}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.surface, borderRadius: 16, padding: 24, width: 450, border: `1px solid ${T.border}` }}>
        <div style={{ fontFamily: FONTS.display, fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 16 }}>Record Audit</div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontFamily: FONTS.body, fontSize: 11, color: T.textDim, marginBottom: 4 }}>Certification</div>
          <select value={auditForm.certId} onChange={e => setAuditForm({ ...auditForm, certId: e.target.value })}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontFamily: FONTS.body, fontSize: 13, boxSizing: 'border-box' }}>
            <option value="">Select...</option>
            {(certs || []).map(c => <option key={c.id} value={c.id}>{c.certType} — {c.certNumber}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontFamily: FONTS.body, fontSize: 11, color: T.textDim, marginBottom: 4 }}>Auditor Name</div>
          <input value={auditForm.auditor} onChange={e => setAuditForm({ ...auditForm, auditor: e.target.value })}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontFamily: FONTS.body, fontSize: 13, boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontFamily: FONTS.body, fontSize: 11, color: T.textDim, marginBottom: 4 }}>Date</div>
          <input type="date" value={auditForm.date} onChange={e => setAuditForm({ ...auditForm, date: e.target.value })}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontFamily: FONTS.body, fontSize: 13, boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {['INTERNAL', 'EXTERNAL', 'SURVEILLANCE'].map(t => (
            <button key={t} onClick={() => setAuditForm({ ...auditForm, auditType: t })}
              style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${auditForm.auditType === t ? T.gold : T.border}`, background: auditForm.auditType === t ? T.goldDim : 'transparent', color: auditForm.auditType === t ? T.gold : T.textDim, fontFamily: FONTS.body, fontSize: 11, cursor: 'pointer' }}>{t}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['PASS', 'CONDITIONAL', 'FAIL'].map(o => {
            const oc = o === 'PASS' ? T.green : o === 'FAIL' ? T.red : T.orange;
            return (
              <button key={o} onClick={() => setAuditForm({ ...auditForm, outcome: o })}
                style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${auditForm.outcome === o ? oc : T.border}`, background: auditForm.outcome === o ? oc + '20' : 'transparent', color: auditForm.outcome === o ? oc : T.textDim, fontFamily: FONTS.body, fontSize: 11, cursor: 'pointer' }}>{o}</button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => setShowAuditForm(false)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'transparent', color: T.textDim, fontFamily: FONTS.body, cursor: 'pointer' }}>Cancel</button>
          <button onClick={submitAudit} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: T.gold, color: '#000', fontFamily: FONTS.body, fontWeight: 600, cursor: 'pointer' }}>Save Audit</button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>◑</span>
        <div>
          <div style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: 700, color: T.text }}>Compliance & Certifications</div>
          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: T.textDim }}>Cert calendar • Renewal engine • Expiry alerts • Audit tracker</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {VIEWS.map(v => (
          <button key={v} onClick={() => { setView(v); setDetail(null); }}
            style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${view === v ? T.gold : T.border}`, background: view === v ? T.goldDim : 'transparent', color: view === v ? T.gold : T.textDim, fontFamily: FONTS.body, fontSize: 12, fontWeight: view === v ? 600 : 400, cursor: 'pointer' }}>
            {v}
          </button>
        ))}
      </div>
      {view === 'Certifications' && <CertsView />}
      {view === 'Renewals' && <RenewalsView />}
      {view === 'Expiring' && <ExpiringView />}
      <AuditModal />
    </div>
  );
}
