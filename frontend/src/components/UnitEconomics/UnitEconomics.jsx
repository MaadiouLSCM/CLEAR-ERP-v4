import React from 'react';
import { T, FONTS } from '../../utils/theme';
import { EmptyState } from '../Layout/PageShell';
import { api } from '../../utils/api';

const card = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 };
const loader = <EmptyState icon="📈" title="Loading..." sub="" />;

export default function UnitEconomics() {
  const [p, setP] = React.useState(null);
  React.useEffect(() => { api.get('/finance/profitability').then(setP).catch(()=>{}); }, []);
  if (!p) return loader;
  return (<div style={card}>
    <div style={{fontFamily:FONTS.display,fontSize:14,fontWeight:600,color:T.text,marginBottom:12}}>Profitability Analysis</div>
    {(Array.isArray(p)?p:p.jobs||[]).slice(0,20).map((j,i)=>(<div key={i} style={{display:'flex',gap:10,padding:'6px 0',borderBottom:`1px solid ${T.border}`}}>
      <span style={{fontFamily:FONTS.mono,fontSize:12,color:T.gold,minWidth:90}}>{j.jobRef||j.ref||'—'}</span>
      <span style={{fontFamily:FONTS.body,fontSize:12,color:T.text,flex:1}}>{j.client||'—'}</span>
      <span style={{fontFamily:FONTS.mono,fontSize:11,color:T.green}}>Rev: ${(j.revenue||0).toLocaleString()}</span>
      <span style={{fontFamily:FONTS.mono,fontSize:11,color:T.red}}>Cost: ${(j.cost||0).toLocaleString()}</span>
      <span style={{fontFamily:FONTS.mono,fontSize:11,color:(j.margin||0)>=0?T.green:T.red}}>Margin: {(j.marginPct||0).toFixed(0)}%</span>
    </div>))}
  </div>);
}
