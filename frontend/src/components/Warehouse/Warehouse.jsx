import React, { useState, useEffect } from 'react';
import { T, FONTS } from '../../utils/theme';
import { api } from '../../utils/api';

const S = {
  card: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 },
  stat: (color) => ({ background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 10, padding: 16, flex: 1, minWidth: 140 }),
  badge: (bg, color) => ({ background: bg, color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontFamily: FONTS.mono, fontWeight: 600 }),
  btn: (bg) => ({ background: bg || T.gold, color: '#000', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONTS.body }),
  th: { padding: '10px 12px', textAlign: 'left', fontSize: 11, color: T.textDim, fontFamily: FONTS.mono, borderBottom: `1px solid ${T.border}`, textTransform: 'uppercase', letterSpacing: 0.5 },
  td: { padding: '10px 12px', fontSize: 13, fontFamily: FONTS.body, borderBottom: `1px solid ${T.border}`, color: T.text },
  barBg: { height: 8, background: T.border, borderRadius: 4, flex: 1 },
};

const scoreBadge = (score) => {
  if (score >= 800) return S.badge(T.redDim, T.red);
  if (score >= 500) return S.badge(T.orangeDim, T.orange);
  if (score >= 300) return S.badge(T.blueDim, T.blue);
  return S.badge(`${T.textDim}20`, T.textDim);
};

const utilizationColor = (pct) => pct >= 90 ? T.red : pct >= 70 ? T.orange : pct >= 40 ? T.blue : T.green;

