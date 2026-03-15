import React from 'react';
import { T, FONTS } from '../../utils/theme';
import { EmptyState } from '../Layout/PageShell';
import { api } from '../../utils/api';

const card = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 };
const loader = <EmptyState icon="⟟" title="Loading..." sub="" />;

export default function Trends() {
  const [d, setD] = React.useState(null);
  React.useEffect(() => { api.get('/analytics/dashboard').then(setD).catch(()=>{}); }, []);
  if (!d) return loader;
  return (<div style={card}>
    <div style={{fontFamily:FONTS.display,fontSize:14,fontWeight:600,color:T.text,marginBottom:12}}>Operational Analytics</div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
      {Object.entries(d).slice(0,8).map(([k,v],i) => (<div key={i} style={{background:T.bg,borderRadius:8,padding:14,textAlign:'center'}}>
        <div style={{fontFamily:FONTS.display,fontSize:20,fontWeight:700,color:T.gold}}>{typeof v==='number'?v:JSON.stringify(v).substring(0,20)}</div>
        <div style={{fontFamily:FONTS.body,fontSize:10,color:T.textDim}}>{k.replace(/([A-Z])/g,' $1')}</div>
      </div>))}
    </div>
  </div>);
}
