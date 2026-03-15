import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { T, FONTS, getStatusColor } from '../../utils/theme';
import { KPICard, StatusBadge, SectionTitle, EmptyState, DataTable } from '../Layout/PageShell';
import { getJob, transitionJob, getItems, getBoxes, getDocuments, getKitStatus, getJCRCheck, getTimeline, generateQR, bulkQR } from '../../utils/api';

// ── Status Transition Map ──
const ALLOWED_TRANSITIONS = {
  RFC_RECEIVED: ['BW_IMPORTED', 'DOCS_PENDING'],
  BW_IMPORTED: ['QR_STICKERS_SENT', 'DOCS_PENDING'],
  QR_STICKERS_SENT: ['DOCS_PENDING'],
  DOCS_PENDING: ['DOCS_COMPLETE'],
  DOCS_COMPLETE: ['QUOTATION'],
  QUOTATION: ['PFI_SENT'],
  PFI_SENT: ['PFI_APPROVED', 'QUOTATION'],
  PFI_APPROVED: ['PLANNING'],
  PLANNING: ['JEP_SENT'],
  JEP_SENT: ['OPS_LAUNCHED'],
  OPS_LAUNCHED: ['PICKUP_SCHEDULED'],
  PICKUP_SCHEDULED: ['PICKUP_COMPLETED'],
  PICKUP_COMPLETED: ['AT_HUB'],
  AT_HUB: ['INSPECTION_DONE'],
  INSPECTION_DONE: ['CONSOLIDATED', 'GL_SUBMITTED'],
  CONSOLIDATED: ['GL_SUBMITTED'],
  GL_SUBMITTED: ['GL_APPROVED', 'CUSTOMS_HOLD'],
  GL_APPROVED: ['BOOKING_CONFIRMED'],
  BOOKING_CONFIRMED: ['PRE_ALERT_SENT'],
  PRE_ALERT_SENT: ['EXPORT_CUSTOMS'],
  EXPORT_CUSTOMS: ['IN_TRANSIT'],
  IN_TRANSIT: ['IMPORT_CUSTOMS', 'CUSTOMS_HOLD'],
  IMPORT_CUSTOMS: ['CUSTOMS_CLEARED', 'CUSTOMS_HOLD'],
  CUSTOMS_HOLD: ['CUSTOMS_CLEARED', 'IMPORT_CUSTOMS'],
  CUSTOMS_CLEARED: ['DELIVERY_SCHEDULED'],
  DELIVERY_SCHEDULED: ['DELIVERED'],
  DELIVERED: ['POD_RECEIVED'],
  POD_RECEIVED: ['JCR_PENDING'],
  JCR_PENDING: ['JCR_COMPLETE'],
  JCR_COMPLETE: ['INVOICED'],
  INVOICED: ['CLOSED'],
};

// ── Tab Button ──
const Tab = ({ label, active, count, onClick }) => (
  <button onClick={onClick} style={{
    padding: '8px 16px', borderRadius: '8px 8px 0 0', border: 'none',
    background: active ? T.surface : 'transparent', color: active ? T.gold : T.textDim,
    fontFamily: FONTS.display, fontSize: 12, fontWeight: active ? 700 : 400,
    cursor: 'pointer', borderBottom: active ? `2px solid ${T.gold}` : `2px solid transparent`,
    display: 'flex', alignItems: 'center', gap: 6,
  }}>
    {label}
    {count != null && <span style={{ fontFamily: FONTS.mono, fontSize: 10, padding: '1px 6px', borderRadius: 10, background: active ? T.goldDim : T.surfaceHover }}>{count}</span>}
  </button>
);

