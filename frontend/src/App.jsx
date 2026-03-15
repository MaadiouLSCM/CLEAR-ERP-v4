import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './components/Login';

// ── Pages ──
import Dashboard from './components/Dashboard/Dashboard';
import JobList from './components/Jobs/JobList';
import JobDetail from './components/Jobs/JobDetail';
import Tasks from './components/Tasks/Tasks';
import Documents from './components/Documents/Documents';
import Communications from './components/Communications/Communications';
import FieldOps from './components/FieldOps/FieldOps';
import Tracking from './components/Tracking/Tracking';
import Reporting from './components/Reporting/Reporting';
import Planning from './components/Planning/Planning';
import LoadingPlan from './components/Planning/LoadingPlan';
import Routing from './components/Planning/Routing';
import Consolidation from './components/Consolidation/Consolidation';
import Responsibility from './components/Planning/Responsibility';
import Warehouse from './components/Warehouse/Warehouse';
import HubConfig from './components/Warehouse/HubConfig';
import HubNetwork from './components/HubNetwork/HubNetwork';
import Procurement from './components/Procurement/Procurement';
import LaneRisk from './components/Procurement/LaneRisk';
import SeaAir from './components/Shipments/SeaAir';
import Commercial from './components/Commercial/Commercial';
import Finance from './components/Finance/Finance';
import Treasury from './components/Finance/Treasury';
import Budget from './components/Finance/Budget';
import Customs from './components/Customs/Customs';
import Trends from './components/Analytics/Trends';
import Governance from './components/Governance/Governance';
import UnitEconomics from './components/UnitEconomics/UnitEconomics';
import CO2 from './components/Analytics/CO2';
import Compliance from './components/Compliance/Compliance';
import QMS from './components/Compliance/QMS';
import HR from './components/Analytics/HR';
import Copilot from './components/Copilot/Copilot';

function ProtectedRoute({ children }) {
  const { isAuth } = useAuth();
  return isAuth ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { isAuth } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={isAuth ? <Navigate to="/" /> : <Login />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        {/* Operations */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/jobs" element={<JobList />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/communications" element={<Communications />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/field-ops" element={<FieldOps />} />
        <Route path="/tracking" element={<Tracking />} />
        <Route path="/reporting" element={<Reporting />} />
        {/* Planning & Logistics */}
        <Route path="/planning" element={<Planning />} />
        <Route path="/loading-plan" element={<LoadingPlan />} />
        <Route path="/routing" element={<Routing />} />
        <Route path="/consolidation" element={<Consolidation />} />
        <Route path="/responsibility" element={<Responsibility />} />
        {/* Warehouse & Hubs */}
        <Route path="/warehouse" element={<Warehouse />} />
        <Route path="/hub-config" element={<HubConfig />} />
        <Route path="/hub-network" element={<HubNetwork />} />
        {/* Procurement */}
        <Route path="/procurement" element={<Procurement />} />
        <Route path="/lane-risk" element={<LaneRisk />} />
        <Route path="/sea-air" element={<SeaAir />} />
        {/* Commercial */}
        <Route path="/commercial" element={<Commercial />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/treasury" element={<Treasury />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/customs" element={<Customs />} />
        {/* Analytics & Intelligence */}
        <Route path="/trends" element={<Trends />} />
        <Route path="/governance" element={<Governance />} />
        <Route path="/unit-economics" element={<UnitEconomics />} />
        <Route path="/co2" element={<CO2 />} />
        {/* Compliance & QMS */}
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/qms" element={<QMS />} />
        {/* HR */}
        <Route path="/hr" element={<HR />} />
        {/* Copilot */}
        <Route path="/copilot" element={<Copilot />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
