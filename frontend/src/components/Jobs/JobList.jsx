import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { T, getStatusColor } from '../../utils/theme';
import { DataTable, StatusBadge, SectionTitle } from '../Layout/PageShell';
import { getJobs } from '../../utils/api';

export default function JobList() {
  const [jobs, setJobs] = useState([]);
  const navigate = useNavigate();
  useEffect(() => { getJobs().then(setJobs).catch(() => {}); }, []);
  return (<div>
    <SectionTitle>All Jobs ({jobs.length})</SectionTitle>
    <DataTable headers={["Ref", "Client", "PO", "Mode", "Status", "Expediter"]}
      rows={jobs.map(j => [j.ref, j.client?.name, j.poNumber, j.transportMode, <StatusBadge status={j.status} color={getStatusColor(j.status)} />, j.expediter?.name || "—"])}
      onRowClick={row => { const j = jobs.find(j => j.ref === row[0]); if (j) navigate("/jobs/" + j.id); }} />
  </div>);
}