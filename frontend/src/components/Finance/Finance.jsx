import React, { useState, useEffect } from 'react';
import { T, FONTS } from '../../utils/theme';
import { api } from '../../utils/api';

const S = {
  card: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 },
  stat: (c) => ({ background: `${c}15`, border: `1px solid ${c}30`, borderRadius: 10, padding: 16, flex: 1, minWidth: 140 }),
  badge: (bg, c) => ({ background: bg, color: c, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontFamily: FONTS.mono, fontWeight: 600 }),
  btn: (bg) => ({ background: bg || T.gold, color: '#000', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONTS.body }),
  th: { padding: '10px 12px', textAlign: 'left', fontSize: 11, color: T.textDim, fontFamily: FONTS.mono, borderBottom: `1px solid ${T.border}`, textTransform: 'uppercase', letterSpacing: 0.5 },
  td: { padding: '10px 12px', fontSize: 13, fontFamily: FONTS.body, borderBottom: `1px solid ${T.border}`, color: T.text },
};

const fmt = (n, cur = 'USD') => {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
};

const statusBadge = (s) => {
  const m = { DRAFT: [T.textDim, `${T.textDim}20`], SENT: [T.blue, T.blueDim], PENDING: [T.orange, T.orangeDim], APPROVED: [T.green, T.greenDim], PAID: [T.teal, T.tealDim], OVERDUE: [T.red, T.redDim], DISPUTED: [T.pink, T.pinkDim], CANCELLED: [T.textDim, `${T.textDim}20`] };
  const [c, bg] = m[s] || [T.textDim, `${T.textDim}20`];
  return S.badge(bg, c);
};

