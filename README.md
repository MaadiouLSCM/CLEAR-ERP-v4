# ≡LSCM≡ CLEAR ERP v4.2 — Backend v5

**Consolidated Logistics ERP for Advanced Resource Management**
LSCM Nigeria Ltd | March 15, 2026

## Quick Start

```bash
npm install
cp .env.example .env          # Set DATABASE_URL + JWT_SECRET
npx prisma generate
npx prisma migrate dev --name v5_init
npx prisma db seed             # 7 offices, 8 users, 21 orgs, 8 hubs...
npm run start:dev              # → http://localhost:3000/api/docs
```

## Architecture: 14 NestJS Modules — 97 API Endpoints

| # | Module | Endpoints | Entities | Key Features |
|---|--------|-----------|----------|-------------|
| 1 | Auth | 2 | User, Role | JWT login, role-based access |
| 2 | Jobs | 6 | Job (33 statuses) | CRUD, lifecycle transitions with validation |
| 3 | Items | 10 | Item, Box | QR generation, bulk QR, SM, box assignment, QR scan lookup |
| 4 | Documents | 7 | Document, Kit | Kit composition (4 kits), JCR readiness check, touch signatures |
| 5 | Tasks | 7 | Task, Dependencies | Kanban board, overdue tracking, status transitions, blocking |
| 6 | Tracking | 5 | TrackingEvent, Photo | Timeline per job, GPS, photos, shipment tracking |
| 7 | Shipments | 9 | Shipment, Leg, Corridor | Transport legs, corridors, sailing windows, flight schedules |
| 8 | Warehouse | 12 | Hub, Zone, Stock, Queue | Hub capacity, stock receive/dispatch/transfer, FIFO queue scoring |
| 9 | Finance | 8 | Invoice, BillingLine | Billing engine (auto-price from contract), cost sheets, AR/AP |
| 10 | Communications | 6 | Email, Notification | Email send, notifications, unread count, mark read |
| 11 | Compliance | 9 | Cert, Renewal, Audit | Renewal engine (nightly batch), cert tracking, audit findings |
| 12 | Analytics | 5 | KPI, Alert | KPI calculation (live data), governance alerts, ops dashboard |
| 13 | Consolidation | 6 | Request, Recommendation | 3-level engine (MAX/OPTIMAL/MIN), weight breaks, accept/reject |
| 14 | Reporting | 3 | 27 report types | DSR, WSR generation, report type catalog |

## Database: 81 Prisma Models, 23 Enums
See `prisma/schema.prisma`

## Stack
- **Backend:** NestJS 10 + Prisma 5 + PostgreSQL
- **Deploy:** Railway (backend) + Vercel (frontend)
- **Auth:** JWT with role-based guards
- **Docs:** Swagger UI at /api/docs

## Reference Documents
- Entity Registry (168 entities) → `CLEAR_Entity_Registry.xlsx`
- Status Map (33 statuses) → `CLEAR_Status_Map.xlsx`
- Master Reference v3 → `CLEAR_Master_Reference_v3.xlsx`
