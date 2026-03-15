import React, { useState, useEffect } from 'react';
import { T, FONTS } from '../../utils/theme';
import { api } from '../../utils/api';

const S = {
  card: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 },
  badge: (bg, color) => ({ background: bg, color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontFamily: FONTS.mono, fontWeight: 600 }),
  th: { padding: '10px 12px', textAlign: 'left', fontSize: 11, color: T.textDim, fontFamily: FONTS.mono, borderBottom: `1px solid ${T.border}`, textTransform: 'uppercase' },
  td: { padding: '10px 12px', fontSize: 13, fontFamily: FONTS.body, borderBottom: `1px solid ${T.border}`, color: T.text },
  btn: (bg) => ({ background: bg || T.gold, color: '#000', border: 'none', padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONTS.body }),
};

const statusColor = (s) => s === 'ACTIVE' ? T.green : s === 'PLANNED' ? T.blue : s === 'SEASONAL' ? T.orange : T.red;
const modelIcon = (m) => m === 'OWN' ? '🏢' : m === 'AGENT' ? '🤝' : '🔗';

export default function HubConfig() {
  const [hubs, setHubs] = useState([]);
  const [selectedHub, setSelectedHub] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('zones');

  useEffect(() => { loadHubs(); }, []);
  useEffect(() => { if (selectedHub) loadDetail(selectedHub); }, [selectedHub]);

  const loadHubs = async () => {
    try { const data = await api.get('/hubs'); setHubs(data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadDetail = async (id) => {
    try { const data = await api.get(`/hubs/${id}`); setDetail(data); }
    catch (e) { console.error(e); }
  };

  if (loading) return <div style={{ color: T.textDim, padding: 40, fontFamily: FONTS.body }}>Loading hub config...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <span style={{ fontSize: 28 }}>⬡</span>
        <div>
          <div style={{ fontFamily: FONTS.display, fontSize: 20, fontWeight: 700, color: T.text }}>Hub Configuration</div>
          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: T.textDim }}>{hubs.length} hubs · Zone management · Cost profiles · Regulatory</div>
        </div>
      </div>

      {/* Hub Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 24 }}>
        {hubs.map(h => (
          <div key={h.id} onClick={() => setSelectedHub(h.id)} style={{
            ...S.card, cursor: 'pointer', transition: 'border-color 0.2s',
            borderColor: selectedHub === h.id ? T.gold : T.border,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontFamily: FONTS.display, fontSize: 16, fontWeight: 700, color: T.text }}>{modelIcon(h.operatingModel)} {h.code}</div>
                <div style={{ fontFamily: FONTS.body, fontSize: 13, color: T.textDim }}>{h.name}</div>
              </div>
              <span style={S.badge(statusColor(h.status) + '20', statusColor(h.status))}>{h.status}</span>
            </div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: T.textDim }}>
              {h.city}, {h.country} · {h.operatingModel} · {h.zones?.length || 0} zones
            </div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: T.blue, marginTop: 4 }}>
              {h._count?.stockItems || 0} items in stock
            </div>
          </div>
        ))}
      </div>

      {/* Hub Detail */}
      {detail && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: 700, color: T.text }}>
                {modelIcon(detail.operatingModel)} {detail.code} — {detail.name}
              </div>
              <div style={{ fontFamily: FONTS.body, fontSize: 13, color: T.textDim, marginTop: 2 }}>
                {detail.city}, {detail.country} · Office: {detail.office?.name} · Model: {detail.operatingModel}
                {detail.operatorName && ` · Operator: ${detail.operatorName}`}
              </div>
            </div>
            <span style={S.badge(statusColor(detail.status) + '20', statusColor(detail.status))}>{detail.status}</span>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `1px solid ${T.border}`, paddingBottom: 8 }}>
            {['zones', 'costs', 'regulatory', 'equipment', 'schedule'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: tab === t ? T.goldDim : 'transparent', color: tab === t ? T.gold : T.textDim,
                border: 'none', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: FONTS.body,
                textTransform: 'capitalize',
              }}>{t}</button>
            ))}
          </div>

          {/* ZONES TAB */}
          {tab === 'zones' && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Code', 'Name', 'Type', 'Capacity (CBM)', 'Occupied', 'Available', 'Utilization'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {detail.zones?.map(z => {
                  const util = z.capacityCbm > 0 ? Math.round((z.currentOccupancyCbm / z.capacityCbm) * 100) : 0;
                  const color = util >= 90 ? T.red : util >= 70 ? T.orange : util >= 40 ? T.blue : T.green;
                  return (
                    <tr key={z.id}>
                      <td style={{ ...S.td, fontFamily: FONTS.mono }}>{z.code}</td>
                      <td style={S.td}>{z.name}</td>
                      <td style={S.td}><span style={S.badge(T.blueDim, T.blue)}>{z.type}</span></td>
                      <td style={{ ...S.td, fontFamily: FONTS.mono }}>{z.capacityCbm}</td>
                      <td style={{ ...S.td, fontFamily: FONTS.mono }}>{z.currentOccupancyCbm}</td>
                      <td style={{ ...S.td, fontFamily: FONTS.mono }}>{z.capacityCbm - z.currentOccupancyCbm}</td>
                      <td style={S.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ height: 6, background: T.border, borderRadius: 3, flex: 1, maxWidth: 100 }}>
                            <div style={{ height: 6, background: color, borderRadius: 3, width: `${util}%` }} />
                          </div>
                          <span style={{ fontFamily: FONTS.mono, fontSize: 12, color }}>{util}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* COSTS TAB */}
          {tab === 'costs' && detail.costProfile && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {[
                { label: 'Currency', value: detail.costProfile.currency },
                { label: 'Free Time (default)', value: `${detail.costProfile.freeTimeDaysDefault} days` },
                { label: 'Storage Rate', value: `${detail.costProfile.storageRatePerCbmPerDay} /CBM/day` },
                { label: 'Handling In', value: `${detail.costProfile.handlingInRate} ${detail.costProfile.currency}` },
                { label: 'Handling Out', value: `${detail.costProfile.handlingOutRate} ${detail.costProfile.currency}` },
                { label: 'Forklift Rate', value: detail.costProfile.forkliftRatePerHour ? `${detail.costProfile.forkliftRatePerHour}/hr` : '—' },
                { label: 'Crane Rate', value: detail.costProfile.craneRatePerHour ? `${detail.costProfile.craneRatePerHour}/hr` : '—' },
              ].map((item, i) => (
                <div key={i} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: 14 }}>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim, textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: 700, color: T.gold }}>{item.value}</div>
                </div>
              ))}
            </div>
          )}
          {tab === 'costs' && !detail.costProfile && <div style={{ color: T.textDim, padding: 20, textAlign: 'center' }}>No cost profile configured</div>}

          {/* REGULATORY TAB */}
          {tab === 'regulatory' && detail.regulatory && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {[
                { label: 'Regime', value: detail.regulatory.regimeType },
                { label: 'Customs Authority', value: detail.regulatory.customsAuthority || '—' },
                { label: 'DG Permitted', value: detail.regulatory.dgPermitted ? 'Yes' : 'No' },
                { label: 'DG Classes', value: detail.regulatory.dgClassesPermitted || '—' },
                { label: 'Max Storage Days', value: detail.regulatory.maxStorageDays ? `${detail.regulatory.maxStorageDays}d` : 'Unlimited' },
                { label: 'Reporting', value: detail.regulatory.reportingFrequency || '—' },
              ].map((item, i) => (
                <div key={i} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: 14 }}>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim, textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontFamily: FONTS.body, fontSize: 15, fontWeight: 600, color: T.text }}>{item.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* EQUIPMENT TAB */}
          {tab === 'equipment' && (
            <div>
              {detail.equipment?.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>{['Name', 'Type', 'Capacity', 'Status'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {detail.equipment.map(e => (
                      <tr key={e.id}>
                        <td style={S.td}>{e.name}</td>
                        <td style={S.td}>{e.type}</td>
                        <td style={{ ...S.td, fontFamily: FONTS.mono }}>{e.capacityKg ? `${e.capacityKg} kg` : '—'}</td>
                        <td style={S.td}><span style={S.badge(T.greenDim, T.green)}>{e.condition || 'OPERATIONAL'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div style={{ color: T.textDim, padding: 20, textAlign: 'center' }}>No equipment registered</div>}
            </div>
          )}

          {/* SCHEDULE TAB */}
          {tab === 'schedule' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {[
                { label: 'Working Days', value: detail.workingDays },
                { label: 'Hours', value: `${detail.workingHoursStart} — ${detail.workingHoursEnd}` },
                { label: 'Timezone', value: detail.timezone },
              ].map((item, i) => (
                <div key={i} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: 14 }}>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim, textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontFamily: FONTS.body, fontSize: 15, fontWeight: 600, color: T.text }}>{item.value}</div>
                </div>
              ))}
              {detail.freeTimeOverrides?.length > 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: 700, color: T.text, marginTop: 12, marginBottom: 8 }}>Free Time Overrides</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>{['Client', 'Free Time Days', 'Effective From'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {detail.freeTimeOverrides.map(o => (
                        <tr key={o.id}>
                          <td style={S.td}>{o.clientName || o.clientId || 'All'}</td>
                          <td style={{ ...S.td, fontFamily: FONTS.mono, color: T.gold }}>{o.freeTimeDays} days</td>
                          <td style={S.td}>{o.effectiveFrom ? new Date(o.effectiveFrom).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
