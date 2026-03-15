import React from 'react';
import { T, FONTS } from '../../utils/theme';
import { EmptyState } from '../Layout/PageShell';
import { api } from '../../utils/api';

const card = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 };
const loader = <EmptyState icon="🌱" title="Loading..." sub="" />;

export default function CO2() {
  return (<div style={card}><div style={{fontFamily:FONTS.display,fontSize:14,fontWeight:600,color:T.text,marginBottom:8}}>CO2 Tracking</div><div style={{fontFamily:FONTS.body,fontSize:12,color:T.textDim,lineHeight:1.6}}>Carbon emissions tracking per shipment and corridor. Connects to shipment data for automated calculation based on mode (sea/air), distance, and cargo weight. Phase 4.2 deliverable.</div></div>);
}