// ── Status Progress Bar ──
const PHASE_NAMES = ['Job Creation', 'Pre-Shipment', 'Planning', 'Pickup & Hub', 'Customs & Transit', 'Delivery', 'Close & Billing'];
const STATUS_PHASE = {
  RFC_RECEIVED: 0, BW_IMPORTED: 0, QR_STICKERS_SENT: 1, DOCS_PENDING: 1, DOCS_COMPLETE: 1,
  QUOTATION: 1, PFI_SENT: 1, PFI_APPROVED: 1, PLANNING: 2, JEP_SENT: 2, OPS_LAUNCHED: 2,
  PICKUP_SCHEDULED: 3, PICKUP_COMPLETED: 3, AT_HUB: 3, INSPECTION_DONE: 3, CONSOLIDATED: 3,
  GL_SUBMITTED: 4, GL_APPROVED: 4, BOOKING_CONFIRMED: 4, PRE_ALERT_SENT: 4,
  EXPORT_CUSTOMS: 4, IN_TRANSIT: 4, IMPORT_CUSTOMS: 4, CUSTOMS_CLEARED: 4,
  DELIVERY_SCHEDULED: 5, DELIVERED: 5, POD_RECEIVED: 5,
  JCR_PENDING: 6, JCR_COMPLETE: 6, INVOICED: 6, CLOSED: 6,
};

const ProgressBar = ({ status }) => {
  const phase = STATUS_PHASE[status] ?? 0;
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
      {PHASE_NAMES.map((name, i) => (
        <div key={i} style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ height: 4, borderRadius: 2, background: i <= phase ? T.gold : T.border, marginBottom: 4, transition: 'background 0.3s' }} />
          <div style={{ fontFamily: FONTS.mono, fontSize: 8, color: i <= phase ? T.gold : T.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{name}</div>
        </div>
      ))}
    </div>
  );
};

// ── Items Tab ──
const ItemsTab = ({ jobId, items, boxes, onRefresh }) => {
  const [bulkLoading, setBulkLoading] = useState(false);

  const handleBulkQR = async () => {
    setBulkLoading(true);
    try {
      await bulkQR(jobId);
      onRefresh();
    } catch (e) { alert(e.message); }
    finally { setBulkLoading(false); }
  };

  const handleGenQR = async (itemId) => {
    try { await generateQR(itemId); onRefresh(); } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <SectionTitle>Items ({items.length})</SectionTitle>
        <button onClick={handleBulkQR} disabled={bulkLoading}
          style={{ padding: '6px 16px', borderRadius: 8, border: `1px solid ${T.gold}`, background: T.goldDim, color: T.gold, fontFamily: FONTS.mono, fontSize: 11, cursor: 'pointer' }}>
          {bulkLoading ? 'Generating...' : '⟐ Bulk Generate QR'}
        </button>
      </div>
      {items.length === 0 ? (
        <EmptyState icon="⊡" title="No items yet" sub="Items will appear when PO data is imported" />
      ) : (
        <DataTable
          headers={['#', 'Material', 'Description', 'Qty', 'Weight', 'QR Code', 'Box', 'Status']}
          rows={items.map(item => [
            item.itemNumber || '—',
            item.materialNumber || '—',
            item.description?.substring(0, 40) || '—',
            item.quantity || 0,
            item.weightKg ? `${item.weightKg} kg` : '—',
            item.qrGenerated ? (
              <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.green }}>✓ {item.qrCode?.substring(0, 16)}...</span>
            ) : (
              <button onClick={() => handleGenQR(item.id)} style={{ padding: '2px 8px', borderRadius: 4, border: `1px solid ${T.blue}`, background: T.blueDim, color: T.blue, fontFamily: FONTS.mono, fontSize: 9, cursor: 'pointer' }}>Generate</button>
            ),
            item.box?.shippingMark || '—',
            <StatusBadge status={item.status || 'PENDING'} color={item.qrGenerated ? T.green : T.textDim} />,
          ])}
        />
      )}

      {/* Boxes / Shipping Marks */}
      <SectionTitle>Boxes / Shipping Marks ({boxes.length})</SectionTitle>
      {boxes.length === 0 ? (
        <EmptyState icon="▣" title="No boxes yet" sub="Boxes are created at the hub during packaging" />
      ) : (
        <DataTable
          headers={['Package #', 'Shipping Mark', 'Type', 'Items', 'Weight', 'Dimensions']}
          rows={boxes.map(b => [
            b.packageNumber || '—',
            b.shippingMark || '—',
            b.casingType || '—',
            b.items?.length || 0,
            b.weightKg ? `${b.weightKg} kg` : '—',
            b.lengthCm ? `${b.lengthCm}×${b.widthCm}×${b.heightCm} cm` : '—',
          ])}
        />
      )}
    </div>
  );
};

