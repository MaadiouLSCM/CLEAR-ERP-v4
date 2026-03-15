import React from 'react';
import { T, FONTS } from '../../utils/theme';
import { EmptyState } from '../Layout/PageShell';
import { api } from '../../utils/api';

const card = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 };
const loader = <EmptyState icon="◎" title="Loading..." sub="" />;

export default function Governance() {
  const [sla, setSla] = React.useState(null);
  const [clients, setClients] = React.useState(null);
  React.useEffect(() => { api.get('/portal/kpi/sla').then(setSla).catch(()=>{}); api.get('/portal/kpi/by-client').then(setClients).catch(()=>{}); }, []);
  const SLA_COL = { ON_TRACK: T.green, AT_RISK: T.orange, BREACHED: T.red };
  if (!sla) return loader;
  return (<>
    <div style={{...card,marginBottom:16}}>
      <div style={{fontFamily:FONTS.display,fontSize:14,fontWeight:600,color:T.text,marginBottom:12}}>SLA Tracking ({sla.length} active jobs)</div>
      {sla.map((s,i) => (<div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:`1px solid ${T.border}`}}>
        <span style={{background:(SLA_COL[s.slaStatus]||T.textDim)+'20',color:SLA_COL[s.slaStatus]||T.textDim,padding:'2px 10px',borderRadius:6,fontSize:10,fontWeight:600,fontFamily:FONTS.mono}}>{s.slaStatus}</span>
        <span style={{fontFamily:FONTS.mono,fontSize:12,color:T.gold,minWidth:90}}>{s.jobRef}</span>
        <span style={{fontFamily:FONTS.body,fontSize:12,color:T.text,flex:1}}>{s.client} — {s.corridor}</span>
        <span style={{fontFamily:FONTS.mono,fontSize:12,color:s.daysLeft<0?T.red:s.daysLeft<=3?T.orange:T.green}}>{s.daysLeft}d</span>
      </div>))}
    </div>
    {clients && <div style={card}>
      <div style={{fontFamily:FONTS.display,fontSize:14,fontWeight:600,color:T.text,marginBottom:12}}>Client Performance</div>
      {clients.map((c,i) => (<div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:`1px solid ${T.border}`}}>
        <span style={{fontFamily:FONTS.body,fontSize:13,color:T.text,flex:1,fontWeight:600}}>{c.clientName}</span>
        <span style={{fontFamily:FONTS.mono,fontSize:11,color:T.textDim}}>{c.totalJobs} jobs</span>
        <span style={{fontFamily:FONTS.mono,fontSize:11,color:T.green}}>On-time: {c.onTimeRate}%</span>
        <span style={{fontFamily:FONTS.mono,fontSize:11,color:T.gold}}>Avg {c.avgCycleDays}d</span>
        <span style={{fontFamily:FONTS.mono,fontSize:11,color:T.teal}}>${(c.totalRevenue||0).toLocaleString()}</span>
      </div>))}
    </div>}
  </>);
}
