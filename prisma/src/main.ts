import express from ‘express’;
import cors from ‘cors’;
import helmet from ‘helmet’;
import { PrismaClient } from ‘@prisma/client’;
import bcrypt from ‘bcryptjs’;
import jwt from ‘jsonwebtoken’;
import swaggerUi from ‘swagger-ui-express’;
import swaggerJsdoc from ‘swagger-jsdoc’;

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || ‘clear-erp-v4-secret-2026’;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: ‘10mb’ }));

// ============================================================
// SWAGGER
// ============================================================

const swaggerOptions = {
definition: {
openapi: ‘3.0.0’,
info: { title: ‘CLEAR ERP v4.2 API — LSCM Ltd’, version: ‘4.2.0’, description: ‘Consolidated Logistics ERP for Advanced Resource Planning’ },
components: { securitySchemes: { bearerAuth: { type: ‘http’, scheme: ‘bearer’, bearerFormat: ‘JWT’ } } },
security: [{ bearerAuth: [] }],
},
apis: [’./src/main.ts’],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use(’/api/docs’, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ============================================================
// AUTH MIDDLEWARE
// ============================================================

function auth(req: any, res: any, next: any) {
const token = req.headers.authorization?.split(’ ’)[1];
if (!token) return res.status(401).json({ error: ‘Token required’ });
try { req.user = jwt.verify(token, JWT_SECRET); next(); }
catch { res.status(401).json({ error: ‘Invalid token’ }); }
}

// ============================================================
// AUDIT HELPER
// ============================================================

async function audit(userId: string | null, action: string, entityType: string, entityId: string, oldVal?: any, newVal?: any) {
await prisma.auditLog.create({
data: { userId: userId || ‘SYSTEM’, action, entityType, entityId, oldValue: oldVal ? JSON.stringify(oldVal) : null, newValue: newVal ? JSON.stringify(newVal) : null }
}).catch(() => {});
}

// ============================================================
// HEALTH & ROOT
// ============================================================

app.get(’/api/health’, (_, res) => {
res.json({ status: ‘ok’, app: ‘CLEAR ERP’, version: ‘4.2.0’, timestamp: new Date() });
});

app.get(’/’, (_, res) => {
res.json({
app: ‘CLEAR ERP v4.2’,
company: ‘LSCM Ltd’,
docs: ‘/api/docs’,
health: ‘/api/health’,
version: ‘4.2.0’
});
});

// ============================================================
// AUTH ROUTES
// ============================================================

/**

- @swagger
- /api/auth/login:
- post:
- ```
  tags: [Auth]
  ```
- ```
  summary: Login
  ```
- ```
  requestBody:
  ```
- ```
    content:
  ```
- ```
      application/json:
  ```
- ```
        schema:
  ```
- ```
          properties:
  ```
- ```
            email: { type: string }
  ```
- ```
            password: { type: string }
  ```

*/
app.post(’/api/auth/login’, async (req, res) => {
const { email, password } = req.body;
try {
const user = await prisma.user.findUnique({ where: { email } });
if (!user || !await bcrypt.compare(password, user.passwordHash))
return res.status(401).json({ error: ‘Invalid credentials’ });
const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: ‘24h’ });
await audit(user.id, ‘LOGIN’, ‘User’, user.id);
res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
} catch (e: any) { res.status(500).json({ error: ‘Login failed’ }); }
});

app.get(’/api/auth/me’, auth, async (req: any, res) => {
const user = await prisma.user.findUnique({
where: { id: req.user.id },
select: { id: true, name: true, email: true, role: true, phone: true, officeId: true, isActive: true, createdAt: true }
});
res.json(user);
});

