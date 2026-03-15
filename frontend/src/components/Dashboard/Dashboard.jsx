import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { T, FONTS, getStatusColor } from '../../utils/theme';
import { KPICard, DataTable, StatusBadge, SectionTitle } from '../Layout/PageShell';
import { getOpsDashboard, getJobs } from '../../utils/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const navigate = useNavigate();
  useEffect(() => {
    getOpsDashboard().then(setStats).catch(() => {});
    getJobs().then(j => setJobs(j.slice(0, 15))).catch(() => {});
  }, []);

  return (<div>
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
      <KPICard label="Total Jobs" value={stats?.totalJobs || 0} color={T.gold} />
      <KPICard label="Active" value={stats?.activeJobs || 0} color={T.blue} />
      <KPICard label="Delivered (month)" value={stats?.deliveredThisMonth || 0} color={T.green} />
    </div>
    <SectionTitle>Active Jobs</SectionTitle>
    <DataTable headers={["Ref", "Client", "Mode", "Status", "Updated"]}
      rows={jobs.map(j => [j.ref, j.client?.name || "—", j.transportMode, <StatusBadge status={j.status} color={getStatusColor(j.status)} />, new Date(j.updatedAt).toLocaleDateString("fr-FR")])}
      onRowClick={row => { const j = jobs.find(j => j.ref === row[0]); if (j) navigate("/jobs/" + j.id); }} />
  </div>);
}