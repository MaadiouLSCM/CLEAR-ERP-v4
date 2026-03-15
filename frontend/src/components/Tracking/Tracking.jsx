import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { T, FONTS, getStatusColor } from '../../utils/theme';
import { KPICard, StatusBadge, SectionTitle, EmptyState, DataTable } from '../Layout/PageShell';
import { getJobs, getTimeline, lookupQR } from '../../utils/api';

// ── Event type config ──
const EVENT_CONFIG = {
  STATUS_CHANGE: { icon: '◉', color: T.gold, label: 'Status Change' },
  DOCUMENT_UPLOAD: { icon: '◧', color: T.purple, label: 'Document Upload' },
  DOCUMENT_SIGNED: { icon: '✎', color: T.green, label: 'Document Signed' },
  QR_SCAN: { icon: '⊡', color: T.teal, label: 'QR Scan' },
  QR_GENERATED: { icon: '⊡', color: T.blue, label: 'QR Generated' },
  PHOTO_UPLOAD: { icon: '📷', color: T.orange, label: 'Photo Upload' },
  LOCATION_UPDATE: { icon: '◎', color: T.blue, label: 'Location Update' },
  PICKUP: { icon: '⊞', color: T.green, label: 'Pickup' },
  DELIVERY: { icon: '✓', color: T.green, label: 'Delivery' },
  CUSTOMS_CLEAR: { icon: '★', color: T.gold, label: 'Customs Cleared' },
  INSPECTION: { icon: '◐', color: T.purple, label: 'Inspection' },
  NOTE: { icon: '◱', color: T.textDim, label: 'Note' },
  BOOKING: { icon: '⛵', color: T.blue, label: 'Booking' },
  PRE_ALERT: { icon: '◎', color: T.orange, label: 'Pre-Alert Sent' },
};