export default function Warehouse() {
  const [hubs, setHubs] = useState([]);
  const [selectedHub, setSelectedHub] = useState(null);
  const [hubDetail, setHubDetail] = useState(null);
  const [capacity, setCapacity] = useState(null);
  const [stock, setStock] = useState([]);
  const [queues, setQueues] = useState([]);
  const [summary, setSummary] = useState(null);
  const [view, setView] = useState('overview'); // overview | stock | queue | movements
  const [loading, setLoading] = useState(true);
  const [movementLog, setMovementLog] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => { loadHubs(); }, []);
  useEffect(() => { if (selectedHub) loadHubData(selectedHub); }, [selectedHub]);

  const loadHubs = async () => {
    try { const data = await api.get('/hubs'); setHubs(data); if (data.length > 0) setSelectedHub(data[0].id); }
    catch (e) { console.error('Failed to load hubs', e); }
    finally { setLoading(false); }
  };

  const loadHubData = async (hubId) => {
    try {
      const [detail, cap, stk, q, sum] = await Promise.all([
        api.get(`/hubs/${hubId}`),
        api.get(`/hubs/${hubId}/capacity`),
        api.get(`/stock?hubId=${hubId}`),
        api.get(`/queue?hubId=${hubId}`).catch(() => []),
        api.get(`/stock/summary?hubId=${hubId}`).catch(() => null),
      ]);
      setHubDetail(detail); setCapacity(cap); setStock(stk); setQueues(q); setSummary(sum);
    } catch (e) { console.error('Failed to load hub data', e); }
  };

  const loadMovements = async (stockId) => {
    try { const data = await api.get(`/stock/${stockId}/movements`); setMovementLog(data); setSelectedItem(stockId); setView('movements'); }
    catch (e) { console.error(e); }
  };

  const dispatchItem = async (stockId) => {
    if (!confirm('Dispatch this item?')) return;
    try { await api.post(`/stock/${stockId}/dispatch`, {}); loadHubData(selectedHub); }
    catch (e) { alert(e.message); }
  };

  const recalcQueue = async (queueId) => {
    try { await api.post(`/queue/${queueId}/recalculate`, {}); loadHubData(selectedHub); }
    catch (e) { alert(e.message); }
  };

  if (loading) return <div style={{ color: T.textDim, fontFamily: FONTS.body, padding: 40 }}>Loading hubs...</div>;

  const hub = hubs.find(h => h.id === selectedHub);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>▣</span>
          <div>
            <div style={{ fontFamily: FONTS.display, fontSize: 20, fontWeight: 700, color: T.text }}>Warehouse & FIFO</div>
            <div style={{ fontFamily: FONTS.body, fontSize: 12, color: T.textDim }}>Stock Management · FIFO Queue (0-1000) · Capacity Dashboard</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['overview', 'stock', 'queue'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{ ...S.btn(view === v ? T.gold : T.surface), color: view === v ? '#000' : T.text, border: `1px solid ${view === v ? T.gold : T.border}` }}>
              {v === 'overview' ? '◉ Overview' : v === 'stock' ? '◫ Stock' : '⇅ FIFO Queue'}
            </button>
          ))}
        </div>
      </div>

      {/* Hub Selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {hubs.map(h => (
          <button key={h.id} onClick={() => setSelectedHub(h.id)} style={{
            background: selectedHub === h.id ? T.gold : T.surface, color: selectedHub === h.id ? '#000' : T.text,
            border: `1px solid ${selectedHub === h.id ? T.gold : T.border}`, borderRadius: 8, padding: '8px 16px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONTS.body,
          }}>
            {h.code} — {h.name}
            {h._count && <span style={{ marginLeft: 6, opacity: 0.6 }}>({h._count.stockItems})</span>}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW ═══ */}
      {view === 'overview' && capacity && (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Total CBM', value: capacity.totalCbm, sub: `${capacity.availableCbm} available`, color: T.blue },
              { label: 'Utilization', value: `${capacity.utilizationPct}%`, sub: `${capacity.occupiedCbm} / ${capacity.totalCbm} CBM`, color: utilizationColor(capacity.utilizationPct) },
              { label: 'Items in Stock', value: capacity.totalItems, sub: `${capacity.totalPackages} packages`, color: T.green },
              { label: 'Weight (kg)', value: capacity.totalWeightKg?.toLocaleString(), sub: `${capacity.totalItems} items`, color: T.purple },
              { label: 'Overdue', value: capacity.overdueCount, sub: 'Past free time', color: capacity.overdueCount > 0 ? T.red : T.green },
            ].map((kpi, i) => (
              <div key={i} style={S.stat(kpi.color)}>
                <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: kpi.color, marginBottom: 4, textTransform: 'uppercase' }}>{kpi.label}</div>
                <div style={{ fontFamily: FONTS.display, fontSize: 24, fontWeight: 700, color: T.text }}>{kpi.value}</div>
                <div style={{ fontFamily: FONTS.body, fontSize: 11, color: T.textDim }}>{kpi.sub}</div>
              </div>
            ))}
          </div>

          {/* Zone Capacity Bars */}
          <div style={S.card}>
            <div style={{ fontFamily: FONTS.display, fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 16 }}>Zone Capacity</div>
            {capacity.zones?.map(z => {
              const color = utilizationColor(z.utilizationPct);
              return (
                <div key={z.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontFamily: FONTS.body, fontSize: 13, color: T.text }}>{z.code} — {z.name} <span style={{ ...S.badge(`${color}20`, color) }}>{z.type}</span></span>
                    <span style={{ fontFamily: FONTS.mono, fontSize: 12, color }}>{z.utilizationPct}% · {z.occupiedCbm}/{z.capacityCbm} CBM</span>
                  </div>
                  <div style={S.barBg}>
                    <div style={{ height: 8, background: color, borderRadius: 4, width: `${z.utilizationPct}%`, transition: 'width 0.3s' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary by Client */}
          {summary?.byClient && (
            <div style={{ ...S.card, marginTop: 16 }}>
              <div style={{ fontFamily: FONTS.display, fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 12 }}>Stock by Client</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Client', 'Items', 'CBM', 'Weight (kg)'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {Object.entries(summary.byClient).map(([name, data]) => (
                    <tr key={name}>
                      <td style={S.td}>{name}</td>
                      <td style={S.td}>{data.count}</td>
                      <td style={S.td}>{data.cbm.toFixed(1)}</td>
                      <td style={S.td}>{data.weightKg.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Overdue Alerts */}
          {capacity.overdueCount > 0 && (
            <div style={{ ...S.card, marginTop: 16, borderColor: `${T.red}40` }}>
              <div style={{ fontFamily: FONTS.display, fontSize: 15, fontWeight: 700, color: T.red, marginBottom: 12 }}>⚠ Overdue Items ({capacity.overdueCount})</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['SM Ref', 'Job', 'Client', 'Days', 'Free Time', 'Excess'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {capacity.overdueItems?.slice(0, 10).map(item => (
                    <tr key={item.id}>
                      <td style={S.td}><span style={{ fontFamily: FONTS.mono }}>{item.smRef}</span></td>
                      <td style={S.td}>{item.jobRef}</td>
                      <td style={S.td}>{item.clientName}</td>
                      <td style={S.td}>{item.daysInStock}d</td>
                      <td style={S.td}>{item.freeTimeDays}d</td>
                      <td style={{ ...S.td, color: T.red, fontWeight: 700 }}>+{item.excessDays}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ═══ STOCK VIEW ═══ */}
      {view === 'stock' && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontFamily: FONTS.display, fontSize: 15, fontWeight: 700, color: T.text }}>
              Stock Items ({stock.length})
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['SM Ref', 'Job', 'Client', 'Zone', 'CBM', 'Wt (kg)', 'Pkg', 'Days', 'Free Time', 'FIFO Score', 'Status', 'Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {stock.map(item => (
                <tr key={item.id} style={{ ':hover': { background: T.surfaceHover } }}>
                  <td style={{ ...S.td, fontFamily: FONTS.mono, fontSize: 12 }}>{item.smRef}</td>
                  <td style={S.td}>{item.jobRef}</td>
                  <td style={S.td}>{item.clientName}</td>
                  <td style={S.td}><span style={S.badge(T.blueDim, T.blue)}>{item.zone?.code || '—'}</span></td>
                  <td style={{ ...S.td, fontFamily: FONTS.mono }}>{item.cbm}</td>
                  <td style={{ ...S.td, fontFamily: FONTS.mono }}>{item.weightKg}</td>
                  <td style={S.td}>{item.packages}</td>
                  <td style={{ ...S.td, color: item.isOverdue ? T.red : T.text, fontWeight: item.isOverdue ? 700 : 400 }}>
                    {item.daysInStock}d {item.isOverdue && `(+${item.excessDays})`}
                  </td>
                  <td style={S.td}>{item.freeTimeRemaining}d left</td>
                  <td style={S.td}><span style={scoreBadge(item.fifoScore)}>{item.fifoScore}</span></td>
                  <td style={S.td}><span style={S.badge(item.status === 'RECEIVED' ? T.greenDim : T.orangeDim, item.status === 'RECEIVED' ? T.green : T.orange)}>{item.status}</span></td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => loadMovements(item.id)} style={{ ...S.btn(T.blueDim), color: T.blue, padding: '4px 8px', fontSize: 11 }}>History</button>
                      <button onClick={() => dispatchItem(item.id)} style={{ ...S.btn(T.orangeDim), color: T.orange, padding: '4px 8px', fontSize: 11 }}>Dispatch</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {stock.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: T.textDim, fontFamily: FONTS.body }}>No stock items at this hub</div>}
        </div>
      )}

      {/* ═══ FIFO QUEUE VIEW ═══ */}
      {view === 'queue' && (
        <div>
          {queues.length === 0 && (
            <div style={{ ...S.card, textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⇅</div>
              <div style={{ fontFamily: FONTS.display, fontSize: 16, color: T.text, marginBottom: 4 }}>No Open Queues</div>
              <div style={{ fontFamily: FONTS.body, fontSize: 13, color: T.textDim }}>Loading queues will appear when items are queued for consolidation</div>
            </div>
          )}
          {queues.map(queue => (
            <div key={queue.id} style={{ ...S.card, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: FONTS.display, fontSize: 15, fontWeight: 700, color: T.text }}>
                    {queue.corridor?.originCountry} → {queue.corridor?.destCountry} <span style={S.badge(T.goldDim, T.gold)}>{queue.mode}</span>
                  </div>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: T.textDim, marginTop: 4 }}>
                    {queue.positions?.length || 0} items · {queue.totalWeightKg?.toFixed(0) || 0} kg · {queue.totalCbm?.toFixed(1) || 0} CBM
                    {queue.lastRecalculated && ` · Last calc: ${new Date(queue.lastRecalculated).toLocaleString()}`}
                  </div>
                </div>
                <button onClick={() => recalcQueue(queue.id)} style={S.btn(T.gold)}>⟳ Recalculate FIFO</button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['Rank', 'SM Ref', 'Client', 'Days', 'Free Time', 'FIFO Score', 'Score Breakdown', 'Override', 'Status'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {queue.positions?.map((pos, i) => (
                    <tr key={pos.id}>
                      <td style={{ ...S.td, fontFamily: FONTS.display, fontSize: 16, fontWeight: 700, color: T.gold }}>#{pos.rank}</td>
                      <td style={{ ...S.td, fontFamily: FONTS.mono }}>{pos.stockItem?.smRef}</td>
                      <td style={S.td}>{pos.stockItem?.clientName}</td>
                      <td style={{ ...S.td, color: pos.isOverdue ? T.red : T.text }}>{pos.daysInStock}d</td>
                      <td style={S.td}>{pos.freeTimeRemaining}d left</td>
                      <td style={S.td}><span style={scoreBadge(pos.priorityScore)}>{pos.priorityScore}/1000</span></td>
                      <td style={S.td}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {pos.breakdown && Object.entries(pos.breakdown).map(([k, v]) => (
                            <span key={k} style={{ ...S.badge(`${T.textDim}20`, T.textDim), fontSize: 10 }}>{k.slice(0, 3).toUpperCase()}: {v}</span>
                          ))}
                        </div>
                      </td>
                      <td style={S.td}>
                        {pos.priorityOverride && pos.priorityOverride !== 'NONE'
                          ? <span style={S.badge(T.redDim, T.red)}>{pos.priorityOverride}</span>
                          : <span style={{ color: T.textDim, fontSize: 11 }}>—</span>}
                      </td>
                      <td style={S.td}><span style={S.badge(pos.status === 'QUEUED' ? T.blueDim : T.greenDim, pos.status === 'QUEUED' ? T.blue : T.green)}>{pos.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* ═══ MOVEMENTS VIEW ═══ */}
      {view === 'movements' && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontFamily: FONTS.display, fontSize: 15, fontWeight: 700, color: T.text }}>Movement History</div>
            <button onClick={() => setView('stock')} style={{ ...S.btn(T.surface), color: T.text, border: `1px solid ${T.border}` }}>← Back to Stock</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Date', 'Type', 'From Zone', 'To Zone', 'Notes'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {movementLog.map(m => (
                <tr key={m.id}>
                  <td style={{ ...S.td, fontFamily: FONTS.mono, fontSize: 12 }}>{new Date(m.timestamp).toLocaleString()}</td>
                  <td style={S.td}><span style={S.badge(
                    m.type === 'INBOUND_RECEPTION' ? T.greenDim : m.type === 'OUTBOUND_DISPATCH' ? T.orangeDim : T.blueDim,
                    m.type === 'INBOUND_RECEPTION' ? T.green : m.type === 'OUTBOUND_DISPATCH' ? T.orange : T.blue
                  )}>{m.type.replace(/_/g, ' ')}</span></td>
                  <td style={S.td}>{m.fromZone || '—'}</td>
                  <td style={S.td}>{m.toZone || '—'}</td>
                  <td style={{ ...S.td, color: T.textDim, fontSize: 12 }}>{m.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {movementLog.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: T.textDim }}>No movements recorded</div>}
        </div>
      )}
    </div>
  );
}
