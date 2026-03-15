import React, { useState, useEffect } from 'react';
import { T, FONTS, getStatusColor } from '../../utils/theme';
import { KPICard, StatusBadge, SectionTitle, EmptyState, DataTable } from '../Layout/PageShell';
import { getJobs, getDocuments, getKitStatus, getJCRCheck, api } from '../../utils/api';

// ── Document Type Definitions ──
const DOC_TYPES = {
  RFC: { name: 'Request for Collection', kit: 'PRE_SHIPMENT', cascade: 'From client or BW auto', icon: '📋', p: 0 },
  QR_STICKERS: { name: 'QR Code Stickers', kit: 'PRE_SHIPMENT', cascade: 'After BW import per item', icon: '⊡', p: 0 },
  SHIPPING_MARK: { name: 'Shipping Mark Labels', kit: 'PRE_SHIPMENT', cascade: 'Per box at hub', icon: '▣', p: 0 },
  VPL: { name: 'Verified Packing List', kit: 'PRE_SHIPMENT', cascade: 'After inspection (pre-filled from RFC)', icon: '◧', p: 0 },
  PFI: { name: 'Pro-Forma Invoice', kit: 'PRE_SHIPMENT', cascade: 'From quotation', icon: '◇', p: 0 },
  JEP: { name: 'Job Execution Plan', kit: 'PRE_SHIPMENT', cascade: 'Planning complete', icon: '▥', p: 0 },
  SI: { name: 'Shipping Instructions', kit: 'CUSTOMS_EXPORT', cascade: 'Before booking', icon: '◉', p: 0 },
  PI: { name: 'Packing Instructions', kit: 'CUSTOMS_EXPORT', cascade: 'Before booking', icon: '◧', p: 1 },
  POC: { name: 'Proof of Collection', kit: 'DELIVERY', cascade: 'At pickup', icon: '✓', p: 0 },
  POR: { name: 'Proof of Receipt', kit: 'DELIVERY', cascade: 'At hub receipt', icon: '✓', p: 0 },
  POD: { name: 'Proof of Delivery', kit: 'DELIVERY', cascade: 'At final delivery', icon: '✓', p: 0 },
  BL_AWB_CMR: { name: 'Bill of Lading / Air Waybill', kit: 'CUSTOMS_EXPORT', cascade: 'Sea/Air freight', icon: '⛵', p: 0 },
  GL_COVER: { name: 'Greenlight Cover', kit: 'CUSTOMS_EXPORT', cascade: 'Customs destination', icon: '★', p: 0 },
  PRE_ALERT: { name: 'Pre-Alert', kit: 'DELIVERY', cascade: 'Always after booking', icon: '◎', p: 0 },
  JCR_COVER: { name: 'Job Completion Report', kit: 'CLOSE_OUT', cascade: 'All docs uploaded', icon: '◈', p: 0 },
  INVOICE: { name: 'LSCM Invoice', kit: 'CLOSE_OUT', cascade: 'After JCR', icon: '◇', p: 0 },
  INSPECTION_REPORT: { name: 'Inspection Report', kit: 'CLOSE_OUT', cascade: 'After inspection', icon: '◧', p: 1 },
  SURVEY_REPORT: { name: 'Survey Report', kit: 'CLOSE_OUT', cascade: 'At pickup/loading', icon: '◧', p: 1 },
};

const KIT_CONFIG = {
  STARTER_KIT: { label: 'Pre-Shipment Kit', color: T.purple, desc: 'RFC → QR → SM → VPL → PFI → JEP' },
  GL_KIT: { label: 'Customs & Export Kit', color: T.gold, desc: 'SI → PI → GL → BOL/AWB' },
  PRE_ALERT_KIT: { label: 'Delivery Kit', color: T.blue, desc: 'POC → POR → Pre-Alert → POD' },
  JCR_KIT: { label: 'Close-Out Kit', color: T.green, desc: 'SR → IR → JCR → Invoice' },
};

// ── Document Cascade Visual ──
const CascadeFlow = () => (
  <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
    <SectionTitle>Document Cascade Logic</SectionTitle>
    <div style={{ fontFamily: FONTS.body, fontSize: 11, color: T.textDim, marginBottom: 12 }}>
      Each document pre-fills the next upon validation. BW Path (full-service) includes item-level QR tracking.
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {['SAP BW', '→', 'RFC', '→', 'VPL', '→', 'JEP', '→', 'SI', '→', 'GL', '→', 'Pre-Alert', '→', 'POD', '→', 'JCR'].map((item, i) =>
        item === '→' ? (
          <span key={i} style={{ color: T.gold, fontSize: 14 }}>→</span>
        ) : (
          <span key={i} style={{ fontFamily: FONTS.mono, fontSize: 10, padding: '4px 10px', borderRadius: 6, background: T.goldDim, color: T.gold, fontWeight: 600 }}>{item}</span>
        )
      )}
    </div>
  </div>
);

