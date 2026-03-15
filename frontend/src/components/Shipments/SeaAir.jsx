import React from 'react';
import { T, FONTS } from '../../utils/theme';
import { EmptyState } from '../Layout/PageShell';
import { api } from '../../utils/api';

const card = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 };
const loader = <EmptyState icon="🚢" title="Loading..." sub="" />;

export default function SeaAir() {
  const [s, setS] = React.useState(null); const [c, setC] = React.useState(null);
  React.useEffect(() => { api.get('/shipments').then(setS).catch(()=>{}); api.get('/corridors').then(setC).catch(()=>{}); }, []);
  return (<>
    {c && <div style={{...card,marginBottom:12}}>
      <div style={{fontFamily:FONTS.display,fontSize:14,fontWeight:600,color:T.text,marginBottom:12}}>Active Corridors ({c.length})</div>
      {c.map((cr,i)=>(<div key={i} style={{display:'flex',gap:10,padding:'6px 0',borderBottom:`1px solid ${T.border}`}}>
        <span style={{fontFamily:FONTS.body,fontSize:13,color:T.text,flex:1,fontWeight:600}}>{cr.name}</span>
        <span style={{fontFamily:FONTS.mono,fontSize:11,color:cr.mode==='SEA'?T.blue:T.purple}}>{cr.mode}</span>
        <span style={{fontFamily:FONTS.mono,fontSize:11,color:T.textDim}}>{cr.avgTransitDays||'—'} days avg</span>
      </div>))}
    </div>}
    <div style={card}>
      <div style={{fontFamily:FONTS.display,fontSize:14,fontWeight:600,color:T.text,marginBottom:8}}>Shipments</div>
      <div style={{fontFamily:FONTS.body,fontSize:12,color:T.textDim}}>{s ? `${s.length || 0} shipments loaded` : 'Loading...'}</div>
    </div>
  </>);
}