// ── Documents Tab ──
const DOC_KITS = {
  STARTER_KIT: { label: 'Pre-Shipment Kit', color: T.purple, docs: ['RFC', 'QR_STICKERS', 'SHIPPING_MARK', 'VPL', 'PFI', 'JEP'] },
  GL_KIT: { label: 'Customs & Export Kit', color: T.gold, docs: ['SI', 'PI', 'BL_AWB_CMR', 'GL_COVER'] },
  PRE_ALERT_KIT: { label: 'Delivery Kit', color: T.blue, docs: ['POC', 'POR', 'PRE_ALERT', 'POD'] },
  JCR_KIT: { label: 'Close-Out Kit', color: T.green, docs: ['JCR_COVER', 'INVOICE', 'INSPECTION_REPORT', 'SURVEY_REPORT'] },
};

const DocumentsTab = ({ jobId, documents, kitStatus, jcrCheck }) => {
  return (
    <div>
      {/* Kit Progress */}
      <SectionTitle>Document Kits</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
        {Object.entries(DOC_KITS).map(([key, kit]) => {
          const ks = kitStatus?.kits?.[key];
          const pct = ks ? Math.round((ks.ready / ks.total) * 100) : 0;
          return (
            <div key={key} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontFamily: FONTS.display, fontSize: 12, fontWeight: 700, color: kit.color, marginBottom: 8 }}>{kit.label}</div>
              <div style={{ height: 4, borderRadius: 2, background: T.border, marginBottom: 6 }}>
                <div style={{ height: '100%', borderRadius: 2, background: kit.color, width: `${pct}%`, transition: 'width 0.3s' }} />
              </div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim }}>
                {ks ? `${ks.ready}/${ks.total} ready` : 'Not started'} — {pct}%
              </div>
            </div>
          );
        })}
      </div>

      {/* JCR Readiness */}
      {jcrCheck && (
        <div style={{ background: jcrCheck.ready ? T.greenDim : T.orangeDim, border: `1px solid ${jcrCheck.ready ? T.green : T.orange}33`, borderRadius: 12, padding: 14, marginBottom: 20 }}>
          <div style={{ fontFamily: FONTS.display, fontSize: 12, fontWeight: 700, color: jcrCheck.ready ? T.green : T.orange }}>
            {jcrCheck.ready ? '✓ JCR Ready — All mandatory documents uploaded' : `⚠ JCR Blocked — ${jcrCheck.missingCount} document(s) missing`}
          </div>
          {!jcrCheck.ready && jcrCheck.missing?.length > 0 && (
            <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim, marginTop: 6 }}>
              Missing: {jcrCheck.missing.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Documents List */}
      <SectionTitle>All Documents ({documents.length})</SectionTitle>
      {documents.length === 0 ? (
        <EmptyState icon="◧" title="No documents yet" sub="Documents will be generated as the job progresses" />
      ) : (
        <DataTable
          headers={['Type', 'Name', 'Kit', 'Status', 'Generated', 'Signed By']}
          rows={documents.map(d => [
            <StatusBadge status={d.type} color={T.teal} />,
            d.name,
            d.kit || '—',
            <StatusBadge status={d.status} color={d.status === 'SIGNED_UPLOADED' ? T.green : d.status === 'VERIFIED' ? T.blue : d.status === 'DRAFT' ? T.orange : T.textDim} />,
            d.generatedAt ? new Date(d.generatedAt).toLocaleDateString('fr-FR') : '—',
            d.signedBy || '—',
          ])}
        />
      )}
    </div>
  );
};