export default function Documents() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [kitStatus, setKitStatus] = useState(null);
  const [jcrCheck, setJCRCheck] = useState(null);
  const [loading, setLoading] = useState(false);
  const [allDocs, setAllDocs] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getJobs().then(setJobs).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedJobId) { setDocuments([]); setKitStatus(null); setJCRCheck(null); return; }
    setLoading(true);
    Promise.all([
      getDocuments(selectedJobId).catch(() => []),
      getKitStatus(selectedJobId).catch(() => null),
      getJCRCheck(selectedJobId).catch(() => null),
    ]).then(([d, k, j]) => {
      setDocuments(d);
      setKitStatus(k);
      setJCRCheck(j);
      setLoading(false);
    });
  }, [selectedJobId]);

  const DOC_STATUS_COLOR = {
    PENDING: T.textDim, DRAFT: T.orange, GENERATED: T.blue,
    VERIFIED: T.teal, SIGNED_UPLOADED: T.green, REJECTED: T.red,
  };

  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const filteredJobs = search ? jobs.filter(j => j.ref?.toLowerCase().includes(search.toLowerCase()) || j.client?.name?.toLowerCase().includes(search.toLowerCase())) : jobs;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>◧</span>
        <div>
          <div style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: 700, color: T.text }}>Document Generator</div>
          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: T.textDim }}>22 document templates • 5 document kits • Cascade pre-fill logic</div>
        </div>
      </div>

      {/* Cascade Flow */}
      <CascadeFlow />

      {/* Job Selector */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim, textTransform: 'uppercase' }}>Select Job:</div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by ref or client..."
          style={{ padding: '6px 12px', background: T.surfaceHover, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontFamily: FONTS.body, fontSize: 12, width: 200, outline: 'none' }} />
        <select value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)}
          style={{ padding: '6px 12px', background: T.surfaceHover, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontFamily: FONTS.mono, fontSize: 11, minWidth: 300, outline: 'none' }}>
          <option value="">— Choose a job —</option>
          {filteredJobs.map(j => (
            <option key={j.id} value={j.id}>{j.ref} — {j.client?.name || 'No client'} ({j.status})</option>
          ))}
        </select>
      </div>

      {!selectedJobId ? (
        <EmptyState icon="◧" title="Select a job to view documents" sub="Choose a job from the dropdown above" />
      ) : loading ? (
        <EmptyState icon="◧" title="Loading documents..." />
      ) : (
        <div>
          {/* Selected Job Info */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', gap: 20, alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: FONTS.display, fontSize: 16, fontWeight: 700, color: T.gold }}>{selectedJob?.ref}</div>
              <div style={{ fontFamily: FONTS.body, fontSize: 11, color: T.textDim }}>{selectedJob?.client?.name} • {selectedJob?.transportMode}</div>
            </div>
            <StatusBadge status={selectedJob?.status} color={getStatusColor(selectedJob?.status)} />
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontFamily: FONTS.mono, fontSize: 20, fontWeight: 700, color: T.text }}>{documents.length}</div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 9, color: T.textDim }}>DOCUMENTS</div>
            </div>
          </div>

          {/* Kit Progress Cards */}
          <SectionTitle>Document Kits</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
            {Object.entries(KIT_CONFIG).map(([key, kit]) => {
              const ks = kitStatus?.kits?.[key];
              const pct = ks ? Math.round((ks.ready / ks.total) * 100) : 0;
              return (
                <div key={key} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ fontFamily: FONTS.display, fontSize: 12, fontWeight: 700, color: kit.color, marginBottom: 4 }}>{kit.label}</div>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 9, color: T.textDim, marginBottom: 8 }}>{kit.desc}</div>
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
                {jcrCheck.ready ? '✓ JCR Ready — All mandatory documents uploaded' : `⚠ JCR Blocked — ${jcrCheck.missingCount} document(s) still pending`}
              </div>
              {!jcrCheck.ready && jcrCheck.missing?.length > 0 && (
                <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim, marginTop: 6 }}>Missing: {jcrCheck.missing.join(', ')}</div>
              )}
            </div>
          )}

          {/* Documents Table */}
          <SectionTitle>All Documents ({documents.length})</SectionTitle>
          {documents.length === 0 ? (
            <EmptyState icon="◧" title="No documents generated yet" sub="Documents are generated as the job progresses through its lifecycle" />
          ) : (
            <DataTable
              headers={['Type', 'Name', 'Kit', 'Status', 'Generated', 'Signed']}
              rows={documents.map(d => [
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14 }}>{DOC_TYPES[d.type]?.icon || '◧'}</span>
                  <StatusBadge status={d.type} color={T.teal} />
                </div>,
                d.name,
                d.kit || '—',
                <StatusBadge status={d.status} color={DOC_STATUS_COLOR[d.status] || T.textDim} />,
                d.generatedAt ? new Date(d.generatedAt).toLocaleDateString('fr-FR') : '—',
                d.signedBy ? `${d.signedBy} (${new Date(d.signedAt).toLocaleDateString('fr-FR')})` : '—',
              ])}
            />
          )}

          {/* Document Template Catalog */}
          <SectionTitle>Template Catalog (22 Types)</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
            {Object.entries(DOC_TYPES).map(([code, def]) => {
              const existing = documents.find(d => d.type === code);
              return (
                <div key={code} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 18, opacity: 0.6 }}>{def.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.gold, fontWeight: 600 }}>{code}</div>
                    <div style={{ fontFamily: FONTS.body, fontSize: 11, color: T.text }}>{def.name}</div>
                    <div style={{ fontFamily: FONTS.mono, fontSize: 9, color: T.textDim }}>{def.cascade}</div>
                  </div>
                  {existing ? (
                    <StatusBadge status={existing.status} color={DOC_STATUS_COLOR[existing.status]} />
                  ) : (
                    <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: T.textMuted }}>—</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