export default function Finance() {
  const [view, setView] = useState('dashboard');
  const [dash, setDash] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [agentInvs, setAgentInvs] = useState([]);
  const [aging, setAging] = useState(null);
  const [byClient, setByClient] = useState([]);
  const [profitability, setProfitability] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [d, inv, agent] = await Promise.all([
        api.get('/finance/dashboard'),
        api.get('/finance/invoices'),
        api.get('/finance/agent-invoices'),
      ]);
      setDash(d); setInvoices(inv); setAgentInvs(agent);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadAging = async () => {
    try { const a = await api.get('/finance/aging'); setAging(a); } catch (e) { console.error(e); }
  };
  const loadByClient = async () => {
    try { const c = await api.get('/finance/revenue/by-client'); setByClient(c); } catch (e) { console.error(e); }
  };
  const loadProfitability = async () => {
    try { const p = await api.get('/finance/profitability'); setProfitability(p); } catch (e) { console.error(e); }
  };

  const switchView = (v) => {
    setView(v);
    if (v === 'aging' && !aging) loadAging();
    if (v === 'revenue' && byClient.length === 0) loadByClient();
    if (v === 'profitability' && profitability.length === 0) loadProfitability();
  };

  const transitionInvoice = async (id, status) => {
    try { await api.post(`/finance/invoices/${id}/transition`, { status }); loadAll(); }
    catch (e) { alert(e.message); }
  };

  if (loading) return <div style={{ color: T.textDim, fontFamily: FONTS.body, padding: 40 }}>Loading finance...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>◇</span>
          <div>
            <div style={{ fontFamily: FONTS.display, fontSize: 20, fontWeight: 700, color: T.text }}>Finance & Billing</div>
            <div style={{ fontFamily: FONTS.body, fontSize: 12, color: T.textDim }}>Invoices · Cost Sheets · Aging · Revenue Analytics · Profitability</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['dashboard','◉ Dashboard'],['invoices','⊞ Invoices AR'],['payables','⊟ Payables AP'],['aging','◔ Aging'],['revenue','◈ Revenue'],['profitability','◆ Profit']].map(([k,l]) => (
            <button key={k} onClick={() => switchView(k)} style={{ ...S.btn(view === k ? T.gold : T.surface), color: view === k ? '#000' : T.text, border: `1px solid ${view === k ? T.gold : T.border}`, fontSize: 11, padding: '6px 12px' }}>{l}</button>
          ))}
        </div>
      </div>

      {/* ═══ DASHBOARD ═══ */}
      {view === 'dashboard' && dash && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Revenue (Paid)', value: fmt(dash.totalRevenue), color: T.green },
              { label: 'Accounts Receivable', value: fmt(dash.accountsReceivable), sub: `${dash.invoiceCount} invoices`, color: T.blue },
              { label: 'Overdue AR', value: fmt(dash.overdueAR), color: dash.overdueAR > 0 ? T.red : T.green },
              { label: 'Accounts Payable', value: fmt(dash.accountsPayable), sub: `${dash.pendingAPCount} pending`, color: T.orange },
              { label: 'Gross Profit', value: fmt(dash.grossProfit), sub: `${dash.grossMarginPct}% margin`, color: dash.grossProfit >= 0 ? T.teal : T.red },
              { label: 'Collection Rate', value: `${dash.collectionRate}%`, sub: `${dash.paidCount}/${dash.invoiceCount}`, color: T.purple },
            ].map((kpi, i) => (
              <div key={i} style={S.stat(kpi.color)}>
                <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: kpi.color, textTransform: 'uppercase', marginBottom: 4 }}>{kpi.label}</div>
                <div style={{ fontFamily: FONTS.display, fontSize: 22, fontWeight: 700, color: T.text }}>{kpi.value}</div>
                {kpi.sub && <div style={{ fontFamily: FONTS.body, fontSize: 11, color: T.textDim }}>{kpi.sub}</div>}
              </div>
            ))}
          </div>

          {/* Recent Invoices */}
          {dash.recentInvoices?.length > 0 && (
            <div style={S.card}>
              <div style={{ fontFamily: FONTS.display, fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 12 }}>Recent Invoices</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Invoice #', 'Client', 'Date', 'Total', 'Status'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {dash.recentInvoices.map(inv => (
                    <tr key={inv.id}>
                      <td style={{ ...S.td, fontFamily: FONTS.mono, fontSize: 12 }}>{inv.invoiceNumber}</td>
                      <td style={S.td}>{inv.client?.name}</td>
                      <td style={{ ...S.td, fontSize: 12 }}>{new Date(inv.date).toLocaleDateString()}</td>
                      <td style={{ ...S.td, fontFamily: FONTS.mono, fontWeight: 700 }}>{fmt(inv.total, inv.currency)}</td>
                      <td style={S.td}><span style={statusBadge(inv.status)}>{inv.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ═══ INVOICES AR ═══ */}
      {view === 'invoices' && (
        <div style={S.card}>
          <div style={{ fontFamily: FONTS.display, fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 16 }}>
            LSCM Invoices — Accounts Receivable ({invoices.length})
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Invoice #', 'Client', 'Job', 'Date', 'Due', 'Subtotal', 'Total', 'Status', 'Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td style={{ ...S.td, fontFamily: FONTS.mono, fontSize: 12 }}>{inv.invoiceNumber}</td>
                  <td style={S.td}>{inv.client?.name}</td>
                  <td style={{ ...S.td, fontFamily: FONTS.mono, fontSize: 12 }}>{inv.job?.jobRef}</td>
                  <td style={{ ...S.td, fontSize: 12 }}>{new Date(inv.date).toLocaleDateString()}</td>
                  <td style={{ ...S.td, fontSize: 12 }}>{new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td style={{ ...S.td, fontFamily: FONTS.mono }}>{fmt(inv.subtotal, inv.currency)}</td>
                  <td style={{ ...S.td, fontFamily: FONTS.mono, fontWeight: 700 }}>{fmt(inv.total, inv.currency)}</td>
                  <td style={S.td}><span style={statusBadge(inv.status)}>{inv.status}</span></td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {inv.status === 'DRAFT' && <button onClick={() => transitionInvoice(inv.id, 'SENT')} style={{ ...S.btn(T.blueDim), color: T.blue, padding: '3px 8px', fontSize: 10 }}>Send</button>}
                      {inv.status === 'SENT' && <button onClick={() => transitionInvoice(inv.id, 'APPROVED')} style={{ ...S.btn(T.greenDim), color: T.green, padding: '3px 8px', fontSize: 10 }}>Approve</button>}
                      {(inv.status === 'APPROVED' || inv.status === 'OVERDUE') && <button onClick={() => transitionInvoice(inv.id, 'PAID')} style={{ ...S.btn(T.tealDim), color: T.teal, padding: '3px 8px', fontSize: 10 }}>Mark Paid</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoices.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: T.textDim }}>No invoices yet</div>}
        </div>
      )}

      {/* ═══ PAYABLES AP ═══ */}
      {view === 'payables' && (
        <div style={S.card}>
          <div style={{ fontFamily: FONTS.display, fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 16 }}>
            Agent Invoices — Accounts Payable ({agentInvs.length})
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Agent', 'Ref', 'Job', 'Category', 'Date', 'Amount', 'Status', 'Approved By'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {agentInvs.map(inv => (
                <tr key={inv.id}>
                  <td style={S.td}>{inv.agentName}</td>
                  <td style={{ ...S.td, fontFamily: FONTS.mono, fontSize: 12 }}>{inv.invoiceRef}</td>
                  <td style={{ ...S.td, fontFamily: FONTS.mono, fontSize: 12 }}>{inv.job?.jobRef}</td>
                  <td style={S.td}><span style={S.badge(T.blueDim, T.blue)}>{inv.category}</span></td>
                  <td style={{ ...S.td, fontSize: 12 }}>{new Date(inv.date).toLocaleDateString()}</td>
                  <td style={{ ...S.td, fontFamily: FONTS.mono, fontWeight: 700 }}>{fmt(inv.amount, inv.currency)}</td>
                  <td style={S.td}><span style={statusBadge(inv.status)}>{inv.status}</span></td>
                  <td style={{ ...S.td, fontSize: 12 }}>{inv.approvedBy || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {agentInvs.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: T.textDim }}>No agent invoices yet</div>}
        </div>
      )}

      {/* ═══ AGING ═══ */}
      {view === 'aging' && aging && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Current', value: fmt(aging.totals.current), count: aging.buckets.current.length, color: T.green },
              { label: '1-30 Days', value: fmt(aging.totals.days30), count: aging.buckets.days30.length, color: T.blue },
              { label: '31-60 Days', value: fmt(aging.totals.days60), count: aging.buckets.days60.length, color: T.orange },
              { label: '61-90 Days', value: fmt(aging.totals.days90), count: aging.buckets.days90.length, color: T.red },
              { label: '90+ Days', value: fmt(aging.totals.over90), count: aging.buckets.over90.length, color: T.pink },
            ].map((b, i) => (
              <div key={i} style={S.stat(b.color)}>
                <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: b.color, textTransform: 'uppercase' }}>{b.label}</div>
                <div style={{ fontFamily: FONTS.display, fontSize: 22, fontWeight: 700, color: T.text }}>{b.value}</div>
                <div style={{ fontFamily: FONTS.body, fontSize: 11, color: T.textDim }}>{b.count} invoices</div>
              </div>
            ))}
          </div>
          <div style={{ ...S.card }}>
            <div style={{ fontFamily: FONTS.display, fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4 }}>
              Total Outstanding: {fmt(aging.totalOutstanding)} ({aging.invoiceCount} invoices)
            </div>
            {/* Show overdue items */}
            {[...aging.buckets.days30, ...aging.buckets.days60, ...aging.buckets.days90, ...aging.buckets.over90].length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
                <thead><tr>{['Invoice', 'Client', 'Amount', 'Due Date', 'Days Overdue', 'Status'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {[...aging.buckets.days30, ...aging.buckets.days60, ...aging.buckets.days90, ...aging.buckets.over90]
                    .sort((a, b) => b.daysOverdue - a.daysOverdue)
                    .map(inv => (
                    <tr key={inv.id}>
                      <td style={{ ...S.td, fontFamily: FONTS.mono, fontSize: 12 }}>{inv.invoiceNumber}</td>
                      <td style={S.td}>{inv.clientName}</td>
                      <td style={{ ...S.td, fontFamily: FONTS.mono, fontWeight: 700 }}>{fmt(inv.total, inv.currency)}</td>
                      <td style={{ ...S.td, fontSize: 12 }}>{new Date(inv.dueDate).toLocaleDateString()}</td>
                      <td style={{ ...S.td, color: inv.daysOverdue > 60 ? T.red : T.orange, fontWeight: 700 }}>{inv.daysOverdue}d</td>
                      <td style={S.td}><span style={statusBadge(inv.status)}>{inv.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
      {view === 'aging' && !aging && <div style={{ color: T.textDim, padding: 40 }}>Loading aging report...</div>}

      {/* ═══ REVENUE BY CLIENT ═══ */}
      {view === 'revenue' && (
        <div style={S.card}>
          <div style={{ fontFamily: FONTS.display, fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 16 }}>Revenue by Client</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Client', 'Revenue', 'Invoices', 'Paid', 'Collection Rate'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {byClient.map((c, i) => (
                <tr key={i}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{c.name}</td>
                  <td style={{ ...S.td, fontFamily: FONTS.mono, fontWeight: 700, color: T.green }}>{fmt(c.revenue)}</td>
                  <td style={S.td}>{c.invoices}</td>
                  <td style={{ ...S.td, fontFamily: FONTS.mono }}>{fmt(c.paid)}</td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ height: 6, background: T.border, borderRadius: 3, flex: 1, maxWidth: 100 }}>
                        <div style={{ height: 6, background: c.collectionRate >= 80 ? T.green : c.collectionRate >= 50 ? T.orange : T.red, borderRadius: 3, width: `${c.collectionRate}%` }} />
                      </div>
                      <span style={{ fontFamily: FONTS.mono, fontSize: 12 }}>{c.collectionRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {byClient.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: T.textDim }}>No revenue data yet</div>}
        </div>
      )}

      {/* ═══ PROFITABILITY ═══ */}
      {view === 'profitability' && (
        <div style={S.card}>
          <div style={{ fontFamily: FONTS.display, fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 16 }}>Job Profitability Report</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Job Ref', 'Client', 'Corridor', 'Revenue', 'Costs', 'Profit', 'Margin %'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {profitability.map((j, i) => (
                <tr key={i}>
                  <td style={{ ...S.td, fontFamily: FONTS.mono, fontSize: 12 }}>{j.jobRef}</td>
                  <td style={S.td}>{j.client}</td>
                  <td style={{ ...S.td, fontSize: 12 }}>{j.corridor || '—'}</td>
                  <td style={{ ...S.td, fontFamily: FONTS.mono, color: T.green }}>{fmt(j.revenue)}</td>
                  <td style={{ ...S.td, fontFamily: FONTS.mono, color: T.red }}>{fmt(j.costs)}</td>
                  <td style={{ ...S.td, fontFamily: FONTS.mono, fontWeight: 700, color: j.profit >= 0 ? T.teal : T.red }}>{fmt(j.profit)}</td>
                  <td style={S.td}>
                    <span style={S.badge(j.margin >= 20 ? T.greenDim : j.margin >= 0 ? T.orangeDim : T.redDim, j.margin >= 20 ? T.green : j.margin >= 0 ? T.orange : T.red)}>
                      {j.margin.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {profitability.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: T.textDim }}>No completed jobs with cost data yet</div>}
        </div>
      )}
    </div>
  );
}
