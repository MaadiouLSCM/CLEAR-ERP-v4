// CLEAR ERP v6.0 — API Client
// Phase 0 + Phase 1 + Phase 2 (Warehouse & FIFO)

const RAILWAY_API = 'https://friendly-achievement-production.up.railway.app/api';
const BASE = RAILWAY_API;

const getToken = () => localStorage.getItem('clear_token');

const headers = () => ({
  'Content-Type': 'application/json',
  ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
});

const handle = async (res) => {
  if (res.status === 401) {
    localStorage.removeItem('clear_token');
    window.location.href = '/login';
    return;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'API Error');
  }
  return res.json();
};

export const api = {
  get: (path) => fetch(`${BASE}${path}`, { headers: headers() }).then(handle),
  post: (path, body) => fetch(`${BASE}${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(handle),
  patch: (path, body) => fetch(`${BASE}${path}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(body) }).then(handle),
  delete: (path) => fetch(`${BASE}${path}`, { method: 'DELETE', headers: headers() }).then(handle),
};

// ── Auth ──
export const login = (email, password) => api.post('/auth/login', { email, password });
export const getMe = () => api.get('/auth/me');

// ── Jobs ──
export const getJobs = (params = '') => api.get(`/jobs${params ? '?' + params : ''}`);
export const getJob = (id) => api.get(`/jobs/${id}`);
export const createJob = (data) => api.post('/jobs', data);
export const updateJob = (id, data) => api.patch(`/jobs/${id}`, data);
export const transitionJob = (id, status) => api.post(`/jobs/${id}/transition`, { status });
export const getDashboard = () => api.get('/jobs/stats/dashboard');

// ── Items & Boxes ──
export const getItems = (jobId) => api.get(`/items?jobId=${jobId}`);
export const generateQR = (itemId) => api.post(`/items/${itemId}/generate-qr`);
export const bulkQR = (jobId) => api.post(`/items/bulk-qr/${jobId}`);
export const lookupQR = (code) => api.get(`/qr/${code}`);
export const getBoxes = (jobId) => api.get(`/boxes?jobId=${jobId}`);

// ── Documents (Phase 1 Enhanced) ──
export const getDocuments = (jobId) => api.get(`/documents?jobId=${jobId}`);
export const getKitStatus = (jobId) => api.get(`/documents/kit-status/${jobId}`);
export const getJCRCheck = (jobId) => api.get(`/documents/jcr-check/${jobId}`);
export const generateDocument = (data) => api.post('/documents/generate', data);
export const verifyDocument = (id) => api.post(`/documents/${id}/verify`, {});

// ── Tasks ──
export const getTasks = (params = '') => api.get(`/tasks${params ? '?' + params : ''}`);
export const getKanban = (assigneeId) => api.get(`/tasks/kanban${assigneeId ? '?assigneeId=' + assigneeId : ''}`);
export const getOverdueTasks = () => api.get('/tasks/overdue');
export const transitionTask = (id, status) => api.post(`/tasks/${id}/transition`, { status });

// ── Tracking ──
export const getTimeline = (jobId) => api.get(`/tracking/timeline/${jobId}`);

// ── Shipments ──
export const getShipments = (params = '') => api.get(`/shipments${params ? '?' + params : ''}`);
export const getCorridors = () => api.get('/corridors');

// ── Warehouse & FIFO (Phase 2 Enhanced) ──
export const getHubs = () => api.get('/hubs');
export const getHub = (id) => api.get(`/hubs/${id}`);
export const getHubCapacity = (id) => api.get(`/hubs/${id}/capacity`);
export const getHubCapacityHistory = (id, days = 30) => api.get(`/hubs/${id}/capacity-history?days=${days}`);
export const takeSnapshot = (id) => api.post(`/hubs/${id}/snapshot`, {});
export const getStock = (hubId, status) => api.get(`/stock?hubId=${hubId}${status ? '&status=' + status : ''}`);
export const getStockSummary = (hubId) => api.get(`/stock/summary?hubId=${hubId}`);
export const receiveStock = (data) => api.post('/stock/receive', data);
export const dispatchStock = (id, notes) => api.post(`/stock/${id}/dispatch`, { notes });
export const transferStock = (id, toZoneId, reason) => api.post(`/stock/${id}/transfer`, { toZoneId, reason });
export const getStockMovements = (id) => api.get(`/stock/${id}/movements`);
export const getQueue = (hubId, corridorId) => api.get(`/queue?hubId=${hubId}${corridorId ? '&corridorId=' + corridorId : ''}`);
export const addToQueue = (queueId, stockItemId) => api.post(`/queue/${queueId}/add`, { stockItemId });
export const recalculateQueue = (queueId) => api.post(`/queue/${queueId}/recalculate`, {});
export const overridePriority = (posId, override, reason, userId) => api.post(`/queue/position/${posId}/override`, { override, reason, userId });
export const getFIFOViolations = (hubId) => api.get(`/fifo-violations${hubId ? '?hubId=' + hubId : ''}`);
export const runNightlyBatch = () => api.post('/warehouse/nightly-batch', {});

// ── Organizations (Phase 1) ──
export const getOrganizations = (type) => api.get(`/organizations${type ? '?type=' + type : ''}`);
export const getOrganization = (id) => api.get(`/organizations/${id}`);
export const getOffices = () => api.get('/offices');
export const getCorridorDetail = (id) => api.get(`/corridors/${id}`);
export const getExpediters = () => api.get('/users/expediters');

// ── Finance ──
export const getFinanceDashboard = () => api.get('/finance/dashboard');
export const getInvoices = (params = '') => api.get(`/finance/invoices${params ? '?' + params : ''}`);
export const autoPrice = (jobId) => api.post(`/finance/auto-price/${jobId}`);
export const getCostSheet = (jobId) => api.get(`/finance/cost-sheet/${jobId}`);

// ── Communications ──
export const getNotifications = () => api.get('/notifications?unreadOnly=true');
export const getUnreadCount = () => api.get('/notifications/count');

// ── Compliance ──
export const getCertifications = () => api.get('/compliance/certifications');
export const getExpiring = (days = 90) => api.get(`/compliance/certifications/expiring?days=${days}`);
export const getActiveRenewals = () => api.get('/compliance/renewals/active');

// ── Analytics ──
export const getOpsDashboard = () => api.get('/analytics/dashboard');
export const getKPIs = () => api.get('/analytics/kpis');
export const calculateKPIs = () => api.post('/analytics/kpis/calculate');
export const getAlerts = () => api.get('/analytics/alerts');

// ── Consolidation ──
export const getPendingRequests = () => api.get('/consolidation/requests');
export const getRecommendations = () => api.get('/consolidation/recommendations');
export const generateRecommendations = (corridorId, mode) => api.post('/consolidation/recommend', { corridorId, mode });

// ── Reporting ──
export const getReportTypes = () => api.get('/reports/types');
export const generateDSR = () => api.get('/reports/dsr');
export const generateWSR = () => api.get('/reports/wsr');