// ── Timeline Event Component ──
const TimelineEvent = ({ event, isLast }) => {
  const cfg = EVENT_CONFIG[event.eventType] || { icon: '●', color: T.textDim, label: event.eventType };
  const time = new Date(event.timestamp);

  return (
    <div style={{ display: 'flex', gap: 16, position: 'relative', paddingBottom: isLast ? 0 : 24 }}>
      {/* Time column */}
      <div style={{ width: 90, textAlign: 'right', flexShrink: 0, paddingTop: 4 }}>
        <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.text, fontWeight: 600 }}>{time.toLocaleDateString('fr-FR')}</div>
        <div style={{ fontFamily: FONTS.mono, fontSize: 9, color: T.textDim }}>{time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>

      {/* Connector */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: cfg.color + '22', border: `2px solid ${cfg.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: cfg.color, zIndex: 1 }}>
          {cfg.icon}
        </div>
        {!isLast && <div style={{ flex: 1, width: 2, background: T.border, marginTop: 4 }} />}
      </div>

      {/* Content */}
      <div style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <StatusBadge status={cfg.label} color={cfg.color} />
          {event.createdBy && <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: T.textDim }}>by {event.createdBy}</span>}
        </div>
        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: T.text, lineHeight: 1.4 }}>{event.description}</div>
        {event.location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
            <span style={{ fontSize: 11 }}>📍</span>
            <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim }}>{event.location}</span>
            {event.lat && event.lng && (
              <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: T.textMuted }}>({event.lat.toFixed(4)}, {event.lng.toFixed(4)})</span>
            )}
          </div>
        )}
        {event.photos?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {event.photos.map((p, i) => (
              <div key={i} style={{ width: 48, height: 48, borderRadius: 6, background: T.surfaceHover, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                {p.url ? <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} /> : '📷'}
              </div>
            ))}
          </div>
        )}
        {event.shipment && (
          <div style={{ fontFamily: FONTS.mono, fontSize: 9, color: T.teal, marginTop: 6 }}>
            Shipment: {event.shipment.origin} → {event.shipment.destination}
          </div>
        )}
      </div>
    </div>
  );
};

// ── QR Scan Lookup ──
const QRLookup = () => {
  const [qrInput, setQRInput] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();

  const handleScan = async () => {
    if (!qrInput.trim()) return;
    setSearching(true);
    setError('');
    try {
      const item = await lookupQR(qrInput.trim());
      setResult(item);
    } catch (e) {
      setError('QR code not found');
      setResult(null);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
      <SectionTitle>QR Code Scan Lookup</SectionTitle>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input value={qrInput} onChange={e => setQRInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScan()}
          placeholder="Enter or scan QR code (e.g. LSCM:REF-001:itemId)"
          style={{ flex: 1, padding: '8px 12px', background: T.surfaceHover, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontFamily: FONTS.mono, fontSize: 12, outline: 'none' }} />
        <button onClick={handleScan} disabled={searching}
          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: T.goldDim, color: T.gold, fontFamily: FONTS.mono, fontSize: 11, cursor: 'pointer' }}>
          {searching ? '...' : '⊡ Lookup'}
        </button>
      </div>
      {error && <div style={{ color: T.red, fontFamily: FONTS.mono, fontSize: 11 }}>{error}</div>}
      {result && (
        <div style={{ background: T.surfaceHover, borderRadius: 8, padding: 12, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim }}>ITEM</div>
            <div style={{ fontFamily: FONTS.body, fontSize: 13, color: T.text, fontWeight: 600 }}>{result.description || result.materialNumber}</div>
          </div>
          <div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim }}>JOB</div>
            <button onClick={() => navigate('/jobs/' + result.job?.id)} style={{ fontFamily: FONTS.mono, fontSize: 12, color: T.gold, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>{result.job?.ref}</button>
          </div>
          <div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim }}>CLIENT</div>
            <div style={{ fontFamily: FONTS.body, fontSize: 12, color: T.text }}>{result.job?.client?.name || '—'}</div>
          </div>
          <div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim }}>BOX</div>
            <div style={{ fontFamily: FONTS.body, fontSize: 12, color: T.text }}>{result.box?.shippingMark || 'Unassigned'}</div>
          </div>
          <StatusBadge status={result.status || 'QR_GENERATED'} color={T.green} />
          {result.qrScannedAt && (
            <div style={{ fontFamily: FONTS.mono, fontSize: 9, color: T.textDim, marginLeft: 'auto' }}>
              Last scan: {new Date(result.qrScannedAt).toLocaleString('fr-FR')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── MAIN ──
export default function Tracking() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    getJobs().then(setJobs).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedJobId) { setTimeline([]); return; }
    setLoading(true);
    getTimeline(selectedJobId).then(t => { setTimeline(t); setLoading(false); }).catch(() => setLoading(false));
  }, [selectedJobId]);

  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const filteredJobs = search ? jobs.filter(j => j.ref?.toLowerCase().includes(search.toLowerCase()) || j.client?.name?.toLowerCase().includes(search.toLowerCase())) : jobs;

  const eventTypes = [...new Set(timeline.map(e => e.eventType))].sort();
  const filteredTimeline = filterType ? timeline.filter(e => e.eventType === filterType) : timeline;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>◎</span>
        <div>
          <div style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: 700, color: T.text }}>Track & Trace</div>
          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: T.textDim }}>Real-time event tracking — continuous from QR/SM creation to delivery</div>
        </div>
      </div>

      {/* QR Lookup */}
      <QRLookup />

      {/* Job Selector */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim, textTransform: 'uppercase' }}>Track Job:</div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ref or client..."
          style={{ padding: '6px 12px', background: T.surfaceHover, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontFamily: FONTS.body, fontSize: 12, width: 180, outline: 'none' }} />
        <select value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)}
          style={{ padding: '6px 12px', background: T.surfaceHover, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontFamily: FONTS.mono, fontSize: 11, minWidth: 300, outline: 'none' }}>
          <option value="">— Choose a job —</option>
          {filteredJobs.map(j => (
            <option key={j.id} value={j.id}>{j.ref} — {j.client?.name || 'N/A'} ({j.status})</option>
          ))}
        </select>
        {timeline.length > 0 && (
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            style={{ padding: '6px 12px', background: T.surfaceHover, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontFamily: FONTS.mono, fontSize: 11, outline: 'none' }}>
            <option value="">All Event Types</option>
            {eventTypes.map(t => <option key={t} value={t}>{EVENT_CONFIG[t]?.label || t}</option>)}
          </select>
        )}
      </div>

      {!selectedJobId ? (
        <EmptyState icon="◎" title="Select a job to view its timeline" sub="Choose a job above, or scan a QR code" />
      ) : loading ? (
        <EmptyState icon="◎" title="Loading timeline..." />
      ) : (
        <div>
          {/* Job Header */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', gap: 20, alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: FONTS.display, fontSize: 16, fontWeight: 700, color: T.gold }}>{selectedJob?.ref}</div>
              <div style={{ fontFamily: FONTS.body, fontSize: 11, color: T.textDim }}>{selectedJob?.client?.name} • {selectedJob?.transportMode}</div>
            </div>
            <StatusBadge status={selectedJob?.status} color={getStatusColor(selectedJob?.status)} />
            <div style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}>
              <KPICard label="Events" value={timeline.length} color={T.blue} />
              <KPICard label="Photos" value={timeline.reduce((s, e) => s + (e.photos?.length || 0), 0)} color={T.orange} />
            </div>
          </div>

          {/* Timeline */}
          <SectionTitle>Event Timeline ({filteredTimeline.length} events)</SectionTitle>
          {filteredTimeline.length === 0 ? (
            <EmptyState icon="◎" title="No events recorded yet" sub="Events are tracked automatically from QR/SM creation through delivery" />
          ) : (
            <div style={{ maxWidth: 700 }}>
              {filteredTimeline.map((event, i) => (
                <TimelineEvent key={event.id || i} event={event} isLast={i === filteredTimeline.length - 1} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
