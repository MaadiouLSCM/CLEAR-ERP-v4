// ════════════════════════════════════════════════════════════════
// CLEAR ERP v4.2 — SEED DATA
// Run: npx prisma db seed (configure in package.json)
// Populates: offices, hubs, corridors, users, clients, agents,
//            certifications, sailing/flight schedules, weight breaks,
//            priority rules, KPIs, renewal templates
// ════════════════════════════════════════════════════════════════

import { PrismaClient, Role, TransportMode, HubModel, HubStatus, ZoneType, Urgency } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding CLEAR ERP v4.2 database...');

  // ── 1. LSCM OFFICES (7) ──
  const offices = await Promise.all([
    prisma.lSCMOffice.create({ data: { code: 'NG', name: 'LSCM Nigeria', country: 'Nigeria', city: 'Abuja', address: 'Plot 234, Wuse II, Abuja', phone: '+234-809-xxx', baseCurrency: 'USD', timezone: 'Africa/Lagos', workingDays: 'MON,TUE,WED,THU,FRI' } }),
    prisma.lSCMOffice.create({ data: { code: 'FR', name: 'LSCM France', country: 'France', city: 'Paris', address: '12 Rue de la Logistique, 75008 Paris', phone: '+33-1-xxx', baseCurrency: 'EUR', timezone: 'Europe/Paris' } }),
    prisma.lSCMOffice.create({ data: { code: 'MR', name: 'LSCM Mauritanie', country: 'Mauritania', city: 'Nouakchott', address: 'Villa 784, Ilot A, Tevragh Zeina, Nouakchott', phone: '+222-xxx', baseCurrency: 'MRU', timezone: 'Africa/Nouakchott', workingDays: 'SUN,MON,TUE,WED,THU' } }),
    prisma.lSCMOffice.create({ data: { code: 'GN', name: 'LSCM Guinée', country: 'Guinea', city: 'Conakry', address: 'Quartier Almamya, Conakry', baseCurrency: 'GNF', timezone: 'Africa/Conakry', status: 'OPENING' } }),
    prisma.lSCMOffice.create({ data: { code: 'SN', name: 'LSCM Sénégal', country: 'Senegal', city: 'Dakar', address: 'Plateau, Dakar', baseCurrency: 'XOF', timezone: 'Africa/Dakar', status: 'OPENING' } }),
    prisma.lSCMOffice.create({ data: { code: 'AE', name: 'LSCM UAE', country: 'UAE', city: 'Dubai', address: 'JAFZA, Dubai', baseCurrency: 'AED', timezone: 'Asia/Dubai', status: 'OPENING' } }),
    prisma.lSCMOffice.create({ data: { code: 'CI', name: 'LSCM Côte d\'Ivoire', country: 'Ivory Coast', city: 'Abidjan', address: 'Plateau, Abidjan', baseCurrency: 'XOF', timezone: 'Africa/Abidjan', status: 'OPENING' } }),
  ]);
  console.log(`  ✓ ${offices.length} offices created`);

  const [offNG, offFR, offMR, offGN, offSN, offAE, offCI] = offices;

  // ── 2. USERS (8 seed users) ──
  const pwd = await bcrypt.hash('clear2026', 10);
  const users = await Promise.all([
    prisma.user.create({ data: { email: 'maadiou@lscmltd.com', password: pwd, name: 'Maâdiou', role: Role.CEO, officeId: offMR.id } }),
    prisma.user.create({ data: { email: 'aisha@lscmltd.com', password: pwd, name: 'Aisha', role: Role.SENIOR_EXPEDITER, officeId: offFR.id } }),
    prisma.user.create({ data: { email: 'kofi@lscmltd.com', password: pwd, name: 'Kofi', role: Role.EXPEDITER, officeId: offFR.id } }),
    prisma.user.create({ data: { email: 'seun@lscmltd.com', password: pwd, name: 'Seun', role: Role.EXPEDITER, officeId: offNG.id } }),
    prisma.user.create({ data: { email: 'fatima@lscmltd.com', password: pwd, name: 'Fatima', role: Role.FINANCE_MANAGER, officeId: offMR.id } }),
    prisma.user.create({ data: { email: 'ibrahim@lscmltd.com', password: pwd, name: 'Ibrahim', role: Role.HUB_OPERATOR, officeId: offMR.id } }),
    prisma.user.create({ data: { email: 'khady@lscmltd.com', password: pwd, name: 'Khady', role: Role.COMPLIANCE_OFFICER, officeId: offFR.id } }),
    prisma.user.create({ data: { email: 'jimmy@lscmltd.com', password: pwd, name: 'Jimmy', role: Role.CUSTOMS_AGENT, officeId: offNG.id } }),
  ]);
  console.log(`  ✓ ${users.length} users created`);

  // ── 3. ORGANIZATIONS — Clients ──
  const clients = await Promise.all([
    prisma.organization.create({ data: { name: 'SNEPCO (Shell Nigeria E&P)', type: 'CLIENT', country: 'Nigeria', city: 'Lagos', tier: 'PLATINUM', email: 'logistics@snepco.com' } }),
    prisma.organization.create({ data: { name: 'TotalEnergies EP Nigeria', type: 'CLIENT', country: 'Nigeria', city: 'Lagos', tier: 'GOLD', email: 'supply@totalenergies.com' } }),
    prisma.organization.create({ data: { name: 'SNIM', type: 'CLIENT', country: 'Mauritania', city: 'Nouadhibou', tier: 'GOLD', email: 'logistics@snim.mr' } }),
    prisma.organization.create({ data: { name: 'NAOC (Nigerian Agip)', type: 'CLIENT', country: 'Nigeria', city: 'Lagos', tier: 'SILVER', email: 'supply@naoc.eni.com' } }),
    prisma.organization.create({ data: { name: 'Takamul Energy', type: 'CLIENT', country: 'Mauritania', city: 'Nouakchott', tier: 'SILVER' } }),
  ]);
  console.log(`  ✓ ${clients.length} clients created`);

  const [snepco, total, snim, naoc, takamul] = clients;

  // ── 4. ORGANIZATIONS — Suppliers (demo) ──
  const suppliers = await Promise.all([
    prisma.organization.create({ data: { name: 'Emerson Automation Solutions', type: 'SUPPLIER', country: 'France', city: 'Paris' } }),
    prisma.organization.create({ data: { name: 'Agboro Integrated Services', type: 'SUPPLIER', country: 'Nigeria', city: 'Lagos' } }),
    prisma.organization.create({ data: { name: 'Gradic Services', type: 'SUPPLIER', country: 'UK', city: 'Aberdeen' } }),
    prisma.organization.create({ data: { name: 'Baker Hughes', type: 'SUPPLIER', country: 'USA', city: 'Houston' } }),
    prisma.organization.create({ data: { name: 'TechnipFMC', type: 'SUPPLIER', country: 'France', city: 'Paris' } }),
    prisma.organization.create({ data: { name: 'Schlumberger (SLB)', type: 'SUPPLIER', country: 'France', city: 'Paris' } }),
    prisma.organization.create({ data: { name: 'FELPET (ropes/hawsers)', type: 'SUPPLIER', country: 'Portugal', city: 'Lisbon' } }),
  ]);
  console.log(`  ✓ ${suppliers.length} suppliers created`);

  // ── 5. ORGANIZATIONS — Agents & Carriers ──
  const agents = await Promise.all([
    prisma.organization.create({ data: { name: 'Bolloré Logistics', type: 'FREIGHT_AGENT', country: 'France', city: 'Le Havre' } }),
    prisma.organization.create({ data: { name: 'Intels Nigeria', type: 'FREIGHT_AGENT', country: 'Nigeria', city: 'Onne' } }),
    prisma.organization.create({ data: { name: 'SIFA (Mauritania)', type: 'CUSTOMS_AGENT', country: 'Mauritania', city: 'Nouakchott' } }),
    prisma.organization.create({ data: { name: 'GMI Customs', type: 'CUSTOMS_AGENT', country: 'Nigeria', city: 'Lagos' } }),
    prisma.organization.create({ data: { name: 'CMA CGM', type: 'CARRIER', country: 'France', city: 'Marseille' } }),
    prisma.organization.create({ data: { name: 'MSC', type: 'CARRIER', country: 'Switzerland', city: 'Geneva' } }),
    prisma.organization.create({ data: { name: 'Air France Cargo', type: 'CARRIER', country: 'France', city: 'Paris' } }),
    prisma.organization.create({ data: { name: 'Turkish Cargo', type: 'CARRIER', country: 'Turkey', city: 'Istanbul' } }),
    prisma.organization.create({ data: { name: 'Ethiopian Cargo', type: 'CARRIER', country: 'Ethiopia', city: 'Addis Ababa' } }),
  ]);
  console.log(`  ✓ ${agents.length} agents/carriers created`);

  // ── 6. CORRIDORS ──
  const corridors = await Promise.all([
    prisma.corridor.create({ data: { name: 'EU→NG (Sea)', originCountry: 'France', originCity: 'Le Havre', destCountry: 'Nigeria', destCity: 'Onne', mode: 'SEA', avgTransitDays: 28, avgCostPerCbm: 45 } }),
    prisma.corridor.create({ data: { name: 'EU→NG (Air)', originCountry: 'France', originCity: 'Paris CDG', destCountry: 'Nigeria', destCity: 'Lagos/PHC', mode: 'AIR', avgTransitDays: 3, avgCostPerCbm: 280 } }),
    prisma.corridor.create({ data: { name: 'US→FR (Air relay)', originCountry: 'USA', originCity: 'Houston', destCountry: 'France', destCity: 'Paris CDG', mode: 'AIR', avgTransitDays: 2 } }),
    prisma.corridor.create({ data: { name: 'EU→MR (Air)', originCountry: 'France', originCity: 'Paris CDG', destCountry: 'Mauritania', destCity: 'Nouakchott', mode: 'AIR', avgTransitDays: 4, avgCostPerCbm: 320 } }),
    prisma.corridor.create({ data: { name: 'IT→NG (Sea)', originCountry: 'Italy', originCity: 'Genoa', destCountry: 'Nigeria', destCity: 'Onne', mode: 'SEA', avgTransitDays: 21, avgCostPerCbm: 42 } }),
    prisma.corridor.create({ data: { name: 'MR→EU (Sea)', originCountry: 'Mauritania', originCity: 'Nouakchott', destCountry: 'France', destCity: 'Le Havre', mode: 'SEA', avgTransitDays: 12 } }),
    prisma.corridor.create({ data: { name: 'UK→NG (Sea)', originCountry: 'UK', originCity: 'Felixstowe', destCountry: 'Nigeria', destCity: 'Onne', mode: 'SEA', avgTransitDays: 25 } }),
    prisma.corridor.create({ data: { name: 'US→NG (Air)', originCountry: 'USA', originCity: 'Houston', destCountry: 'Nigeria', destCity: 'Lagos', mode: 'AIR', avgTransitDays: 4 } }),
  ]);
  console.log(`  ✓ ${corridors.length} corridors created`);

  // ── 7. HUBS (4 active + 4 planned) ──
  const hubNKC = await prisma.hub.create({
    data: {
      name: 'Nouakchott Hub', code: 'NKC', officeId: offMR.id, country: 'Mauritania', city: 'Nouakchott',
      lat: 18.0735, lng: -15.9582, operatingModel: 'OWN', operatorName: 'Ibrahim (LSCM)',
      workingDays: 'SUN,MON,TUE,WED,THU', workingHoursStart: '08:00', workingHoursEnd: '17:00', timezone: 'Africa/Nouakchott',
      zones: { create: [
        { name: 'Zone A — Indoor', code: 'NKC-A', type: 'INDOOR', capacityCbm: 200 },
        { name: 'Zone B — Covered Outdoor (Oversized)', code: 'NKC-B', type: 'COVERED_OUTDOOR', capacityCbm: 150 },
        { name: 'Zone C — Outdoor (Heavy Lift)', code: 'NKC-C', type: 'OUTDOOR', capacityCbm: 100 },
      ]},
      costProfile: { create: { currency: 'USD', freeTimeDaysDefault: 30, storageRatePerCbmPerDay: 0.50, handlingInRate: 15, handlingOutRate: 15, forkliftRatePerHour: 25, craneRatePerHour: 80 } },
      regulatory: { create: { regimeType: 'DOMESTIC', dgPermitted: true, dgClassesPermitted: '3,5,6,8,9', maxStorageDays: 180, reportingFrequency: 'MONTHLY' } },
    }
  });

  const hubONN = await prisma.hub.create({
    data: {
      name: 'Onne Free Zone', code: 'ONN', officeId: offNG.id, country: 'Nigeria', city: 'Onne',
      lat: 4.7310, lng: 7.1537, operatingModel: 'AGENT', operatorName: 'Intels Nigeria',
      workingHoursStart: '07:00', workingHoursEnd: '18:00', timezone: 'Africa/Lagos',
      zones: { create: [
        { name: 'Zone FZ — Bonded', code: 'ONN-FZ', type: 'BONDED', capacityCbm: 120 },
        { name: 'Zone GP — General', code: 'ONN-GP', type: 'INDOOR', capacityCbm: 80 },
      ]},
      costProfile: { create: { currency: 'USD', freeTimeDaysDefault: 21, storageRatePerCbmPerDay: 1.20, handlingInRate: 25, handlingOutRate: 25 } },
      regulatory: { create: { regimeType: 'FREE_ZONE', customsAuthority: 'OGFZA', dgPermitted: true, dgClassesPermitted: 'ALL', reportingFrequency: 'QUARTERLY' } },
    }
  });

  const hubLHV = await prisma.hub.create({
    data: {
      name: 'Le Havre Transit', code: 'LHV', officeId: offFR.id, country: 'France', city: 'Le Havre',
      lat: 49.4944, lng: 0.1079, operatingModel: 'AGENT', operatorName: 'Bolloré Logistics',
      timezone: 'Europe/Paris',
      zones: { create: [
        { name: 'Transit Zone', code: 'LHV-TR', type: 'TRANSIT', capacityCbm: 80 },
      ]},
      costProfile: { create: { currency: 'EUR', freeTimeDaysDefault: 14, storageRatePerCbmPerDay: 1.80, handlingInRate: 30, handlingOutRate: 30 } },
      regulatory: { create: { regimeType: 'TRANSIT', dgPermitted: true, dgClassesPermitted: 'IATA,IMDG', reportingFrequency: 'MONTHLY' } },
    }
  });

  const hubABJ = await prisma.hub.create({
    data: {
      name: 'Abuja Office Storage', code: 'ABJ', officeId: offNG.id, country: 'Nigeria', city: 'Abuja',
      operatingModel: 'OWN', operatorName: 'Seun (LSCM)', timezone: 'Africa/Lagos',
      zones: { create: [
        { name: 'Small Indoor', code: 'ABJ-IN', type: 'INDOOR', capacityCbm: 20 },
      ]},
      costProfile: { create: { currency: 'USD', freeTimeDaysDefault: 7, storageRatePerCbmPerDay: 0.80 } },
      regulatory: { create: { regimeType: 'DOMESTIC', dgPermitted: false } },
    }
  });

  // Planned hubs (no zones yet)
  for (const h of [
    { name: 'Dubai Logistics Hub', code: 'DXB', officeId: offAE.id, country: 'UAE', city: 'Dubai', status: HubStatus.PLANNED },
    { name: 'Abidjan Hub', code: 'ABJ-CI', officeId: offCI.id, country: 'Ivory Coast', city: 'Abidjan', status: HubStatus.PLANNED },
    { name: 'Conakry Hub', code: 'CKY', officeId: offGN.id, country: 'Guinea', city: 'Conakry', status: HubStatus.PLANNED },
    { name: 'Dakar Hub', code: 'DKR', officeId: offSN.id, country: 'Senegal', city: 'Dakar', status: HubStatus.PLANNED },
  ]) {
    await prisma.hub.create({ data: { ...h, operatingModel: 'SHARED' } });
  }
  console.log('  ✓ 8 hubs created (4 active + 4 planned)');

  // ── 8. SAILING WINDOWS ──
  await Promise.all([
    prisma.seaConsolidationWindow.create({ data: { corridorId: corridors[0].id, carrier: 'CMA CGM', serviceName: 'WAX (West Africa Express)', frequency: 'WEEKLY', sailingDay: 'WEDNESDAY', cutoffDay: 'MONDAY', cutoffTime: '12:00' } }),
    prisma.seaConsolidationWindow.create({ data: { corridorId: corridors[0].id, carrier: 'MSC', serviceName: 'WAF (West Africa)', frequency: 'WEEKLY', sailingDay: 'FRIDAY', cutoffDay: 'WEDNESDAY', cutoffTime: '16:00' } }),
    prisma.seaConsolidationWindow.create({ data: { corridorId: corridors[4].id, carrier: 'MSC', serviceName: 'Med Express', frequency: 'BIWEEKLY', sailingDay: 'SATURDAY', cutoffDay: 'THURSDAY', cutoffTime: '12:00' } }),
  ]);
  console.log('  ✓ Sailing windows created');

  // ── 9. FLIGHT SCHEDULES ──
  await Promise.all([
    prisma.flightSchedule.create({ data: { corridorId: corridors[1].id, carrier: 'Air France', flightNumber: 'AF0148', frequency: 'DAILY', departureAirport: 'CDG', arrivalAirport: 'LOS', cutoffHoursBefore: 6, transitTimeHours: 7 } }),
    prisma.flightSchedule.create({ data: { corridorId: corridors[1].id, carrier: 'Turkish Airlines', flightNumber: 'TK1830', frequency: 'DAILY', departureAirport: 'CDG', arrivalAirport: 'LOS', cutoffHoursBefore: 8, transitTimeHours: 12 } }),
    prisma.flightSchedule.create({ data: { corridorId: corridors[3].id, carrier: 'Air France', frequency: '3_PER_WEEK', departureAirport: 'CDG', arrivalAirport: 'NKC', cutoffHoursBefore: 6, transitTimeHours: 6 } }),
  ]);
  console.log('  ✓ Flight schedules created');

  // ── 10. AIR WEIGHT BREAKS (CDG→NG corridor) ──
  const airCorr = corridors[1]; // EU→NG Air
  await Promise.all([
    prisma.airWeightBreak.create({ data: { corridorId: airCorr.id, carrier: 'Air France', weightMin: 0, weightMax: 45, ratePerKg: 8.50 } }),
    prisma.airWeightBreak.create({ data: { corridorId: airCorr.id, carrier: 'Air France', weightMin: 45, weightMax: 100, ratePerKg: 6.20 } }),
    prisma.airWeightBreak.create({ data: { corridorId: airCorr.id, carrier: 'Air France', weightMin: 100, weightMax: 300, ratePerKg: 4.80 } }),
    prisma.airWeightBreak.create({ data: { corridorId: airCorr.id, carrier: 'Air France', weightMin: 300, weightMax: 500, ratePerKg: 3.90 } }),
    prisma.airWeightBreak.create({ data: { corridorId: airCorr.id, carrier: 'Air France', weightMin: 500, weightMax: 1000, ratePerKg: 3.50 } }),
    prisma.airWeightBreak.create({ data: { corridorId: airCorr.id, carrier: 'Air France', weightMin: 1000, weightMax: 99999, ratePerKg: 3.20 } }),
  ]);
  console.log('  ✓ Air weight breaks created');

  // ── 11. BILLING ZONES ──
  await Promise.all([
    prisma.billingZone.create({ data: { zoneName: 'EUROPE_NORTH', countries: 'FR,UK,NL,BE,DE,DK,SE,NO,FI,IE' } }),
    prisma.billingZone.create({ data: { zoneName: 'EUROPE_SOUTH', countries: 'IT,ES,PT,GR,TR' } }),
    prisma.billingZone.create({ data: { zoneName: 'US_EAST', countries: 'US' } }),
    prisma.billingZone.create({ data: { zoneName: 'WEST_AFRICA', countries: 'NG,GH,CI,SN,MR,GN' } }),
    prisma.billingZone.create({ data: { zoneName: 'MIDDLE_EAST', countries: 'AE,SA,QA,KW,OM,BH' } }),
  ]);
  console.log('  ✓ Billing zones created');

  // ── 12. FIFO PRIORITY RULES ──
  await Promise.all([
    prisma.priorityRule.create({ data: { ruleName: 'FIFO Age', factor: 'days_in_stock', weight: 40, calculation: '(days_in_stock / max_days) * 400' } }),
    prisma.priorityRule.create({ data: { ruleName: 'Free Time Urgency', factor: 'free_time_remaining', weight: 30, calculation: '((free_days - days_in_stock) <= 3) ? 300 : linear_scale' } }),
    prisma.priorityRule.create({ data: { ruleName: 'Client Priority', factor: 'client_tier', weight: 20, calculation: 'PLATINUM=200, GOLD=150, SILVER=100, BRONZE=50' } }),
    prisma.priorityRule.create({ data: { ruleName: 'Special Handling', factor: 'dg_or_special', weight: 10, calculation: 'DG=100, TEMPERATURE=80, OVERSIZED=60, NORMAL=0' } }),
  ]);
  console.log('  ✓ FIFO priority rules created');

  // ── 13. CERTIFICATIONS ──
  await Promise.all([
    prisma.certification.create({ data: { officeId: offFR.id, certType: 'ISO_9001', scope: 'Quality Management — Freight Forwarding', issuer: 'Bureau Veritas', certNumber: 'FR-QMS-2024-0892', issueDate: new Date('2024-03-15'), expiryDate: new Date('2027-03-14'), status: 'ACTIVE', nextAuditDate: new Date('2025-09-15') } }),
    prisma.certification.create({ data: { officeId: offFR.id, certType: 'AEO', scope: 'Authorized Economic Operator — Full', issuer: 'French Customs (DGDDI)', certNumber: 'FR-AEO-F-2023-1247', issueDate: new Date('2023-06-01'), expiryDate: new Date('2028-05-31'), status: 'ACTIVE' } }),
    prisma.certification.create({ data: { officeId: offFR.id, certType: 'IATA', scope: 'IATA Cargo Agent', issuer: 'IATA', certNumber: 'IATA-FR-57-2-1234-5', issueDate: new Date('2024-01-01'), expiryDate: new Date('2026-12-31'), status: 'ACTIVE' } }),
    prisma.certification.create({ data: { officeId: offNG.id, certType: 'FF_LICENSE', scope: 'Freight Forwarding License — Nigeria', issuer: 'CRFFN', certNumber: 'CRFFN/2024/NG/0456', issueDate: new Date('2024-07-01'), expiryDate: new Date('2026-06-30'), status: 'ACTIVE' } }),
    prisma.certification.create({ data: { officeId: offNG.id, certType: 'CUSTOMS_LICENSE', scope: 'Licensed Customs Agent — Nigeria', issuer: 'Nigeria Customs Service', certNumber: 'NCS/LA/2024/789', issueDate: new Date('2024-01-01'), expiryDate: new Date('2025-12-31'), status: 'ACTIVE' } }),
    prisma.certification.create({ data: { officeId: offNG.id, certType: 'OGFZA', scope: 'Onne Free Zone Operating License', issuer: 'OGFZA', certNumber: 'OGFZA/OL/2024/123', issueDate: new Date('2024-04-01'), expiryDate: new Date('2026-03-31'), status: 'ACTIVE' } }),
    prisma.certification.create({ data: { certType: 'INSURANCE', scope: 'Professional Liability + Cargo Insurance', issuer: 'AXA Corporate', certNumber: 'AXA-LSCM-2024-PL-001', issueDate: new Date('2024-01-01'), expiryDate: new Date('2025-12-31'), status: 'ACTIVE' } }),
  ]);
  console.log('  ✓ 7 certifications created');

  // ── 14. RENEWAL TEMPLATES ──
  const isoTemplate = await prisma.renewalProcessTemplate.create({
    data: { certType: 'ISO_9001', processName: 'ISO 9001 Renewal (12 months)', totalLeadTimeDays: 365,
      steps: { create: [
        { stepNumber: 1, stepName: 'Internal pre-audit review', triggerDaysBeforeExpiry: 365, durationDays: 30, assigneeRole: Role.COMPLIANCE_OFFICER, blocking: true, escalationAfterDays: 15, escalationToRole: Role.CEO },
        { stepNumber: 2, stepName: 'Management Review meeting', triggerDaysBeforeExpiry: 330, durationDays: 15, assigneeRole: Role.CEO, blocking: true },
        { stepNumber: 3, stepName: 'Internal audit program execution', triggerDaysBeforeExpiry: 300, durationDays: 60, assigneeRole: Role.COMPLIANCE_OFFICER, blocking: true, escalationAfterDays: 45, escalationToRole: Role.CEO },
        { stepNumber: 4, stepName: 'CAPA closure verification', triggerDaysBeforeExpiry: 240, durationDays: 30, assigneeRole: Role.COMPLIANCE_OFFICER, blocking: true },
        { stepNumber: 5, stepName: 'External audit application', triggerDaysBeforeExpiry: 210, durationDays: 14, assigneeRole: Role.COMPLIANCE_OFFICER, blocking: true },
        { stepNumber: 6, stepName: 'Document pack preparation', triggerDaysBeforeExpiry: 180, durationDays: 30, assigneeRole: Role.COMPLIANCE_OFFICER, blocking: true },
        { stepNumber: 7, stepName: 'External audit (Stage 1)', triggerDaysBeforeExpiry: 150, durationDays: 5, assigneeRole: Role.COMPLIANCE_OFFICER, blocking: true },
        { stepNumber: 8, stepName: 'Stage 1 findings resolution', triggerDaysBeforeExpiry: 120, durationDays: 30, assigneeRole: Role.COMPLIANCE_OFFICER, blocking: true },
        { stepNumber: 9, stepName: 'External audit (Stage 2)', triggerDaysBeforeExpiry: 90, durationDays: 5, assigneeRole: Role.COMPLIANCE_OFFICER, blocking: true },
        { stepNumber: 10, stepName: 'Certificate issued — update CLEAR', triggerDaysBeforeExpiry: 30, durationDays: 7, assigneeRole: Role.COMPLIANCE_OFFICER, blocking: false },
      ]}
    }
  });

  await prisma.renewalProcessTemplate.create({
    data: { certType: 'IATA', processName: 'IATA Renewal (6 months)', totalLeadTimeDays: 180,
      steps: { create: [
        { stepNumber: 1, stepName: 'Financial review (insurance, bank guarantee)', triggerDaysBeforeExpiry: 180, durationDays: 30, assigneeRole: Role.CFO, blocking: true },
        { stepNumber: 2, stepName: 'Staff certification verification', triggerDaysBeforeExpiry: 150, durationDays: 14, assigneeRole: Role.COMPLIANCE_OFFICER, blocking: true },
        { stepNumber: 3, stepName: 'Renewal application submission', triggerDaysBeforeExpiry: 120, durationDays: 7, assigneeRole: Role.COMPLIANCE_OFFICER, blocking: true },
        { stepNumber: 4, stepName: 'IATA inspection (if triggered)', triggerDaysBeforeExpiry: 90, durationDays: 14, assigneeRole: Role.COMPLIANCE_OFFICER, blocking: true },
        { stepNumber: 5, stepName: 'Fee payment', triggerDaysBeforeExpiry: 60, durationDays: 7, assigneeRole: Role.CFO, blocking: true },
        { stepNumber: 6, stepName: 'Certificate issued — update CLEAR', triggerDaysBeforeExpiry: 14, durationDays: 7, assigneeRole: Role.COMPLIANCE_OFFICER, blocking: false },
      ]}
    }
  });
  console.log('  ✓ Renewal templates created (ISO + IATA)');

  // ── 15. GOVERNANCE KPIs (sample from Dashboard Spec) ──
  await Promise.all([
    prisma.governanceKPI.create({ data: { kpiCode: 'F1', name: 'Cash Runway', category: 'FINANCIAL', calculation: 'Cash available / avg monthly burn rate', sourceEntities: 'BankAccount, CashFlowStatement', greenMin: '> 120 days', yellowMin: '90-120 days', orangeMin: '60-90 days', redMin: '30-60 days', blackMin: '< 30 days', display: 'Gauge + trend 12m' } }),
    prisma.governanceKPI.create({ data: { kpiCode: 'F2', name: 'EBITDA Margin', category: 'FINANCIAL', calculation: '(EBITDA / Revenue) x 100', sourceEntities: 'PLReport', greenMin: '> 15%', yellowMin: '10-15%', orangeMin: '5-10%', redMin: '0-5%', blackMin: '< 0%' } }),
    prisma.governanceKPI.create({ data: { kpiCode: 'O1', name: 'On-Time Delivery %', category: 'OPERATIONAL', calculation: 'Jobs delivered <= target date / total delivered', sourceEntities: 'Job', greenMin: '> 95%', yellowMin: '90-95%', orangeMin: '80-90%', redMin: '70-80%', blackMin: '< 70%' } }),
    prisma.governanceKPI.create({ data: { kpiCode: 'O2', name: 'Avg RFC-to-GL Days', category: 'OPERATIONAL', calculation: 'Avg(GL_APPROVED - RFC_RECEIVED) per job', sourceEntities: 'Job, TrackingEvent', greenMin: '< 5 days', yellowMin: '5-10 days', orangeMin: '10-15 days', redMin: '15-25 days', blackMin: '> 25 days' } }),
    prisma.governanceKPI.create({ data: { kpiCode: 'WH-01', name: 'Hub Capacity Utilization %', category: 'WAREHOUSE', calculation: 'occupied CBM / total capacity CBM per hub', sourceEntities: 'HubZone, CapacitySnapshot', greenMin: '< 70%', yellowMin: '70-85%', orangeMin: '85-95%', redMin: '95-100%', blackMin: '> 100%' } }),
    prisma.governanceKPI.create({ data: { kpiCode: 'FQ-01', name: 'FIFO Compliance Rate %', category: 'FIFO', calculation: 'Items loaded in FIFO order / total loaded', sourceEntities: 'QueuePosition, FIFOViolation', greenMin: '> 90%', yellowMin: '80-90%', orangeMin: '70-80%', redMin: '50-70%', blackMin: '< 50%' } }),
  ]);
  console.log('  ✓ 6 governance KPIs created');

  // ── 16. EMPLOYEES ──
  await Promise.all([
    prisma.employee.create({ data: { officeId: offMR.id, name: 'Maâdiou Mo Ibrahima DIALLO', position: 'CEO / Founder', department: 'Management', contractType: 'CDI', hireDate: new Date('2006-01-01'), costRatePerHour: 150 } }),
    prisma.employee.create({ data: { officeId: offFR.id, name: 'Aisha Bello', position: 'Senior Expediter', department: 'Operations', contractType: 'CDI', hireDate: new Date('2019-03-01'), costRatePerHour: 45 } }),
    prisma.employee.create({ data: { officeId: offFR.id, name: 'Kofi Mensah', position: 'Expediter', department: 'Operations', contractType: 'CDI', hireDate: new Date('2021-06-15'), costRatePerHour: 35 } }),
    prisma.employee.create({ data: { officeId: offNG.id, name: 'Seun Adeyemi', position: 'Expediter', department: 'Operations', contractType: 'CDI', hireDate: new Date('2020-09-01'), costRatePerHour: 30 } }),
    prisma.employee.create({ data: { officeId: offMR.id, name: 'Fatima Mint Ahmed', position: 'Finance Manager', department: 'Finance', contractType: 'CDI', hireDate: new Date('2022-01-10'), costRatePerHour: 40 } }),
    prisma.employee.create({ data: { officeId: offMR.id, name: 'Ibrahim Sow', position: 'Hub Operator', department: 'Warehouse', contractType: 'CDI', hireDate: new Date('2020-04-01'), costRatePerHour: 20 } }),
  ]);
  console.log('  ✓ 6 employees created');

  console.log('\n✅ CLEAR ERP v4.2 seed complete!');
  console.log(`   Offices: 7 | Users: 8 | Orgs: ${clients.length + suppliers.length + agents.length} | Corridors: ${corridors.length} | Hubs: 8 | KPIs: 6`);
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