/**

- @swagger
- /api/auth/register:
- post:
- ```
  tags: [Auth]
  ```
- ```
  summary: Register new user (Admin only)
  ```

*/
app.post(’/api/auth/register’, auth, async (req: any, res) => {
try {
if (req.user.role !== ‘ADMIN’) return res.status(403).json({ error: ‘Admin only’ });
const { email, password, name, role, officeId, phone } = req.body;
const passwordHash = await bcrypt.hash(password, 12);
const user = await prisma.user.create({ data: { email, passwordHash, name, role, officeId, phone } });
await audit(req.user.id, ‘CREATE’, ‘User’, user.id, null, req.body);
res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ============================================================
// OFFICES
// ============================================================

app.get(’/api/offices’, auth, async (_, res) => {
const offices = await prisma.lSCMOffice.findMany({ orderBy: { name: ‘asc’ } });
res.json(offices);
});

app.post(’/api/offices’, auth, async (req: any, res) => {
try {
const office = await prisma.lSCMOffice.create({ data: req.body });
await audit(req.user.id, ‘CREATE’, ‘LSCMOffice’, office.id, null, req.body);
res.status(201).json(office);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ============================================================
// CLIENTS
// ============================================================

app.get(’/api/clients’, auth, async (_, res) => {
const clients = await prisma.client.findMany({ orderBy: { name: ‘asc’ } });
res.json(clients);
});

app.post(’/api/clients’, auth, async (req: any, res) => {
try {
const client = await prisma.client.create({ data: req.body });
await audit(req.user.id, ‘CREATE’, ‘Client’, client.id, null, req.body);
res.status(201).json(client);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.get(’/api/clients/:id’, auth, async (req, res) => {
const client = await prisma.client.findUnique({ where: { id: req.params.id }, include: { jobs: true } });
if (!client) return res.status(404).json({ error: ‘Client not found’ });
res.json(client);
});

// ============================================================
// SUPPLIERS
// ============================================================

app.get(’/api/suppliers’, auth, async (_, res) => {
const suppliers = await prisma.supplier.findMany({ orderBy: { name: ‘asc’ } });
res.json(suppliers);
});

app.post(’/api/suppliers’, auth, async (req: any, res) => {
try {
const supplier = await prisma.supplier.create({ data: req.body });
await audit(req.user.id, ‘CREATE’, ‘Supplier’, supplier.id, null, req.body);
res.status(201).json(supplier);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ============================================================
// AGENTS
// ============================================================

app.get(’/api/agents’, auth, async (_, res) => {
const agents = await prisma.agent.findMany({ orderBy: { name: ‘asc’ } });
res.json(agents);
});

app.post(’/api/agents’, auth, async (req: any, res) => {
try {
const agent = await prisma.agent.create({ data: req.body });
await audit(req.user.id, ‘CREATE’, ‘Agent’, agent.id, null, req.body);
res.status(201).json(agent);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ============================================================
// CARRIERS
// ============================================================

app.get(’/api/carriers’, auth, async (_, res) => {
const carriers = await prisma.carrier.findMany({ orderBy: { name: ‘asc’ } });
res.json(carriers);
});

app.post(’/api/carriers’, auth, async (req: any, res) => {
try {
const carrier = await prisma.carrier.create({ data: req.body });
await audit(req.user.id, ‘CREATE’, ‘Carrier’, carrier.id, null, req.body);
res.status(201).json(carrier);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ============================================================
// JOBS
// ============================================================

app.get(’/api/jobs’, auth, async (req, res) => {
const { status, clientId, search } = req.query as any;
const where: any = {};
if (status) where.status = status;
if (clientId) where.clientId = clientId;
if (search) where.OR = [
{ jobNumber: { contains: search, mode: ‘insensitive’ } },
{ description: { contains: search, mode: ‘insensitive’ } },
];
const jobs = await prisma.job.findMany({
where,
include: {
client: { select: { name: true, code: true } },
office: { select: { name: true } },
_count: { select: { purchaseOrders: true, documents: true, tasks: true } }
},
orderBy: { updatedAt: ‘desc’ },
});
res.json(jobs);
});

app.get(’/api/jobs/:id’, auth, async (req, res) => {
const job = await prisma.job.findUnique({
where: { id: req.params.id },
include: {
client: true,
office: true,
purchaseOrders: { include: { items: true, pickups: true, supplier: true } },
shipments: { include: { transportLegs: true, bookings: true } },
documents: true,
tasks: { orderBy: { createdAt: ‘asc’ } },
validations: true,
trackingEvents: { orderBy: { eventDate: ‘desc’ } },
customs: true,
deliveries: true,
documentKits: true,
},
});
if (!job) return res.status(404).json({ error: ‘Job not found’ });
res.json(job);
});

app.post(’/api/jobs’, auth, async (req: any, res) => {
try {
const job = await prisma.job.create({ data: req.body });
await audit(req.user.id, ‘CREATE’, ‘Job’, job.id, null, req.body);
res.status(201).json(job);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.put(’/api/jobs/:id’, auth, async (req: any, res) => {
try {
const old = await prisma.job.findUnique({ where: { id: req.params.id } });
const job = await prisma.job.update({ where: { id: req.params.id }, data: req.body });
await audit(req.user.id, ‘UPDATE’, ‘Job’, job.id, old, req.body);
if (req.body.status && req.body.status !== old?.status) {
await prisma.trackingEvent.create({
data: { jobId: job.id, eventType: ‘STATUS_CHANGE’, description: `${old?.status} → ${req.body.status}`, triggeredById: req.user.id }
});
}
res.json(job);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.get(’/api/jobs/stats/dashboard’, auth, async (_, res) => {
const [total, byStatus, byClient, recentJobs] = await Promise.all([
prisma.job.count(),
prisma.job.groupBy({ by: [‘status’], _count: true }),
prisma.job.groupBy({ by: [‘clientId’], _count: true, orderBy: { _count: { clientId: ‘desc’ } }, take: 10 }),
prisma.job.findMany({ take: 10, orderBy: { updatedAt: ‘desc’ }, include: { client: { select: { name: true } } } }),
]);
res.json({ total, byStatus, byClient, recentJobs });
});

// ============================================================
// PURCHASE ORDERS
// ============================================================

app.get(’/api/purchase-orders’, auth, async (req, res) => {
const { jobId, status, search } = req.query as any;
const where: any = {};
if (jobId) where.jobId = jobId;
if (status) where.status = status;
if (search) where.OR = [
{ poNumber: { contains: search, mode: ‘insensitive’ } },
{ description: { contains: search, mode: ‘insensitive’ } },
];
const pos = await prisma.purchaseOrder.findMany({
where,
include: {
client: { select: { name: true } },
supplier: { select: { name: true } },
job: { select: { jobNumber: true } },
_count: { select: { items: true, pickups: true } },
},
orderBy: { updatedAt: ‘desc’ },
});
res.json(pos);
});

app.get(’/api/purchase-orders/:id’, auth, async (req, res) => {
const po = await prisma.purchaseOrder.findUnique({
where: { id: req.params.id },
include: {
items: { include: { qrSticker: true } },
pickups: true,
documents: true,
client: true,
supplier: true,
job: true,
consolidationItems: { include: { consolidation: true } },
},
});
if (!po) return res.status(404).json({ error: ‘PO not found’ });
res.json(po);
});

app.post(’/api/purchase-orders’, auth, async (req: any, res) => {
try {
const po = await prisma.purchaseOrder.create({ data: req.body });
await audit(req.user.id, ‘CREATE’, ‘PurchaseOrder’, po.id, null, req.body);
res.status(201).json(po);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.put(’/api/purchase-orders/:id’, auth, async (req: any, res) => {
try {
const old = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
const po = await prisma.purchaseOrder.update({ where: { id: req.params.id }, data: req.body });
await audit(req.user.id, ‘UPDATE’, ‘PurchaseOrder’, po.id, old, req.body);
res.json(po);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ============================================================
// PO ITEMS
// ============================================================

app.post(’/api/purchase-orders/:poId/items’, auth, async (req: any, res) => {
try {
const item = await prisma.purchaseOrderItem.create({ data: { …req.body, poId: req.params.poId } });
await prisma.purchaseOrder.update({ where: { id: req.params.poId }, data: { itemCount: { increment: 1 } } });
res.status(201).json(item);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ============================================================
// QR STICKERS
// ============================================================

app.post(’/api/qr-stickers’, auth, async (req: any, res) => {
try {
const { itemId, poNumber } = req.body;
const code = `LSCM:${poNumber}:${itemId.slice(-6)}`;
const qr = await prisma.qRSticker.create({ data: { code, itemId } });
res.status(201).json(qr);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.get(’/api/qr/:code’, auth, async (req, res) => {
const qr = await prisma.qRSticker.findUnique({
where: { code: req.params.code },
include: { item: { include: { po: { include: { job: true } } } } }
});
if (!qr) return res.status(404).json({ error: ‘QR code not found’ });
res.json(qr);
});

// ============================================================
// PICKUPS
// ============================================================

app.get(’/api/pickups’, auth, async (_, res) => {
const pickups = await prisma.pickup.findMany({
include: { po: { select: { poNumber: true, description: true } }, agent: { select: { name: true } } },
orderBy: { scheduledDate: ‘asc’ },
});
res.json(pickups);
});

app.post(’/api/pickups’, auth, async (req: any, res) => {
try {
const pickup = await prisma.pickup.create({ data: req.body });
await prisma.purchaseOrder.update({ where: { id: req.body.poId }, data: { status: ‘PICKUP_SCHEDULED’ } });
await prisma.trackingEvent.create({
data: { poId: req.body.poId, eventType: ‘PICKUP_SCHEDULED’, description: `Pickup scheduled: ${pickup.pickupRef}`, triggeredById: req.user.id }
});
res.status(201).json(pickup);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.put(’/api/pickups/:id’, auth, async (req: any, res) => {
try {
const pickup = await prisma.pickup.update({ where: { id: req.params.id }, data: req.body });
if (req.body.status === ‘COMPLETED’) {
await prisma.purchaseOrder.update({ where: { id: pickup.poId }, data: { status: ‘AT_ORIGIN_WAREHOUSE’ } });
await prisma.trackingEvent.create({
data: { poId: pickup.poId, eventType: ‘PICKED_UP’, description: `Pickup completed: ${pickup.pickupRef}`, triggeredById: req.user.id }
});
}
res.json(pickup);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ============================================================
// CONSOLIDATIONS
// ============================================================

app.get(’/api/consolidations’, auth, async (_, res) => {
const consols = await prisma.consolidation.findMany({
include: {
items: { include: { po: { select: { poNumber: true, description: true } } } },
boxes: { include: { shippingMark: true } },
shipment: true,
},
orderBy: { updatedAt: ‘desc’ },
});
res.json(consols);
});

app.post(’/api/consolidations’, auth, async (req: any, res) => {
try {
const consol = await prisma.consolidation.create({ data: req.body });
await audit(req.user.id, ‘CREATE’, ‘Consolidation’, consol.id, null, req.body);
res.status(201).json(consol);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.post(’/api/consolidations/:id/items’, auth, async (req: any, res) => {
try {
const item = await prisma.consolidationItem.create({ data: { …req.body, consolidationId: req.params.id } });
// Recalculate totals
const items = await prisma.consolidationItem.findMany({ where: { consolidationId: req.params.id } });
await prisma.consolidation.update({
where: { id: req.params.id },
data: {
totalWeightKg: items.reduce((s, i) => s + (i.weightKg || 0), 0),
totalVolumeCbm: items.reduce((s, i) => s + (i.volumeCbm || 0), 0),
totalPackages: items.reduce((s, i) => s + i.packages, 0),
}
});
res.status(201).json(item);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ============================================================
// SHIPMENTS
// ============================================================

app.get(’/api/shipments’, auth, async (_, res) => {
const shipments = await prisma.shipment.findMany({
include: {
job: { select: { jobNumber: true, client: { select: { name: true } } } },
consolidation: true,
transportLegs: { include: { carrier: { select: { name: true } } }, orderBy: { legNumber: ‘asc’ } },
bookings: true,
},
orderBy: { updatedAt: ‘desc’ },
});
res.json(shipments);
});

app.post(’/api/shipments’, auth, async (req: any, res) => {
try {
const shipment = await prisma.shipment.create({ data: req.body });
await audit(req.user.id, ‘CREATE’, ‘Shipment’, shipment.id, null, req.body);
res.status(201).json(shipment);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.put(’/api/shipments/:id’, auth, async (req: any, res) => {
try {
const shipment = await prisma.shipment.update({ where: { id: req.params.id }, data: req.body });
res.json(shipment);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ============================================================
// TRANSPORT LEGS
// ============================================================

app.post(’/api/shipments/:shipmentId/legs’, auth, async (req: any, res) => {
try {
const leg = await prisma.transportLeg.create({ data: { …req.body, shipmentId: req.params.shipmentId } });
res.status(201).json(leg);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ============================================================
// BOOKINGS
// ============================================================

app.post(’/api/shipments/:shipmentId/bookings’, auth, async (req: any, res) => {
try {
const booking = await prisma.booking.create({ data: { …req.body, shipmentId: req.params.shipmentId } });
res.status(201).json(booking);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ============================================================
// CUSTOMS
// ============================================================

app.get(’/api/customs’, auth, async (_, res) => {
const customs = await prisma.customsDeclaration.findMany({
include: { job: { select: { jobNumber: true, client: { select: { name: true } } } } },
orderBy: { updatedAt: ‘desc’ },
});
res.json(customs);
});

app.post(’/api/customs’, auth, async (req: any, res) => {
try {
const decl = await prisma.customsDeclaration.create({ data: req.body });
await audit(req.user.id, ‘CREATE’, ‘CustomsDeclaration’, decl.id, null, req.body);
res.status(201).json(decl);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.put(’/api/customs/:id’, auth, async (req: any, res) => {
try {
const decl = await prisma.customsDeclaration.update({ where: { id: req.params.id }, data: req.body });
if (req.body.status === ‘CLEARED’) {
await prisma.trackingEvent.create({
data: { jobId: decl.jobId, eventType: ‘CUSTOMS_CLEARED’, description: `Customs cleared: ${decl.declarationRef}`, triggeredById: req.user.id }
});
}
res.json(decl);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ============================================================
// DELIVERIES
// ============================================================

app.get(’/api/deliveries’, auth, async (_, res) => {
const deliveries = await prisma.delivery.findMany({
include: { job: { select: { jobNumber: true, client: { select: { name: true } } } } },
orderBy: { updatedAt: ‘desc’ },
});
res.json(deliveries);
});

app.post(’/api/deliveries’, auth, async (req: any, res) => {
try {
const delivery = await prisma.delivery.create({ data: req.body });
res.status(201).json(delivery);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.put(’/api/deliveries/:id’, auth, async (req: any, res) => {
try {
const delivery = await prisma.delivery.update({ where: { id: req.params.id }, data: req.body });
if (req.body.status === ‘DELIVERED’ || req.body.status === ‘POD_RECEIVED’) {
await prisma.trackingEvent.create({
data: { jobId: delivery.jobId, eventType: req.body.status, description: `Delivery: ${delivery.deliveryRef}`, triggeredById: req.user.id }
});
}
res.json(delivery);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ============================================================
// DOCUMENTS
// ============================================================

app.get(’/api/documents’, auth, async (req, res) => {
const { jobId, type, status } = req.query as any;
const where: any = {};
if (jobId) where.jobId = jobId;
if (type) where.type = type;
if (status) where.status = status;
const docs = await prisma.document.findMany({
where,
include: { job: { select: { jobNumber: true } }, uploadedBy: { select: { name: true } } },
orderBy: { updatedAt: ‘desc’ },
});
res.json(docs);
});

app.post(’/api/documents’, auth, async (req: any, res) => {
try {
const doc = await prisma.document.create({ data: { …req.body, uploadedById: req.user.id } });
await audit(req.user.id, ‘CREATE’, ‘Document’, doc.id, null, req.body);
res.status(201).json(doc);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.put(’/api/documents/:id’, auth, async (req: any, res) => {
try {
const doc = await prisma.document.update({ where: { id: req.params.id }, data: { …req.body, uploadedById: req.user.id } });
// Check if all docs approved → trigger GREEN_LIGHT
if (req.body.status === ‘APPROVED’) {
const allDocs = await prisma.document.findMany({ where: { jobId: doc.jobId } });
if (allDocs.every(d => d.status === ‘APPROVED’)) {
await prisma.job.update({ where: { id: doc.jobId }, data: { status: ‘GREEN_LIGHT’ } });
await prisma.trackingEvent.create({
data: { jobId: doc.jobId, eventType: ‘GREEN_LIGHT_RECEIVED’, description: ‘All documents approved — GREEN LIGHT’, triggeredById: req.user.id }
});
}
}
res.json(doc);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.get(’/api/documents/checklist/:jobId’, auth, async (req, res) => {
const docs = await prisma.document.findMany({ where: { jobId: req.params.jobId } });
const job = await prisma.job.findUnique({ where: { id: req.params.jobId } });
const required = job?.freightMode === ‘AIR’
? [‘COMMERCIAL_INVOICE’, ‘PACKING_LIST’, ‘CCVO’, ‘AWB’]
: [‘COMMERCIAL_INVOICE’, ‘PACKING_LIST’, ‘CCVO’, ‘FORM_C’, ‘BILL_OF_LADING’];
const checklist = required.map(type => {
const doc = docs.find(d => d.type === type);
return { type, status: doc?.status || ‘MISSING’, docId: doc?.id };
});
res.json({ jobId: req.params.jobId, checklist, complete: checklist.every(d => d.status === ‘APPROVED’) });
});

// ============================================================
// DOCUMENT KITS
// ============================================================

app.get(’/api/document-kits/:jobId’, auth, async (req, res) => {
const kits = await prisma.documentKit.findMany({ where: { jobId: req.params.jobId } });
res.json(kits);
});

app.post(’/api/document-kits’, auth, async (req: any, res) => {
try {
const kit = await prisma.documentKit.create({ data: req.body });
res.status(201).json(kit);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ============================================================
// VALIDATIONS (Dual Mode)
// ============================================================

app.get(’/api/validations’, auth, async (req, res) => {
const { jobId } = req.query as any;
const where: any = {};
if (jobId) where.jobId = jobId;
const validations = await prisma.validation.findMany({
where,
include: { validatedBy: { select: { name: true, role: true } }, job: { select: { jobNumber: true } } },
orderBy: { validatedAt: ‘desc’ },
});
res.json(validations);
});

app.post(’/api/validations’, auth, async (req: any, res) => {
try {
const validation = await prisma.validation.create({
data: { …req.body, validatedById: req.user.id, ipAddress: req.ip }
});
await audit(req.user.id, ‘VALIDATE’, ‘Validation’, validation.id, null, req.body);
res.status(201).json(validation);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ============================================================
// TRACKING EVENTS
// ============================================================

app.get(’/api/tracking’, auth, async (req, res) => {
const { jobId, poId } = req.query as any;
const where: any = {};
if (jobId) where.jobId = jobId;
if (poId) where.poId = poId;
const events = await prisma.trackingEvent.findMany({
where,
include: { triggeredBy: { select: { name: true } } },
orderBy: { eventDate: ‘desc’ },
});
res.json(events);
});

app.post(’/api/tracking’, auth, async (req: any, res) => {
try {
const event = await prisma.trackingEvent.create({ data: { …req.body, triggeredById: req.user.id } });
res.status(201).json(event);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ============================================================
// TASKS
// ============================================================

app.get(’/api/tasks’, auth, async (req, res) => {
const { jobId, status, assignedToId } = req.query as any;
const where: any = {};
if (jobId) where.jobId = jobId;
if (status) where.status = status;
if (assignedToId) where.assignedToId = assignedToId;
const tasks = await prisma.task.findMany({
where,
include: { job: { select: { jobNumber: true } }, assignedTo: { select: { name: true } } },
orderBy: { createdAt: ‘asc’ },
});
res.json(tasks);
});

app.post(’/api/tasks’, auth, async (req: any, res) => {
try {
const task = await prisma.task.create({ data: req.body });
res.status(201).json(task);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.put(’/api/tasks/:id’, auth, async (req: any, res) => {
try {
const data: any = { …req.body };
if (req.body.status === ‘IN_PROGRESS’ && !data.startedAt) data.startedAt = new Date();
if (req.body.status === ‘COMPLETED’ && !data.completedAt) data.completedAt = new Date();
const task = await prisma.task.update({ where: { id: req.params.id }, data });
res.json(task);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ============================================================
// INVOICES LSCM
// ============================================================

app.get(’/api/invoices’, auth, async (_, res) => {
const invoices = await prisma.invoiceLSCM.findMany({
include: { job: { select: { jobNumber: true, client: { select: { name: true } } } }, lineItems: true },
orderBy: { updatedAt: ‘desc’ },
});
res.json(invoices);
});

app.post(’/api/invoices’, auth, async (req: any, res) => {
try {
const invoice = await prisma.invoiceLSCM.create({ data: req.body });
await audit(req.user.id, ‘CREATE’, ‘InvoiceLSCM’, invoice.id, null, req.body);
res.status(201).json(invoice);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.post(’/api/invoices/:id/line-items’, auth, async (req: any, res) => {
try {
const item = await prisma.invoiceLineItem.create({ data: { …req.body, invoiceId: req.params.id } });
// Recalculate totals
const items = await prisma.invoiceLineItem.findMany({ where: { invoiceId: req.params.id } });
const subtotal = items.reduce((s, i) => s + i.amount, 0);
await prisma.invoiceLSCM.update({ where: { id: req.params.id }, data: { subtotal, total: subtotal } });
res.status(201).json(item);
} catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ============================================================
// NOTIFICATIONS
// ============================================================

app.get(’/api/notifications’, auth, async (req: any, res) => {
const notifications = await prisma.notification.findMany({
where: { userId: req.user.id },
orderBy: { createdAt: ‘desc’ },
take: 50,
});
res.json(notifications);
});

// ============================================================
// USERS (Admin)
// ============================================================

app.get(’/api/users’, auth, async (req: any, res) => {
if (req.user.role !== ‘ADMIN’ && req.user.role !== ‘MANAGER’)
return res.status(403).json({ error: ‘Insufficient permissions’ });
const users = await prisma.user.findMany({
select: { id: true, name: true, email: true, role: true, officeId: true, phone: true, isActive: true, createdAt: true },
orderBy: { name: ‘asc’ },
});
res.json(users);
});

// ============================================================
// AUDIT LOGS
// ============================================================

app.get(’/api/audit-logs’, auth, async (req: any, res) => {
if (req.user.role !== ‘ADMIN’) return res.status(403).json({ error: ‘Admin only’ });
const { entityType, entityId } = req.query as any;
const where: any = {};
if (entityType) where.entityType = entityType;
if (entityId) where.entityId = entityId;
const logs = await prisma.auditLog.findMany({
where,
include: { user: { select: { name: true } } },
orderBy: { timestamp: ‘desc’ },
take: 100,
});
res.json(logs);
});

// ============================================================
// SEED (first-time setup)
// ============================================================

app.post(’/api/seed’, async (_, res) => {
try {
const existing = await prisma.user.findUnique({ where: { email: ‘admin@lscmltd.com’ } });
if (existing) return res.json({ message: ‘Already seeded’, userId: existing.id });

```
const office = await prisma.lSCMOffice.create({
  data: { name: 'LSCM HQ', country: 'Mauritania', city: 'Nouakchott', address: 'Villa 784, îlot A, Tevragh Zeina', isHQ: true }
});

const passwordHash = await bcrypt.hash('admin2026', 12);
const admin = await prisma.user.create({
  data: { email: 'admin@lscmltd.com', passwordHash, name: 'Maâdiou DIALLO', role: 'ADMIN', officeId: office.id, phone: '+222 00000000' }
});

const snepco = await prisma.client.create({
  data: { name: 'SNEPCO', code: 'SNEPCO', industry: 'Oil & Gas', country: 'Nigeria', servicePath: 'BW_PATH' }
});

const naoc = await prisma.client.create({
  data: { name: 'NAOC / Agip', code: 'NAOC', industry: 'Oil & Gas', country: 'Nigeria', servicePath: 'BW_PATH' }
});

const total = await prisma.client.create({
  data: { name: 'TotalEnergies', code: 'TOTAL', industry: 'Energy', country: 'Nigeria', servicePath: 'RFC_PATH' }
});

res.json({ message: 'Seeded successfully', admin: admin.id, office: office.id, clients: [snepco.id, naoc.id, total.id] });
```

} catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
console.log(`✅ CLEAR ERP v4.2 running on port ${PORT}`);
console.log(`📖 API docs: http://localhost:${PORT}/api/docs`);
console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
});
