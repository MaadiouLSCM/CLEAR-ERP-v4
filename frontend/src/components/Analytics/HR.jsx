import React from 'react';
import { T, FONTS } from '../../utils/theme';
import { EmptyState } from '../Layout/PageShell';
import { api } from '../../utils/api';

const card = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 };
const loader = <EmptyState icon="👥" title="Loading..." sub="" />;

export default function HR() {
  const [u, setU] = React.useState(null);
  React.useEffect(() => { api.get('/users/expediters').then(setU).catch(()=>{}); }, []);
  return (<div style={card}>
    <div style={{fontFamily:FONTS.display,fontSize:14,fontWeight:600,color:T.text,marginBottom:12}}>Team Overview</div>
    {u ? u.map((e,i) => (<div key={i} style={{display:'flex',gap:10,padding:'6px 0',borderBottom:`1px solid ${T.border}`}}>
      <span style={{fontFamily:FONTS.body,fontSize:13,color:T.text,flex:1}}>{e.name}</span>
      <span style={{fontFamily:FONTS.mono,fontSize:11,color:T.gold}}>{e.role}</span>
      <span style={{fontFamily:FONTS.mono,fontSize:10,color:T.textDim}}>{e.office?.name||'—'}</span>
    </div>)) : <div style={{fontFamily:FONTS.body,fontSize:12,color:T.textDim}}>Loading...</div>}
  </div>);
}
