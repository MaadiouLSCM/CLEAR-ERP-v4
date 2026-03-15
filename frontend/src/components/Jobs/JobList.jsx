import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { T, FONTS, getStatusColor } from '../../utils/theme';
import { DataTable, StatusBadge, SectionTitle, KPICard, EmptyState } from '../Layout/PageShell';
import { getJobs, createJob, getCorridors } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

// ── Create Job Modal ──
const CreateJobModal = ({ open, onClose, onCreated, corridors }) => {
  const [form, setForm] = useState({
    ref: `LSCM-${Date.now().toString(36).toUpperCase()}`,
    poNumber: '', clientId: '', officeId: '', corridorId: '',
    transportMode: 'SEA', shipmentType: 'CONSOLIDATED', incoterm: 'EXW',
  });
  const [clients, setClients] = useState([]);
  const [offices, setOffices] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    // Load clients and offices from API
    import('../../utils/api').then(api => {
      api.api.get('/organizations?type=CLIENT').then(setClients).catch(() => {});
      api.api.get('/offices').then(setOffices).catch(() => {});
    });
  }, [open]);

  const handleSubmit = async () => {
    if (!form.clientId || !form.officeId || !form.poNumber) {
      setError('Client, Office and PO Number are required');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const job = await createJob(form);
      onCreated(job);
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to create job');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const fieldStyle = {
    width: '100%', padding: '8px 12px', background: T.surfaceHover,
    border: `1px solid ${T.border}`, borderRadius: 8, color: T.text,
    fontFamily: FONTS.body, fontSize: 13, outline: 'none',
  };
  const labelStyle = { fontFamily: FONTS.mono, fontSize: 10, color: T.textDim, marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: 1 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 28, width: 520, maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 4 }}>Create New Job</div>
        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: T.textDim, marginBottom: 20 }}>Initial status: RFC_RECEIVED</div>

        {error && <div style={{ background: T.redDim, color: T.red, padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>Reference</label>
            <input style={{ ...fieldStyle, opacity: 0.6 }} value={form.ref} readOnly />
          </div>
          <div>
            <label style={labelStyle}>PO Number *</label>
            <input style={fieldStyle} value={form.poNumber} onChange={e => setForm({ ...form, poNumber: e.target.value })} placeholder="e.g. 4500012345" />
          </div>
          <div>
            <label style={labelStyle}>Client *</label>
            <select style={fieldStyle} value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>
              <option value="">Select client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Office *</label>
            <select style={fieldStyle} value={form.officeId} onChange={e => setForm({ ...form, officeId: e.target.value })}>
              <option value="">Select office...</option>
              {offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Corridor</label>
            <select style={fieldStyle} value={form.corridorId} onChange={e => setForm({ ...form, corridorId: e.target.value })}>
              <option value="">Select corridor...</option>
              {corridors.map(c => <option key={c.id} value={c.id}>{c.name} ({c.origin} → {c.destination})</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Transport Mode</label>
            <select style={fieldStyle} value={form.transportMode} onChange={e => setForm({ ...form, transportMode: e.target.value })}>
              <option value="SEA">Sea Freight</option>
              <option value="AIR">Air Freight</option>
              <option value="ROAD">Road</option>
              <option value="MULTIMODAL">Multimodal</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Shipment Type</label>
            <select style={fieldStyle} value={form.shipmentType} onChange={e => setForm({ ...form, shipmentType: e.target.value })}>
              <option value="CONSOLIDATED">Consolidation (via hubs)</option>
              <option value="DIRECT_SHIP">Direct Shipment</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Incoterm</label>
            <select style={fieldStyle} value={form.incoterm} onChange={e => setForm({ ...form, incoterm: e.target.value })}>
              {['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'].map(i =>
                <option key={i} value={i}>{i}</option>
              )}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 20px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'transparent', color: T.textDim, fontFamily: FONTS.body, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} style={{ padding: '8px 24px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${T.gold}, ${T.orange})`, color: T.bg, fontFamily: FONTS.display, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Creating...' : 'Create Job'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function JobList() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMode, setFilterMode] = useState('');
  const [corridors, setCorridors] = useState([]);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) setFilterStatus(statusParam);
    getJobs().then(j => { setJobs(j); setLoading(false); }).catch(() => setLoading(false));
    getCorridors().then(setCorridors).catch(() => {});
  }, []);

  const filtered = jobs.filter(j => {
    if (filterStatus && j.status !== filterStatus) return false;
    if (filterMode && j.transportMode !== filterMode) return false;
    if (search) {
      const q = search.toLowerCase();
      return (j.ref?.toLowerCase().includes(q) || j.poNumber?.toLowerCase().includes(q) || j.client?.name?.toLowerCase().includes(q) || j.expediter?.name?.toLowerCase().includes(q));
    }
    return true;
  });

  const statuses = [...new Set(jobs.map(j => j.status))].sort();
  const selectStyle = { padding: '6px 10px', background: T.surfaceHover, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontFamily: FONTS.mono, fontSize: 11, outline: 'none' };

  if (loading) return <EmptyState icon="◉" title="Loading jobs..." />;

  return (
    <div>
      {/* ── Header with Create Button ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: 700, color: T.text }}>All Jobs ({filtered.length})</div>
          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: T.textDim }}>{jobs.length} total in system</div>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${T.gold}, ${T.orange})`, color: T.bg, fontFamily: FONTS.display, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>+</span> New Job
        </button>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ref, PO, client..."
          style={{ ...selectStyle, width: 220, fontFamily: FONTS.body, fontSize: 12 }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={filterMode} onChange={e => setFilterMode(e.target.value)} style={selectStyle}>
          <option value="">All Modes</option>
          <option value="SEA">Sea</option>
          <option value="AIR">Air</option>
          <option value="ROAD">Road</option>
          <option value="MULTIMODAL">Multimodal</option>
        </select>
        {(filterStatus || filterMode || search) && (
          <button onClick={() => { setFilterStatus(''); setFilterMode(''); setSearch(''); }}
            style={{ ...selectStyle, cursor: 'pointer', color: T.red, borderColor: T.red + '44' }}>
            ✕ Clear filters
          </button>
        )}
      </div>

      {/* ── Quick Stats ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <KPICard label="Sea Freight" value={jobs.filter(j => j.transportMode === 'SEA').length} color={T.blue} />
        <KPICard label="Air Freight" value={jobs.filter(j => j.transportMode === 'AIR').length} color={T.purple} />
        <KPICard label="Consolidated" value={jobs.filter(j => j.shipmentType === 'CONSOLIDATED').length} color={T.teal} />
        <KPICard label="Direct Ship" value={jobs.filter(j => j.shipmentType === 'DIRECT_SHIP').length} color={T.gold} />
      </div>

      {/* ── Jobs Table ── */}
      {filtered.length === 0 ? (
        <EmptyState icon="◉" title="No jobs found" sub="Try adjusting your filters or create a new job" />
      ) : (
        <DataTable
          headers={['Ref', 'Client', 'PO', 'Mode', 'Type', 'Status', 'Expediter', 'Updated']}
          rows={filtered.map(j => [
            j.ref,
            j.client?.name || '—',
            j.poNumber || '—',
            j.transportMode,
            j.shipmentType === 'CONSOLIDATED' ? 'Consol.' : 'Direct',
            <StatusBadge status={j.status} color={getStatusColor(j.status)} />,
            j.expediter?.name || '—',
            new Date(j.updatedAt).toLocaleDateString('fr-FR'),
          ])}
          onRowClick={row => {
            const j = filtered.find(j => j.ref === row[0]);
            if (j) navigate('/jobs/' + j.id);
          }}
        />
      )}

      {/* ── Create Modal ── */}
      <CreateJobModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={job => {
          setJobs(prev => [job, ...prev]);
          navigate('/jobs/' + job.id);
        }}
        corridors={corridors}
      />
    </div>
  );
}