// ── Timeline Tab ──
const TimelineTab = ({ timeline }) => {
  const iconMap = {
    STATUS_CHANGE: '◉', DOCUMENT_UPLOAD: '◧', QR_SCAN: '⊡', PHOTO_UPLOAD: '▣',
    LOCATION_UPDATE: '◎', NOTE: '◱', PICKUP: '⊞', DELIVERY: '✓',
  };

  return (
    <div>
      <SectionTitle>Timeline ({timeline.length} events)</SectionTitle>
      {timeline.length === 0 ? (
        <EmptyState icon="◎" title="No events yet" sub="Events are recorded as the job progresses through its lifecycle" />
      ) : (
        <div style={{ position: 'relative', paddingLeft: 24 }}>
          {/* Vertical line */}
          <div style={{ position: 'absolute', left: 11, top: 0, bottom: 0, width: 2, background: T.border }} />
          {timeline.map((ev, i) => (
            <div key={i} style={{ position: 'relative', paddingBottom: 20, paddingLeft: 24 }}>
              {/* Dot */}
              <div style={{ position: 'absolute', left: -18, top: 4, width: 16, height: 16, borderRadius: '50%', background: T.surface, border: `2px solid ${T.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8 }}>
                {iconMap[ev.eventType] || '●'}
              </div>
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <StatusBadge status={ev.eventType} color={T.blue} />
                  <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textMuted }}>
                    {new Date(ev.timestamp).toLocaleString('fr-FR')}
                  </span>
                </div>
                <div style={{ fontFamily: FONTS.body, fontSize: 12, color: T.text }}>{ev.description}</div>
                {ev.location && <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim, marginTop: 4 }}>📍 {ev.location}</div>}
                {ev.photos?.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    {ev.photos.map((p, pi) => (
                      <div key={pi} style={{ width: 48, height: 48, borderRadius: 6, background: T.surfaceHover, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📷</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── MAIN COMPONENT ──
export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [items, setItems] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [docs, setDocs] = useState([]);
  const [kitStatus, setKitStatus] = useState(null);
  const [jcrCheck, setJCRCheck] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [tab, setTab] = useState('info');
  const [transitioning, setTransitioning] = useState(false);

  const load = () => {
    getJob(id).then(setJob).catch(() => {});
    getItems(id).then(setItems).catch(() => setItems([]));
    getBoxes(id).then(setBoxes).catch(() => setBoxes([]));
    getDocuments(id).then(setDocs).catch(() => setDocs([]));
    getKitStatus(id).then(setKitStatus).catch(() => {});
    getJCRCheck(id).then(setJCRCheck).catch(() => {});
    getTimeline(id).then(setTimeline).catch(() => setTimeline([]));
  };

  useEffect(() => { load(); }, [id]);

  const handleTransition = async (targetStatus) => {
    if (!confirm(`Transition to ${targetStatus.replace(/_/g, ' ')}?`)) return;
    setTransitioning(true);
    try {
      const updated = await transitionJob(id, targetStatus);
      setJob(prev => ({ ...prev, ...updated }));
      load(); // Refresh all data
    } catch (e) {
      alert(`Transition failed: ${e.message}`);
    } finally {
      setTransitioning(false);
    }
  };

  if (!job) return <EmptyState icon="◉" title="Loading job..." />;

  const nextStatuses = ALLOWED_TRANSITIONS[job.status] || [];
  const canAbort = !['CLOSED', 'INVOICED', 'JOB_ABORTED'].includes(job.status) && job.status !== 'RFC_RECEIVED';

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/jobs')} style={{ background: 'none', border: 'none', color: T.textDim, cursor: 'pointer', fontSize: 18 }}>←</button>
          <div style={{ fontFamily: FONTS.display, fontSize: 22, fontWeight: 800, color: T.text }}>{job.ref}</div>
          <StatusBadge status={job.status} color={getStatusColor(job.status)} />
          {job.shipmentType === 'CONSOLIDATED' && <StatusBadge status="CONSOL" color={T.teal} />}
        </div>
        <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim }}>
          {job.transportMode} • {job.incoterm || 'N/A'} • Created {new Date(job.requestDate).toLocaleDateString('fr-FR')}
        </div>
      </div>

      {/* ── Progress Bar ── */}
      <ProgressBar status={job.status} />

      {/* ── Status Transition Buttons ── */}
      {nextStatuses.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim, alignSelf: 'center' }}>Next:</span>
          {nextStatuses.map(s => (
            <button key={s} onClick={() => handleTransition(s)} disabled={transitioning}
              style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${T.gold}33`, background: T.goldDim, color: T.gold, fontFamily: FONTS.mono, fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: transitioning ? 0.5 : 1 }}>
              → {s.replace(/_/g, ' ')}
            </button>
          ))}
          {canAbort && (
            <button onClick={() => handleTransition('JOB_ABORTED')} disabled={transitioning}
              style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${T.red}33`, background: T.redDim, color: T.red, fontFamily: FONTS.mono, fontSize: 11, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}>
              ⚠ ABORT JOB
            </button>
          )}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <KPICard label="Client" value={job.client?.name || '—'} color={T.gold} />
        <KPICard label="Items" value={items.length} color={T.blue} />
        <KPICard label="Boxes" value={boxes.length} color={T.teal} />
        <KPICard label="Documents" value={docs.length} color={T.purple} />
        <KPICard label="Weight" value={`${job.totalWeightKg || 0} kg`} color={T.orange} />
        <KPICard label="Volume" value={`${job.totalCbm || 0} CBM`} color={T.green} />
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${T.border}`, marginBottom: 20 }}>
        <Tab label="Info" active={tab === 'info'} onClick={() => setTab('info')} />
        <Tab label="Items & QR" active={tab === 'items'} count={items.length} onClick={() => setTab('items')} />
        <Tab label="Documents" active={tab === 'docs'} count={docs.length} onClick={() => setTab('docs')} />
        <Tab label="Timeline" active={tab === 'timeline'} count={timeline.length} onClick={() => setTab('timeline')} />
      </div>

      {/* ── Tab Content ── */}
      {tab === 'info' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
              <SectionTitle>Job Information</SectionTitle>
              {[
                ['Reference', job.ref],
                ['PO Number', job.poNumber],
                ['Client', job.client?.name],
                ['Expediter', job.expediter?.name || 'Not assigned'],
                ['Office', job.office?.name || '—'],
                ['Corridor', job.corridor?.name || '—'],
                ['Transport Mode', job.transportMode],
                ['Shipment Type', job.shipmentType === 'CONSOLIDATED' ? 'Consolidation (via hubs)' : 'Direct Shipment'],
                ['Incoterm', job.incoterm || '—'],
                ['Declared Value', job.declaredValue ? `${job.declaredValue} ${job.currency}` : '—'],
              ].map(([label, value], i) => (
                <div key={i} style={{ display: 'flex', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: T.textDim, width: 140 }}>{label}</span>
                  <span style={{ fontFamily: FONTS.body, fontSize: 12, color: T.text }}>{value}</span>
                </div>
              ))}
            </div>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
              <SectionTitle>Dates & Logistics</SectionTitle>
              {[
                ['Request Date', job.requestDate ? new Date(job.requestDate).toLocaleDateString('fr-FR') : '—'],
                ['Target Pickup', job.targetPickup ? new Date(job.targetPickup).toLocaleDateString('fr-FR') : 'Not set'],
                ['Target Delivery', job.targetDelivery ? new Date(job.targetDelivery).toLocaleDateString('fr-FR') : 'Not set'],
                ['Total Items', `${job.totalItems}`],
                ['Total Packages', `${job.totalPackages}`],
                ['Total Weight', `${job.totalWeightKg} kg`],
                ['Total Volume', `${job.totalCbm} CBM`],
                ['Current Phase', `${job.currentPhase} / 7`],
                ['Progress', `${job.progress}%`],
              ].map(([label, value], i) => (
                <div key={i} style={{ display: 'flex', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: T.textDim, width: 140 }}>{label}</span>
                  <span style={{ fontFamily: FONTS.body, fontSize: 12, color: T.text }}>{value}</span>
                </div>
              ))}
              {/* Shipments */}
              {job.shipments?.length > 0 && (
                <>
                  <SectionTitle>Shipments</SectionTitle>
                  {job.shipments.map((s, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <StatusBadge status={s.status || 'PENDING'} color={T.blue} />
                        <span style={{ fontFamily: FONTS.body, fontSize: 12, color: T.text }}>{s.origin} → {s.destination}</span>
                      </div>
                      {s.transportLegs?.length > 0 && (
                        <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim, marginTop: 4, paddingLeft: 10 }}>
                          {s.transportLegs.map(l => `${l.mode}: ${l.origin}→${l.destination}`).join(' | ')}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'items' && <ItemsTab jobId={id} items={items} boxes={boxes} onRefresh={load} />}
      {tab === 'docs' && <DocumentsTab jobId={id} documents={docs} kitStatus={kitStatus} jcrCheck={jcrCheck} />}
      {tab === 'timeline' && <TimelineTab timeline={timeline} />}
    </div>
  );
}
