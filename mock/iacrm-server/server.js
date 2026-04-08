/**
 * IACRM Simulator — Multi-Tenant Stateful Express API
 *
 * Multiple business accounts, each with their own API key and fully isolated data.
 * HD Parrainage configures a specific business API key → sees only that business's data.
 * All writes from HD Parrainage (prospect create/archive) appear under that business.
 *
 * Admin dashboard: http://localhost:8100/admin
 *   - See all businesses + their API keys
 *   - Create new businesses
 *   - See live data counts per business
 *   - View activity log of all incoming requests
 *
 * Usage:
 *   npm install && node server.js
 *
 * Deploy to Railway/Render: push this directory, runs automatically.
 */

const express = require('express')
const cors = require('cors')
const crypto = require('crypto')

const app = express()
const PORT = process.env.PORT || 8100
const ADMIN_KEY = process.env.ADMIN_KEY || null // optional: protect admin routes

// ─── CORS ────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*'
app.use(cors({ origin: ALLOWED_ORIGINS }))
app.use(express.json())

// ─── ACTIVITY LOG ────────────────────────────────────────────────────────────
const MAX_LOG = 100
const activityLog = []
function logActivity(bizId, bizName, method, path, status, note = '') {
  const entry = {
    ts: new Date().toISOString(),
    bizId,
    bizName,
    method,
    path,
    status,
    note,
  }
  activityLog.unshift(entry)
  if (activityLog.length > MAX_LOG) activityLog.pop()
  console.log(`[${method}] ${path} → ${status}  (${bizName || bizId || 'unknown'}) ${note}`)
}

// ─── SEED FACTORY ────────────────────────────────────────────────────────────
function makeSeedServices(prefix) {
  return [
    { iacrm_id: `${prefix}-svc-001`, name: 'Audit Comptable Annuel', description: 'Audit complet des comptes annuels avec rapport de conformite', category: 'Comptabilite', unit_price: 2500, currency: 'EUR', is_active: true },
    { iacrm_id: `${prefix}-svc-002`, name: 'Conseil Fiscal Trimestriel', description: 'Accompagnement fiscal trimestriel pour PME', category: 'Fiscalite', unit_price: 1200, currency: 'EUR', is_active: true },
    { iacrm_id: `${prefix}-svc-003`, name: 'Formation Management', description: 'Formation en management et leadership pour cadres', category: 'Formation', unit_price: 150, currency: 'EUR', is_active: true },
    { iacrm_id: `${prefix}-svc-004`, name: 'Diagnostic RH', description: 'Analyse complete des processus ressources humaines', category: 'Ressources Humaines', unit_price: 3200, currency: 'EUR', is_active: true },
    { iacrm_id: `${prefix}-svc-005`, name: 'Migration Cloud', description: 'Migration infrastructure vers le cloud AWS ou Azure', category: 'Informatique', unit_price: 8500, currency: 'EUR', is_active: false },
  ]
}

function makeSeedClients(prefix) {
  return [
    { iacrm_id: `${prefix}-cli-001`, company_name: 'Boulangerie Martin', contact_name: 'Pierre Martin', contact_email: 'pierre@boulangerie-martin.fr', status: 'active', since: '2024-03-15' },
    { iacrm_id: `${prefix}-cli-002`, company_name: 'Garage Petit Freres', contact_name: 'Jean Petit', contact_email: 'jean@garage-petit.fr', status: 'active', since: '2024-07-22' },
    { iacrm_id: `${prefix}-cli-003`, company_name: 'Restaurant Le Provencal', contact_name: 'Sophie Durand', contact_email: 'sophie@leprovencal.fr', status: 'inactive', since: '2025-01-08' },
  ]
}

function makeSeedProspects(prefix) {
  return [
    { iacrm_id: `${prefix}-prsp-001`, contact_name: 'Marie Lefevre', company_name: 'Lefevre Consulting', stage: 'suspect', progression_status: 'new', assigned_agent: null, created_at: '2026-03-01T09:00:00Z', updated_at: '2026-03-01T09:00:00Z' },
    { iacrm_id: `${prefix}-prsp-002`, contact_name: 'Luc Girard', company_name: 'Girard BTP', stage: 'prospect_froid', progression_status: 'contacted', assigned_agent: null, created_at: '2026-02-15T11:30:00Z', updated_at: '2026-03-10T14:00:00Z' },
    { iacrm_id: `${prefix}-prsp-003`, contact_name: 'Thomas Blanc', company_name: 'Blanc Securite', stage: 'prospect_chaud', progression_status: 'proposal_sent', assigned_agent: null, created_at: '2025-12-05T10:15:00Z', updated_at: '2026-04-01T09:30:00Z' },
  ]
}

function makeSeedInvoices(prefix) {
  return [
    { iacrm_id: `${prefix}-inv-001`, invoice_reference: `FAC-001`, client_id: `${prefix}-cli-001`, client_name: 'Boulangerie Martin', amount: 2500, currency: 'EUR', status: 'paid', issued_at: '2026-01-15', due_at: '2026-02-15', paid_at: '2026-02-10' },
    { iacrm_id: `${prefix}-inv-002`, invoice_reference: `FAC-002`, client_id: `${prefix}-cli-002`, client_name: 'Garage Petit Freres', amount: 4700, currency: 'EUR', status: 'overdue', issued_at: '2026-02-01', due_at: '2026-03-01', paid_at: null },
    { iacrm_id: `${prefix}-inv-003`, invoice_reference: `FAC-003`, client_id: `${prefix}-cli-003`, client_name: 'Restaurant Le Provencal', amount: 1200, currency: 'EUR', status: 'pending', issued_at: '2026-03-25', due_at: '2026-04-25', paid_at: null },
  ]
}

function generateApiKey(prefix) {
  return `${prefix}-key-${crypto.randomBytes(6).toString('hex')}`
}

// ─── BUSINESSES REGISTRY ─────────────────────────────────────────────────────
// Each entry: { id, name, industry, apiKey, services[], clients[], prospects[], invoices[], createdAt }

const businessRegistry = {}

function createBusiness({ id, name, industry, apiKey, seed = true }) {
  const biz = {
    id,
    name,
    industry: industry || 'Services',
    apiKey,
    services: seed ? makeSeedServices(id) : [],
    clients: seed ? makeSeedClients(id) : [],
    prospects: seed ? makeSeedProspects(id) : [],
    invoices: seed ? makeSeedInvoices(id) : [],
    createdAt: new Date().toISOString(),
  }
  businessRegistry[id] = biz
  return biz
}

// Seed three businesses
createBusiness({ id: 'dupont',  name: 'Dupont & Associes',      industry: 'Conseil en gestion',   apiKey: 'dupont-key-demo2024' })
createBusiness({ id: 'moreau',  name: 'Moreau Technologies SAS', industry: 'Services informatiques', apiKey: 'moreau-key-demo2024' })
createBusiness({ id: 'bernard', name: 'Bernard Immobilier SARL', industry: 'Immobilier',             apiKey: 'bernard-key-demo2024' })

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
function requireApiKey(req, res, next) {
  const key = req.headers['x-iacrm-api-key']
  if (!key) {
    return res.status(401).json({ error: 'Missing X-IACRM-API-Key header' })
  }
  const biz = Object.values(businessRegistry).find(b => b.apiKey === key)
  if (!biz) {
    return res.status(403).json({ error: `Unknown API key. Valid keys: ${Object.values(businessRegistry).map(b => b.apiKey).join(', ')}` })
  }
  req.biz = biz
  next()
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function nowIso() {
  return new Date().toISOString()
}

function computeStageSummary(prospectsArr) {
  const STAGES = ['suspect', 'prospect_froid', 'prospect_tiede', 'prospect_chaud', 'converted', 'lost']
  const LABELS = { suspect: 'Suspect', prospect_froid: 'Prospect froid', prospect_tiede: 'Prospect tiede', prospect_chaud: 'Prospect chaud', converted: 'Converti', lost: 'Perdu' }
  const counts = {}
  STAGES.forEach(s => { counts[s] = 0 })
  prospectsArr.forEach(p => { if (counts[p.stage] !== undefined) counts[p.stage]++ })
  return STAGES.map(s => ({ stage: s, label: LABELS[s], count: counts[s] }))
}

function computeInvoiceSummary(invoicesArr) {
  const r = { total_count: 0, total_amount: 0, paid_count: 0, paid_amount: 0, overdue_count: 0, overdue_amount: 0 }
  invoicesArr.forEach(inv => {
    r.total_count++
    r.total_amount += inv.amount
    if (inv.status === 'paid')    { r.paid_count++;    r.paid_amount    += inv.amount }
    if (inv.status === 'overdue') { r.overdue_count++; r.overdue_amount += inv.amount }
  })
  return r
}

// ─── AUTH ENDPOINT ───────────────────────────────────────────────────────────

app.post('/auth/token', (req, res) => {
  const key = req.headers['x-iacrm-api-key'] || req.body?.api_key
  const biz = key ? Object.values(businessRegistry).find(b => b.apiKey === key) : null
  logActivity(biz?.id, biz?.name, 'POST', '/auth/token', 200)
  res.json({ access_token: `mock-token-${Date.now()}`, token_type: 'Bearer', expires_in: 3600 })
})

app.post('/auth/revoke', (req, res) => {
  res.json({ message: 'Token revoked.' })
})

// ─── SERVICES ────────────────────────────────────────────────────────────────

app.get('/services', requireApiKey, (req, res) => {
  logActivity(req.biz.id, req.biz.name, 'GET', '/services', 200)
  res.json({ data: req.biz.services, meta: { total: req.biz.services.length } })
})

app.get('/services/:id', requireApiKey, (req, res) => {
  const item = req.biz.services.find(s => s.iacrm_id === req.params.id)
  if (!item) return res.status(404).json({ error: 'Service not found' })
  logActivity(req.biz.id, req.biz.name, 'GET', `/services/${req.params.id}`, 200)
  res.json({ data: item })
})

app.post('/services', requireApiKey, (req, res) => {
  const body = req.body
  const item = {
    iacrm_id: body.iacrm_id || `${req.biz.id}-svc-${Date.now()}`,
    name: body.name || 'Nouveau service',
    description: body.description || null,
    category: body.category || 'Autre',
    unit_price: Number(body.unit_price) || 0,
    currency: body.currency || 'EUR',
    is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
  }
  req.biz.services.push(item)
  logActivity(req.biz.id, req.biz.name, 'POST', '/services', 201, item.name)
  res.status(201).json({ data: item })
})

app.patch('/services/:id', requireApiKey, (req, res) => {
  const item = req.biz.services.find(s => s.iacrm_id === req.params.id)
  if (!item) return res.status(404).json({ error: 'Service not found' })
  Object.assign(item, req.body)
  logActivity(req.biz.id, req.biz.name, 'PATCH', `/services/${req.params.id}`, 200)
  res.json({ data: item })
})

app.delete('/services/:id', requireApiKey, (req, res) => {
  const idx = req.biz.services.findIndex(s => s.iacrm_id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Service not found' })
  req.biz.services.splice(idx, 1)
  logActivity(req.biz.id, req.biz.name, 'DELETE', `/services/${req.params.id}`, 200)
  res.json({ message: 'Deleted' })
})

// ─── CLIENTS ─────────────────────────────────────────────────────────────────

app.get('/clients', requireApiKey, (req, res) => {
  logActivity(req.biz.id, req.biz.name, 'GET', '/clients', 200)
  res.json({ data: req.biz.clients, meta: { total: req.biz.clients.length } })
})

app.get('/clients/:id', requireApiKey, (req, res) => {
  const item = req.biz.clients.find(c => c.iacrm_id === req.params.id)
  if (!item) return res.status(404).json({ error: 'Client not found' })
  res.json({ data: item })
})

app.post('/clients', requireApiKey, (req, res) => {
  const body = req.body
  const item = {
    iacrm_id: body.iacrm_id || `${req.biz.id}-cli-${Date.now()}`,
    company_name: body.company_name || '',
    contact_name: body.contact_name || '',
    contact_email: body.contact_email || null,
    contact_phone: body.contact_phone || null,
    status: body.status || 'active',
    since: body.since || nowIso().substring(0, 10),
  }
  req.biz.clients.push(item)
  logActivity(req.biz.id, req.biz.name, 'POST', '/clients', 201, item.company_name)
  res.status(201).json({ data: item })
})

// ─── PIPELINE ────────────────────────────────────────────────────────────────

app.get('/pipeline/stages', requireApiKey, (req, res) => {
  logActivity(req.biz.id, req.biz.name, 'GET', '/pipeline/stages', 200)
  res.json({ data: computeStageSummary(req.biz.prospects) })
})

app.get('/pipeline/prospects', requireApiKey, (req, res) => {
  let result = [...req.biz.prospects]
  if (req.query.stage) result = result.filter(p => p.stage === req.query.stage)
  logActivity(req.biz.id, req.biz.name, 'GET', '/pipeline/prospects', 200, `${result.length} items`)
  res.json({ data: result, meta: { total: result.length } })
})

app.get('/pipeline/prospects/:id', requireApiKey, (req, res) => {
  const item = req.biz.prospects.find(p => p.iacrm_id === req.params.id)
  if (!item) return res.status(404).json({ error: 'Prospect not found' })
  res.json({ data: item })
})

app.post('/pipeline/prospects', requireApiKey, (req, res) => {
  const body = req.body
  const ts = nowIso()
  const item = {
    iacrm_id: body.iacrm_id || `${req.biz.id}-prsp-${Date.now()}`,
    contact_name: body.contact_name || '',
    company_name: body.company_name || null,
    stage: body.stage || 'suspect',
    progression_status: body.progression_status || 'new',
    assigned_agent: body.assigned_agent || null,
    created_at: ts,
    updated_at: ts,
  }
  req.biz.prospects.push(item)
  logActivity(req.biz.id, req.biz.name, 'POST', '/pipeline/prospects', 201, `${item.contact_name} (${item.stage})`)
  res.status(201).json({ data: item })
})

app.patch('/pipeline/prospects/:id/stage', requireApiKey, (req, res) => {
  const item = req.biz.prospects.find(p => p.iacrm_id === req.params.id)
  if (!item) return res.status(404).json({ error: 'Prospect not found' })
  const { stage, reason } = req.body
  if (!stage) return res.status(400).json({ error: 'stage is required' })
  const prev = item.stage
  item.stage = stage
  if (reason) item.progression_status = reason
  item.updated_at = nowIso()
  logActivity(req.biz.id, req.biz.name, 'PATCH', `/pipeline/prospects/${req.params.id}/stage`, 200, `${item.contact_name}: ${prev} → ${stage}`)

  // Auto-convert prospect → client when stage reaches 'converted'
  let newClient = null
  if (stage === 'converted' && prev !== 'converted') {
    const alreadyClient = req.biz.clients.find(c =>
      c.contact_email && item.contact_email
        ? c.contact_email === item.contact_email
        : c.company_name === item.company_name && c.contact_name === item.contact_name
    )
    if (!alreadyClient) {
      newClient = {
        iacrm_id:      `${req.biz.id}-cli-${Date.now()}`,
        company_name:  item.company_name  || item.contact_name,
        contact_name:  item.contact_name  || '',
        contact_email: item.contact_email || null,
        contact_phone: item.contact_phone || null,
        status:        'active',
        since:         nowIso().substring(0, 10),
        converted_from_prospect: item.iacrm_id,
      }
      req.biz.clients.push(newClient)
      logActivity(req.biz.id, req.biz.name, 'AUTO', '/clients', 201, `Client créé depuis prospect: ${item.contact_name}`)
    }
  }

  res.json({ data: item, client_created: newClient || null })
})

// ─── INVOICES ────────────────────────────────────────────────────────────────

app.get('/invoices/summary', requireApiKey, (req, res) => {
  logActivity(req.biz.id, req.biz.name, 'GET', '/invoices/summary', 200)
  res.json({ data: computeInvoiceSummary(req.biz.invoices) })
})

app.get('/invoices', requireApiKey, (req, res) => {
  let result = [...req.biz.invoices]
  if (req.query.status) result = result.filter(i => i.status === req.query.status)
  logActivity(req.biz.id, req.biz.name, 'GET', '/invoices', 200)
  res.json({ data: result, meta: { total: result.length } })
})

app.get('/invoices/:id', requireApiKey, (req, res) => {
  const item = req.biz.invoices.find(i => i.iacrm_id === req.params.id)
  if (!item) return res.status(404).json({ error: 'Invoice not found' })
  res.json({ data: item })
})

app.post('/invoices', requireApiKey, (req, res) => {
  const body = req.body
  const item = {
    iacrm_id: body.iacrm_id || `${req.biz.id}-inv-${Date.now()}`,
    invoice_reference: body.invoice_reference || `FAC-${Date.now()}`,
    client_id: body.client_id || '',
    client_name: body.client_name || null,
    amount: Number(body.amount) || 0,
    currency: body.currency || 'EUR',
    status: body.status || 'pending',
    issued_at: body.issued_at || nowIso().substring(0, 10),
    due_at: body.due_at || null,
    paid_at: body.paid_at || null,
  }
  req.biz.invoices.push(item)
  logActivity(req.biz.id, req.biz.name, 'POST', '/invoices', 201, item.invoice_reference)
  res.status(201).json({ data: item })
})

app.patch('/invoices/:id/status', requireApiKey, (req, res) => {
  const item = req.biz.invoices.find(i => i.iacrm_id === req.params.id)
  if (!item) return res.status(404).json({ error: 'Invoice not found' })
  const { status } = req.body
  if (!status) return res.status(400).json({ error: 'status is required' })
  item.status = status
  if (status === 'paid' && !item.paid_at) item.paid_at = nowIso().substring(0, 10)
  logActivity(req.biz.id, req.biz.name, 'PATCH', `/invoices/${req.params.id}/status`, 200, status)
  res.json({ data: item })
})

// ─── ADMIN API ────────────────────────────────────────────────────────────────

function requireAdminKey(req, res, next) {
  if (!ADMIN_KEY) return next() // no admin key set → open in dev
  const key = req.headers['x-admin-key'] || req.query.admin_key
  if (key !== ADMIN_KEY) return res.status(403).json({ error: 'Invalid admin key' })
  next()
}

// List all businesses (for admin dashboard polling)
app.get('/admin/businesses', requireAdminKey, (req, res) => {
  const list = Object.values(businessRegistry).map(b => ({
    id: b.id,
    name: b.name,
    industry: b.industry,
    apiKey: b.apiKey,
    createdAt: b.createdAt,
    counts: {
      services: b.services.length,
      clients: b.clients.length,
      prospects: b.prospects.length,
      invoices: b.invoices.length,
    },
  }))
  res.json({ data: list })
})

// Get one business's full data
app.get('/admin/businesses/:id', requireAdminKey, (req, res) => {
  const biz = businessRegistry[req.params.id]
  if (!biz) return res.status(404).json({ error: 'Business not found' })
  res.json({ data: biz })
})

// Create a new business
app.post('/admin/businesses', requireAdminKey, (req, res) => {
  const { name, industry } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 20) + '-' + Date.now().toString().slice(-4)
  const apiKey = generateApiKey(id.split('-').slice(0, 2).join('-'))
  const biz = createBusiness({ id, name, industry, apiKey, seed: true })
  logActivity(id, name, 'POST', '/admin/businesses', 201, `API key: ${apiKey}`)
  res.status(201).json({ data: { id: biz.id, name: biz.name, apiKey: biz.apiKey } })
})

// Reset a business's data to seed
app.post('/admin/businesses/:id/reset', requireAdminKey, (req, res) => {
  const biz = businessRegistry[req.params.id]
  if (!biz) return res.status(404).json({ error: 'Business not found' })
  biz.services = makeSeedServices(biz.id)
  biz.clients = makeSeedClients(biz.id)
  biz.prospects = makeSeedProspects(biz.id)
  biz.invoices = makeSeedInvoices(biz.id)
  logActivity(biz.id, biz.name, 'POST', `/admin/businesses/${biz.id}/reset`, 200, 'Data reset to seed')
  res.json({ message: 'Reset to seed data' })
})

// Delete a business
app.delete('/admin/businesses/:id', requireAdminKey, (req, res) => {
  const biz = businessRegistry[req.params.id]
  if (!biz) return res.status(404).json({ error: 'Business not found' })
  delete businessRegistry[req.params.id]
  logActivity(req.params.id, biz.name, 'DELETE', `/admin/businesses/${req.params.id}`, 200)
  res.json({ message: 'Business deleted' })
})

// Activity log
app.get('/admin/activity', requireAdminKey, (req, res) => {
  res.json({ data: activityLog })
})

// ─── HEALTH ───────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  const businesses = Object.values(businessRegistry).map(b => ({
    id: b.id,
    name: b.name,
    services: b.services.length,
    clients: b.clients.length,
    prospects: b.prospects.length,
    invoices: b.invoices.length,
  }))
  res.json({ status: 'ok', businesses })
})

// ─── ADMIN DASHBOARD (HTML) ──────────────────────────────────────────────────

app.get('/admin', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IACRM Simulator — Admin</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
    .header { background: #1e293b; border-bottom: 1px solid #334155; padding: 16px 32px; display: flex; align-items: center; gap: 12px; }
    .header h1 { font-size: 1.1rem; font-weight: 600; color: #f8fafc; }
    .badge { background: #22c55e; color: #fff; font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 99px; letter-spacing: 0.05em; text-transform: uppercase; }
    .badge.live { background: #ef4444; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.6} }
    .container { max-width: 1200px; margin: 0 auto; padding: 32px; }
    .section-title { font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .card-name { font-size: 1rem; font-weight: 600; color: #f8fafc; }
    .card-industry { font-size: 0.75rem; color: #94a3b8; margin-top: 2px; }
    .api-key-box { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .api-key-text { font-family: 'Courier New', monospace; font-size: 0.8rem; color: #a5f3fc; word-break: break-all; }
    .btn { cursor: pointer; border: none; border-radius: 6px; font-size: 0.75rem; font-weight: 600; padding: 6px 12px; transition: opacity .15s; }
    .btn:hover { opacity: .8; }
    .btn-copy { background: #334155; color: #e2e8f0; }
    .btn-reset { background: #f59e0b22; color: #fbbf24; border: 1px solid #f59e0b44; }
    .btn-delete { background: #ef444422; color: #f87171; border: 1px solid #ef444444; }
    .btn-primary { background: #3b82f6; color: #fff; padding: 8px 20px; font-size: 0.85rem; }
    .counts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .count-item { background: #0f172a; border-radius: 8px; padding: 10px; text-align: center; }
    .count-num { font-size: 1.4rem; font-weight: 700; color: #f8fafc; }
    .count-label { font-size: 0.65rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }
    .card-actions { display: flex; gap: 8px; margin-top: 14px; }
    .form-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; margin-bottom: 32px; }
    .form-row { display: flex; gap: 12px; flex-wrap: wrap; }
    .form-group { flex: 1; min-width: 180px; }
    .form-group label { display: block; font-size: 0.75rem; color: #94a3b8; margin-bottom: 6px; font-weight: 500; }
    .form-group input { width: 100%; background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 8px 12px; color: #f8fafc; font-size: 0.875rem; outline: none; }
    .form-group input:focus { border-color: #3b82f6; }
    .form-submit { display: flex; align-items: flex-end; }
    .log-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 0; overflow: hidden; }
    .log-header { padding: 14px 20px; border-bottom: 1px solid #334155; display: flex; align-items: center; gap: 8px; }
    .log-body { max-height: 320px; overflow-y: auto; font-family: 'Courier New', monospace; font-size: 0.75rem; }
    .log-row { display: flex; gap: 12px; padding: 6px 20px; border-bottom: 1px solid #1e293b; align-items: baseline; }
    .log-row:hover { background: #0f172a; }
    .log-ts { color: #475569; white-space: nowrap; flex-shrink: 0; }
    .log-biz { color: #a78bfa; flex-shrink: 0; min-width: 100px; }
    .log-method { font-weight: 700; flex-shrink: 0; min-width: 48px; }
    .log-method.GET { color: #22d3ee; }
    .log-method.POST { color: #4ade80; }
    .log-method.PATCH { color: #fb923c; }
    .log-method.DELETE { color: #f87171; }
    .log-path { color: #cbd5e1; flex: 1; }
    .log-note { color: #64748b; }
    .empty-log { padding: 32px; text-align: center; color: #475569; font-family: sans-serif; font-size: 0.875rem; }
    .toast { position: fixed; bottom: 24px; right: 24px; background: #22c55e; color: #fff; padding: 10px 18px; border-radius: 8px; font-size: 0.875rem; font-weight: 500; z-index: 9999; opacity: 0; transform: translateY(8px); transition: all .2s; pointer-events: none; }
    .toast.show { opacity: 1; transform: translateY(0); }
  </style>
</head>
<body>
  <div class="header">
    <h1>IACRM Simulator</h1>
    <span class="badge live">LIVE</span>
    <span style="flex:1"></span>
    <span style="font-size:.75rem;color:#64748b">Admin dashboard — auto-refreshes every 5s</span>
  </div>
  <div class="container">

    <div class="section-title">Business Accounts</div>
    <div class="grid" id="biz-grid">
      <div style="color:#64748b;font-size:.875rem">Loading…</div>
    </div>

    <div class="section-title">Add New Business</div>
    <div class="form-card">
      <div class="form-row">
        <div class="form-group">
          <label>Business Name *</label>
          <input type="text" id="new-name" placeholder="e.g. Cabinet Martin SAS">
        </div>
        <div class="form-group">
          <label>Industry</label>
          <input type="text" id="new-industry" placeholder="e.g. Comptabilite">
        </div>
        <div class="form-submit">
          <button class="btn btn-primary" onclick="createBusiness()">Create Business</button>
        </div>
      </div>
      <div id="create-result" style="margin-top:14px;font-size:.8rem;color:#4ade80"></div>
    </div>

    <div class="section-title">Activity Log <span id="log-count" style="color:#475569;font-weight:400;text-transform:none;letter-spacing:0"></span></div>
    <div class="log-card">
      <div class="log-header">
        <span class="badge live">LIVE</span>
        <span style="font-size:.75rem;color:#64748b">All incoming requests from HD Parrainage and Postman</span>
      </div>
      <div class="log-body" id="log-body">
        <div class="empty-log">No activity yet. Configure HD Parrainage with one of the API keys above.</div>
      </div>
    </div>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    function showToast(msg) {
      const t = document.getElementById('toast')
      t.textContent = msg
      t.classList.add('show')
      setTimeout(() => t.classList.remove('show'), 2200)
    }

    function copyKey(key) {
      navigator.clipboard.writeText(key).then(() => showToast('API key copied!'))
    }

    async function resetBusiness(id) {
      if (!confirm('Reset ' + id + ' to seed data?')) return
      await fetch('/admin/businesses/' + id + '/reset', { method: 'POST' })
      showToast('Data reset to seed')
      loadData()
    }

    async function deleteBusiness(id) {
      if (!confirm('Delete business ' + id + '? This cannot be undone.')) return
      await fetch('/admin/businesses/' + id, { method: 'DELETE' })
      showToast('Business deleted')
      loadData()
    }

    async function createBusiness() {
      const name = document.getElementById('new-name').value.trim()
      const industry = document.getElementById('new-industry').value.trim()
      if (!name) { showToast('Name is required'); return }
      const res = await fetch('/admin/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, industry })
      })
      const data = await res.json()
      if (res.ok) {
        document.getElementById('create-result').innerHTML =
          'Created! API Key: <strong style="color:#a5f3fc">' + data.data.apiKey + '</strong>'
        document.getElementById('new-name').value = ''
        document.getElementById('new-industry').value = ''
        loadData()
      } else {
        showToast('Error: ' + (data.error || 'unknown'))
      }
    }

    async function loadData() {
      const [bizRes, logRes] = await Promise.all([
        fetch('/admin/businesses').then(r => r.json()),
        fetch('/admin/activity').then(r => r.json()),
      ])

      // Render businesses
      const grid = document.getElementById('biz-grid')
      if (!bizRes.data || bizRes.data.length === 0) {
        grid.innerHTML = '<div style="color:#64748b;font-size:.875rem">No businesses yet.</div>'
      } else {
        grid.innerHTML = bizRes.data.map(b => \`
          <div class="card">
            <div class="card-header">
              <div>
                <div class="card-name">\${b.name}</div>
                <div class="card-industry">\${b.industry}</div>
              </div>
              <span class="badge" style="background:#3b82f6">\${b.id}</span>
            </div>
            <div class="api-key-box">
              <span class="api-key-text">\${b.apiKey}</span>
              <button class="btn btn-copy" onclick="copyKey('\${b.apiKey}')">Copy</button>
            </div>
            <div class="counts">
              <div class="count-item"><div class="count-num">\${b.counts.services}</div><div class="count-label">Services</div></div>
              <div class="count-item"><div class="count-num">\${b.counts.clients}</div><div class="count-label">Clients</div></div>
              <div class="count-item"><div class="count-num">\${b.counts.prospects}</div><div class="count-label">Prospects</div></div>
              <div class="count-item"><div class="count-num">\${b.counts.invoices}</div><div class="count-label">Invoices</div></div>
            </div>
            <div class="card-actions">
              <a class="btn" style="background:#3b82f6;color:#fff;text-decoration:none;padding:6px 14px" href="/biz/\${b.id}" target="_blank">Open →</a>
              <button class="btn btn-reset" onclick="resetBusiness('\${b.id}')">Reset</button>
              <button class="btn btn-delete" onclick="deleteBusiness('\${b.id}')">Delete</button>
            </div>
          </div>
        \`).join('')
      }

      // Render log
      const logBody = document.getElementById('log-body')
      document.getElementById('log-count').textContent = logRes.data.length ? '(' + logRes.data.length + ')' : ''
      if (!logRes.data || logRes.data.length === 0) {
        logBody.innerHTML = '<div class="empty-log">No activity yet. Configure HD Parrainage with one of the API keys above.</div>'
      } else {
        logBody.innerHTML = logRes.data.map(e => \`
          <div class="log-row">
            <span class="log-ts">\${e.ts.replace('T',' ').substring(0,19)}</span>
            <span class="log-biz">\${e.bizName || e.bizId || '-'}</span>
            <span class="log-method \${e.method}">\${e.method}</span>
            <span class="log-path">\${e.path}</span>
            <span class="log-note">\${e.note || ''}</span>
          </div>
        \`).join('')
      }
    }

    loadData()
    setInterval(loadData, 5000)
  </script>
</body>
</html>`)
})

// ─── PER-BUSINESS DASHBOARD ──────────────────────────────────────────────────

app.get('/biz/:id', (req, res) => {
  const biz = businessRegistry[req.params.id]
  if (!biz) return res.status(404).send('<h2>Business not found</h2><a href="/admin">← Admin</a>')

  res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${biz.name} — IACRM</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }

    /* ── Header ── */
    .header { background: #1e293b; border-bottom: 1px solid #334155; padding: 0 32px; display: flex; align-items: center; height: 56px; gap: 16px; }
    .header-name { font-size: 1rem; font-weight: 700; color: #f8fafc; }
    .header-industry { font-size: .75rem; color: #64748b; margin-top: 1px; }
    .header-spacer { flex: 1; }
    .key-pill { background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 4px 10px; font-family: monospace; font-size: .75rem; color: #a5f3fc; display: flex; align-items: center; gap: 8px; }
    .btn-sm { cursor: pointer; border: none; background: #334155; color: #e2e8f0; border-radius: 5px; padding: 4px 10px; font-size: .7rem; font-weight: 600; }
    .btn-sm:hover { background: #475569; }
    .back-link { color: #64748b; font-size: .8rem; text-decoration: none; }
    .back-link:hover { color: #94a3b8; }
    .sync-badge { font-size: .65rem; color: #4ade80; border: 1px solid #4ade8033; border-radius: 99px; padding: 2px 8px; }

    /* ── Tabs ── */
    .tabs { background: #1e293b; border-bottom: 1px solid #334155; display: flex; padding: 0 32px; }
    .tab { padding: 14px 20px; font-size: .875rem; font-weight: 500; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; }
    .tab:hover { color: #cbd5e1; }
    .tab.active { color: #f8fafc; border-bottom-color: #3b82f6; }
    .tab-count { background: #334155; color: #94a3b8; font-size: .65rem; padding: 1px 6px; border-radius: 99px; margin-left: 6px; }
    .tab.active .tab-count { background: #3b82f633; color: #93c5fd; }

    /* ── Content ── */
    .content { padding: 28px 32px; max-width: 1300px; }
    .tab-panel { display: none; }
    .tab-panel.active { display: block; }

    /* ── Kanban ── */
    .kanban { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 12px; min-height: 400px; }
    .kanban-col { flex-shrink: 0; width: 220px; }
    .kanban-col-header { padding: 10px 12px; border-radius: 8px 8px 0 0; font-size: .75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
    .kanban-cards { display: flex; flex-direction: column; gap: 8px; min-height: 60px; }
    .pcard { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 12px; }
    .pcard-name { font-size: .875rem; font-weight: 600; color: #f8fafc; }
    .pcard-company { font-size: .75rem; color: #64748b; margin-top: 2px; margin-bottom: 10px; }
    .pcard-agent { font-size: .7rem; color: #475569; margin-bottom: 8px; }
    .pcard-actions { display: flex; gap: 5px; flex-wrap: wrap; }
    .btn-stage { cursor: pointer; border: none; border-radius: 5px; font-size: .7rem; font-weight: 600; padding: 4px 8px; }
    .btn-advance { background: #3b82f622; color: #60a5fa; border: 1px solid #3b82f644; }
    .btn-advance:hover { background: #3b82f633; }
    .btn-lost { background: #ef444422; color: #f87171; border: 1px solid #ef444444; }
    .btn-lost:hover { background: #ef444433; }
    .btn-won { background: #22c55e22; color: #4ade80; border: 1px solid #22c55e44; }
    .btn-won:hover { background: #22c55e33; }
    .btn-pick { cursor: pointer; border: 1px solid #334155; background: #0f172a; color: #94a3b8; border-radius: 5px; font-size: .7rem; padding: 4px 8px; }
    .btn-pick:hover { border-color: #475569; }
    .kanban-empty { color: #334155; font-size: .75rem; padding: 12px; text-align: center; border: 1px dashed #334155; border-radius: 6px; }

    /* Stage column header colors */
    .stage-suspect     .kanban-col-header { background: #1e293b; color: #94a3b8; border: 1px solid #334155; }
    .stage-froid       .kanban-col-header { background: #1e3a5f; color: #93c5fd; border: 1px solid #2563eb44; }
    .stage-tiede       .kanban-col-header { background: #431407; color: #fdba74; border: 1px solid #ea580c44; }
    .stage-chaud       .kanban-col-header { background: #450a0a; color: #fca5a5; border: 1px solid #dc262644; }
    .stage-converted   .kanban-col-header { background: #052e16; color: #86efac; border: 1px solid #16a34a44; }
    .stage-lost        .kanban-col-header { background: #1c1917; color: #57534e; border: 1px solid #44403c44; }

    /* stage badges (inline) */
    .sbadge { display: inline-block; font-size: .65rem; font-weight: 700; padding: 2px 7px; border-radius: 99px; text-transform: uppercase; letter-spacing: .05em; }
    .sbadge-suspect   { background: #1e293b; color: #94a3b8; border: 1px solid #334155; }
    .sbadge-froid     { background: #1e3a5f; color: #93c5fd; border: 1px solid #2563eb44; }
    .sbadge-tiede     { background: #431407; color: #fdba74; border: 1px solid #ea580c44; }
    .sbadge-chaud     { background: #450a0a; color: #fca5a5; border: 1px solid #dc262644; }
    .sbadge-converted { background: #052e16; color: #86efac; border: 1px solid #16a34a44; }
    .sbadge-lost      { background: #1c1917; color: #78716c; border: 1px solid #44403c44; }

    /* ── Tables ── */
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: .875rem; }
    th { text-align: left; padding: 10px 14px; background: #1e293b; font-size: .7rem; font-weight: 600; text-transform: uppercase; letter-spacing: .07em; color: #64748b; border-bottom: 1px solid #334155; white-space: nowrap; }
    td { padding: 10px 14px; border-bottom: 1px solid #1e293b; color: #cbd5e1; vertical-align: middle; }
    tr:hover td { background: #1e293b55; }
    .td-muted { color: #475569; font-size: .8rem; }

    /* ── Forms ── */
    .form-section { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 20px; margin-top: 20px; }
    .form-section-title { font-size: .75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #64748b; margin-bottom: 14px; }
    .form-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; }
    .fg { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 130px; }
    .fg label { font-size: .7rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
    .fg input, .fg select { background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 7px 10px; color: #f8fafc; font-size: .8rem; outline: none; }
    .fg input:focus, .fg select:focus { border-color: #3b82f6; }
    .btn-add { cursor: pointer; background: #3b82f6; color: #fff; border: none; border-radius: 6px; padding: 8px 18px; font-size: .8rem; font-weight: 600; white-space: nowrap; }
    .btn-add:hover { background: #2563eb; }
    .btn-action { cursor: pointer; border: none; border-radius: 5px; font-size: .75rem; font-weight: 600; padding: 5px 10px; }
    .btn-toggle-on  { background: #22c55e22; color: #4ade80; border: 1px solid #22c55e44; }
    .btn-toggle-off { background: #ef444422; color: #f87171; border: 1px solid #ef444444; }
    .btn-pay        { background: #22c55e22; color: #4ade80; border: 1px solid #22c55e44; }
    .btn-del        { background: #ef444411; color: #f87171; border: 1px solid #ef444422; }

    /* ── Stage picker modal ── */
    .modal-bg { display: none; position: fixed; inset: 0; background: #00000088; z-index: 100; align-items: center; justify-content: center; }
    .modal-bg.open { display: flex; }
    .modal { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; min-width: 280px; }
    .modal-title { font-weight: 600; margin-bottom: 16px; font-size: .95rem; }
    .stage-btn-grid { display: flex; flex-direction: column; gap: 8px; }
    .stage-option { cursor: pointer; border: 1px solid #334155; background: #0f172a; color: #cbd5e1; border-radius: 7px; padding: 10px 14px; font-size: .875rem; text-align: left; }
    .stage-option:hover { border-color: #3b82f6; color: #f8fafc; }
    .stage-option.current { border-color: #3b82f6; background: #3b82f611; color: #60a5fa; }
    .modal-cancel { margin-top: 12px; width: 100%; cursor: pointer; background: #334155; border: none; color: #94a3b8; border-radius: 7px; padding: 8px; font-size: .8rem; }

    /* ── Misc ── */
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .section-title { font-size: .75rem; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: #64748b; }
    .refresh-hint { font-size: .7rem; color: #334155; }
    .toast { position: fixed; bottom: 24px; right: 24px; background: #22c55e; color: #fff; padding: 10px 18px; border-radius: 8px; font-size: .875rem; font-weight: 500; z-index: 9999; opacity: 0; transform: translateY(8px); transition: all .2s; pointer-events: none; }
    .toast.show { opacity: 1; transform: translateY(0); }
    .toast.error { background: #ef4444; }
    .empty-state { color: #475569; font-size: .875rem; padding: 40px; text-align: center; border: 1px dashed #334155; border-radius: 10px; }
    .hdp-hint { background: #1e293b; border: 1px solid #334155; border-left: 3px solid #3b82f6; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: .8rem; color: #94a3b8; }
    .hdp-hint strong { color: #e2e8f0; }
    .add-btn-top { cursor: pointer; background: #1e293b; border: 1px solid #334155; color: #94a3b8; border-radius: 6px; padding: 6px 14px; font-size: .75rem; font-weight: 600; }
    .add-btn-top:hover { border-color: #3b82f6; color: #60a5fa; }
    .price-val { color: #a5f3fc; font-family: monospace; font-size: .85rem; }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div>
      <div class="header-name">${biz.name}</div>
      <div class="header-industry">${biz.industry}</div>
    </div>
    <div style="display:flex;align-items:center;gap:8px" class="key-pill">
      <span>API Key: <strong id="apikey-display">${biz.apiKey}</strong></span>
      <button class="btn-sm" onclick="copyApiKey()">Copy</button>
    </div>
    <div class="header-spacer"></div>
    <span class="sync-badge" id="sync-indicator">⟳ syncing</span>
    <a href="/admin" class="back-link">← Admin</a>
  </div>

  <!-- Tabs -->
  <div class="tabs">
    <div class="tab active" onclick="switchTab('pipeline')" id="tab-pipeline">Pipeline <span class="tab-count" id="cnt-pipeline">0</span></div>
    <div class="tab" onclick="switchTab('services')" id="tab-services">Services <span class="tab-count" id="cnt-services">0</span></div>
    <div class="tab" onclick="switchTab('clients')" id="tab-clients">Clients <span class="tab-count" id="cnt-clients">0</span></div>
    <div class="tab" onclick="switchTab('invoices')" id="tab-invoices">Factures <span class="tab-count" id="cnt-invoices">0</span></div>
  </div>

  <!-- Content -->
  <div class="content">

    <!-- HD Parrainage hint -->
    <div class="hdp-hint">
      Configurez HD Parrainage → IACRM → Paramètres :
      <strong>Base URL</strong> <code style="background:#0f172a;padding:1px 6px;border-radius:4px;font-size:.8em">http://localhost:${PORT}</code>
      &nbsp; <strong>API Key</strong> <code style="background:#0f172a;padding:1px 6px;border-radius:4px;font-size:.8em">${biz.apiKey}</code>
      &nbsp;—&nbsp; Les actions ici se reflètent dans HD Parrainage et vice-versa. Auto-refresh toutes les 8s.
    </div>

    <!-- Pipeline Tab -->
    <div class="tab-panel active" id="panel-pipeline">
      <div class="section-header">
        <span class="section-title">Pipeline Prospects</span>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="refresh-hint" id="last-refresh">...</span>
          <button class="add-btn-top" onclick="toggleAddProspect()">+ Ajouter prospect</button>
        </div>
      </div>

      <!-- Add Prospect inline form -->
      <div class="form-section" id="add-prospect-form" style="display:none;margin-bottom:20px">
        <div class="form-section-title">Nouveau Prospect</div>
        <div class="form-row">
          <div class="fg"><label>Nom contact *</label><input type="text" id="p-name" placeholder="Marie Dupont"></div>
          <div class="fg"><label>Société</label><input type="text" id="p-company" placeholder="SARL Martin"></div>
          <div class="fg"><label>Stade initial</label>
            <select id="p-stage">
              <option value="suspect">Suspect</option>
              <option value="prospect_froid">Prospect froid</option>
              <option value="prospect_tiede">Prospect tiède</option>
              <option value="prospect_chaud">Prospect chaud</option>
            </select>
          </div>
          <div class="fg"><label>Agent assigné</label><input type="text" id="p-agent" placeholder="agent-001"></div>
          <button class="btn-add" onclick="addProspect()">Créer</button>
        </div>
      </div>

      <div class="kanban" id="kanban-board">
        <div style="color:#334155;padding:40px;font-size:.875rem">Chargement…</div>
      </div>
    </div>

    <!-- Services Tab -->
    <div class="tab-panel" id="panel-services">
      <div class="section-header">
        <span class="section-title">Services offerts</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nom</th><th>Catégorie</th><th>Prix unitaire</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody id="services-body"><tr><td colspan="5" style="color:#475569;padding:32px;text-align:center">Chargement…</td></tr></tbody>
        </table>
      </div>
      <div class="form-section">
        <div class="form-section-title">Ajouter un service</div>
        <div class="form-row">
          <div class="fg"><label>Nom *</label><input type="text" id="svc-name" placeholder="Audit Comptable"></div>
          <div class="fg"><label>Catégorie</label><input type="text" id="svc-cat" placeholder="Comptabilite"></div>
          <div class="fg"><label>Prix (EUR)</label><input type="number" id="svc-price" placeholder="1500" min="0"></div>
          <div class="fg"><label>Description</label><input type="text" id="svc-desc" placeholder="Optionnel"></div>
          <button class="btn-add" onclick="addService()">Ajouter</button>
        </div>
      </div>
    </div>

    <!-- Clients Tab -->
    <div class="tab-panel" id="panel-clients">
      <div class="section-header">
        <span class="section-title">Clients</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Société</th><th>Contact</th><th>Email</th><th>Statut</th><th>Depuis</th></tr></thead>
          <tbody id="clients-body"><tr><td colspan="5" style="color:#475569;padding:32px;text-align:center">Chargement…</td></tr></tbody>
        </table>
      </div>
      <div class="form-section">
        <div class="form-section-title">Ajouter un client</div>
        <div class="form-row">
          <div class="fg"><label>Société *</label><input type="text" id="cli-company" placeholder="SARL Exemple"></div>
          <div class="fg"><label>Contact</label><input type="text" id="cli-contact" placeholder="Jean Dupont"></div>
          <div class="fg"><label>Email</label><input type="email" id="cli-email" placeholder="jean@exemple.fr"></div>
          <div class="fg"><label>Téléphone</label><input type="text" id="cli-phone" placeholder="+33 1 23 45 67 89"></div>
          <button class="btn-add" onclick="addClient()">Ajouter</button>
        </div>
      </div>
    </div>

    <!-- Invoices Tab -->
    <div class="tab-panel" id="panel-invoices">
      <div class="section-header">
        <span class="section-title">Factures</span>
      </div>
      <div id="invoice-summary" style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap"></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Référence</th><th>Client</th><th>Montant</th><th>Statut</th><th>Émise</th><th>Échéance</th><th>Actions</th></tr></thead>
          <tbody id="invoices-body"><tr><td colspan="7" style="color:#475569;padding:32px;text-align:center">Chargement…</td></tr></tbody>
        </table>
      </div>
      <div class="form-section">
        <div class="form-section-title">Ajouter une facture</div>
        <div class="form-row">
          <div class="fg"><label>Client *</label><input type="text" id="inv-client" placeholder="Boulangerie Martin"></div>
          <div class="fg"><label>Montant (EUR)</label><input type="number" id="inv-amount" placeholder="2500" min="0"></div>
          <div class="fg"><label>Référence</label><input type="text" id="inv-ref" placeholder="FAC-2026-011"></div>
          <div class="fg"><label>Statut</label>
            <select id="inv-status">
              <option value="pending">En attente</option>
              <option value="paid">Payée</option>
              <option value="overdue">En retard</option>
            </select>
          </div>
          <button class="btn-add" onclick="addInvoice()">Ajouter</button>
        </div>
      </div>
    </div>

  </div><!-- /content -->

  <!-- Stage picker modal -->
  <div class="modal-bg" id="stage-modal">
    <div class="modal">
      <div class="modal-title" id="modal-title">Changer le stade</div>
      <div class="stage-btn-grid" id="modal-stage-options"></div>
      <button class="modal-cancel" onclick="closeModal()">Annuler</button>
    </div>
  </div>

  <div class="toast" id="toast"></div>

<script>
  const BIZ_ID  = '${biz.id}'
  const API_KEY = '${biz.apiKey}'
  const BASE    = ''

  const STAGES = [
    { key: 'suspect',        label: 'Suspect',        cls: 'suspect'   },
    { key: 'prospect_froid', label: 'Prospect froid', cls: 'froid'     },
    { key: 'prospect_tiede', label: 'Prospect tiède', cls: 'tiede'     },
    { key: 'prospect_chaud', label: 'Prospect chaud', cls: 'chaud'     },
    { key: 'converted',      label: 'Converti',       cls: 'converted' },
    { key: 'lost',           label: 'Perdu',          cls: 'lost'      },
  ]
  const STAGE_MAP   = Object.fromEntries(STAGES.map(s => [s.key, s]))
  const STAGE_FLOW  = ['suspect', 'prospect_froid', 'prospect_tiede', 'prospect_chaud', 'converted']

  function nextStage(current) {
    const idx = STAGE_FLOW.indexOf(current)
    return idx >= 0 && idx < STAGE_FLOW.length - 1 ? STAGE_FLOW[idx + 1] : null
  }

  function h(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
  }

  function api(path, opts = {}) {
    return fetch(BASE + path, {
      ...opts,
      headers: { 'X-IACRM-API-Key': API_KEY, 'Content-Type': 'application/json', ...(opts.headers || {}) },
    }).then(r => r.json())
  }

  function showToast(msg, err = false) {
    const t = document.getElementById('toast')
    t.textContent = msg
    t.className = 'toast' + (err ? ' error' : '') + ' show'
    setTimeout(() => t.className = 'toast', 2200)
  }

  function copyApiKey() {
    navigator.clipboard.writeText(API_KEY).then(() => showToast('API key copied!'))
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────
  let activeTab = 'pipeline'
  function switchTab(name) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'))
    document.getElementById('tab-' + name).classList.add('active')
    document.getElementById('panel-' + name).classList.add('active')
    activeTab = name
  }

  // ── Data + render ─────────────────────────────────────────────────────────
  let state = { prospects: [], services: [], clients: [], invoices: [] }

  async function loadAll() {
    try {
      const [p, s, c, inv] = await Promise.all([
        api('/pipeline/prospects'),
        api('/services'),
        api('/clients'),
        api('/invoices'),
      ])
      state.prospects = p.data || []
      state.services  = s.data || []
      state.clients   = c.data || []
      state.invoices  = inv.data || []
      renderAll()
      updateCounts()
      document.getElementById('last-refresh').textContent = 'Mis à jour ' + new Date().toLocaleTimeString('fr')
      document.getElementById('sync-indicator').textContent = '✓ synchronisé'
      document.getElementById('sync-indicator').style.color = '#4ade80'
    } catch (e) {
      document.getElementById('sync-indicator').textContent = '✗ erreur'
      document.getElementById('sync-indicator').style.color = '#f87171'
    }
  }

  function updateCounts() {
    document.getElementById('cnt-pipeline').textContent = state.prospects.length
    document.getElementById('cnt-services').textContent = state.services.length
    document.getElementById('cnt-clients').textContent  = state.clients.length
    document.getElementById('cnt-invoices').textContent = state.invoices.length
  }

  function renderAll() {
    renderKanban()
    renderServices()
    renderClients()
    renderInvoices()
  }

  // ── Kanban ────────────────────────────────────────────────────────────────
  function renderKanban() {
    const board = document.getElementById('kanban-board')
    const cols = STAGES.map(stage => {
      const cards = state.prospects.filter(p => p.stage === stage.key)
      const next  = nextStage(stage.key)
      return \`
        <div class="kanban-col stage-\${stage.cls}">
          <div class="kanban-col-header">
            <span>\${h(stage.label)}</span>
            <span style="opacity:.6;font-weight:400">\${cards.length}</span>
          </div>
          <div class="kanban-cards">
            \${cards.length === 0
              ? \`<div class="kanban-empty">Vide</div>\`
              : cards.map(p => \`
                <div class="pcard">
                  <div class="pcard-name">\${h(p.contact_name)}</div>
                  <div class="pcard-company">\${h(p.company_name || '—')}</div>
                  \${p.assigned_agent ? \`<div class="pcard-agent">Agent: \${h(p.assigned_agent)}</div>\` : ''}
                  <div class="pcard-actions">
                    \${next ? \`<button class="btn-stage btn-advance" onclick="changeStage('\${p.iacrm_id}','\${next}')">→ \${h(STAGE_MAP[next]?.label || next)}</button>\` : ''}
                    \${stage.key !== 'lost'      ? \`<button class="btn-stage btn-lost" onclick="changeStage('\${p.iacrm_id}','lost')">Perdu</button>\` : ''}
                    \${stage.key === 'prospect_chaud' ? \`<button class="btn-stage btn-won" onclick="changeStage('\${p.iacrm_id}','converted')">Converti ✓</button>\` : ''}
                    <button class="btn-stage btn-pick" onclick="openStageModal('\${p.iacrm_id}','\${p.contact_name}','\${p.stage}')">…</button>
                  </div>
                </div>
              \`).join('')
            }
          </div>
        </div>
      \`
    })
    board.innerHTML = cols.join('')
  }

  // ── Stage change ──────────────────────────────────────────────────────────
  async function changeStage(id, stage) {
    const p = state.prospects.find(x => x.iacrm_id === id)
    await api(\`/pipeline/prospects/\${id}/stage\`, { method: 'PATCH', body: JSON.stringify({ stage }) })
    showToast(\`\${p?.contact_name || id} → \${STAGE_MAP[stage]?.label || stage}\`)
    closeModal()
    await loadAll()
  }

  let _modalId = null
  function openStageModal(id, name, current) {
    _modalId = id
    document.getElementById('modal-title').textContent = 'Changer le stade — ' + name
    document.getElementById('modal-stage-options').innerHTML = STAGES.map(s => \`
      <button class="stage-option \${s.key === current ? 'current' : ''}" onclick="changeStage('\${id}','\${s.key}')">
        \${s.label} \${s.key === current ? '← actuel' : ''}
      </button>
    \`).join('')
    document.getElementById('stage-modal').classList.add('open')
  }
  function closeModal() {
    document.getElementById('stage-modal').classList.remove('open')
    _modalId = null
  }

  // ── Add Prospect ──────────────────────────────────────────────────────────
  function toggleAddProspect() {
    const f = document.getElementById('add-prospect-form')
    f.style.display = f.style.display === 'none' ? 'block' : 'none'
  }
  async function addProspect() {
    const name    = document.getElementById('p-name').value.trim()
    const company = document.getElementById('p-company').value.trim()
    const stage   = document.getElementById('p-stage').value
    const agent   = document.getElementById('p-agent').value.trim()
    if (!name) { showToast('Nom contact requis', true); return }
    await api('/pipeline/prospects', { method: 'POST', body: JSON.stringify({ contact_name: name, company_name: company || null, stage, assigned_agent: agent || null }) })
    showToast('Prospect créé !')
    document.getElementById('p-name').value = ''
    document.getElementById('p-company').value = ''
    document.getElementById('p-agent').value = ''
    await loadAll()
  }

  // ── Services ──────────────────────────────────────────────────────────────
  function renderServices() {
    const tbody = document.getElementById('services-body')
    if (!state.services.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="td-muted" style="padding:32px;text-align:center">Aucun service</td></tr>'
      return
    }
    tbody.innerHTML = state.services.map(s => \`
      <tr>
        <td><strong style="color:#f8fafc">\${h(s.name)}</strong>\${s.description ? \`<div class="td-muted" style="font-size:.75rem;margin-top:2px">\${h(s.description)}</div>\` : ''}</td>
        <td class="td-muted">\${h(s.category || '—')}</td>
        <td class="price-val">\${Number(s.unit_price || 0).toLocaleString('fr')} €</td>
        <td>\${s.is_active
          ? '<span class="sbadge sbadge-converted">Actif</span>'
          : '<span class="sbadge sbadge-lost">Inactif</span>'}</td>
        <td style="display:flex;gap:6px">
          <button class="btn-action \${s.is_active ? 'btn-toggle-off' : 'btn-toggle-on'}" onclick="toggleService('\${s.iacrm_id}',\${!s.is_active})">
            \${s.is_active ? 'Désactiver' : 'Activer'}
          </button>
          <button class="btn-action btn-del" onclick="deleteService('\${s.iacrm_id}')">Supprimer</button>
        </td>
      </tr>
    \`).join('')
  }

  async function toggleService(id, active) {
    await api(\`/services/\${id}\`, { method: 'PATCH', body: JSON.stringify({ is_active: active }) })
    showToast(active ? 'Service activé' : 'Service désactivé')
    await loadAll()
  }

  async function deleteService(id) {
    if (!confirm('Supprimer ce service ?')) return
    await api(\`/services/\${id}\`, { method: 'DELETE' })
    showToast('Service supprimé')
    await loadAll()
  }

  async function addService() {
    const name  = document.getElementById('svc-name').value.trim()
    const cat   = document.getElementById('svc-cat').value.trim()
    const price = document.getElementById('svc-price').value
    const desc  = document.getElementById('svc-desc').value.trim()
    if (!name) { showToast('Nom du service requis', true); return }
    await api('/services', { method: 'POST', body: JSON.stringify({ name, category: cat || 'Autre', unit_price: Number(price) || 0, description: desc || null }) })
    showToast('Service ajouté — visible dans HD Parrainage')
    document.getElementById('svc-name').value = ''
    document.getElementById('svc-cat').value  = ''
    document.getElementById('svc-price').value = ''
    document.getElementById('svc-desc').value  = ''
    await loadAll()
  }

  // ── Clients ───────────────────────────────────────────────────────────────
  function renderClients() {
    const tbody = document.getElementById('clients-body')
    if (!state.clients.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="td-muted" style="padding:32px;text-align:center">Aucun client</td></tr>'
      return
    }
    tbody.innerHTML = state.clients.map(c => \`
      <tr>
        <td><strong style="color:#f8fafc">\${h(c.company_name)}</strong></td>
        <td class="td-muted">\${h(c.contact_name || '—')}</td>
        <td class="td-muted">\${h(c.contact_email || '—')}</td>
        <td>\${c.status === 'active'
          ? '<span class="sbadge sbadge-converted">Actif</span>'
          : '<span class="sbadge sbadge-lost">Inactif</span>'}</td>
        <td class="td-muted">\${c.since || '—'}</td>
      </tr>
    \`).join('')
  }

  async function addClient() {
    const company = document.getElementById('cli-company').value.trim()
    const contact = document.getElementById('cli-contact').value.trim()
    const email   = document.getElementById('cli-email').value.trim()
    const phone   = document.getElementById('cli-phone').value.trim()
    if (!company) { showToast('Société requise', true); return }
    await api('/clients', { method: 'POST', body: JSON.stringify({ company_name: company, contact_name: contact || null, contact_email: email || null, contact_phone: phone || null }) })
    showToast('Client ajouté !')
    document.getElementById('cli-company').value = ''
    document.getElementById('cli-contact').value = ''
    document.getElementById('cli-email').value   = ''
    document.getElementById('cli-phone').value   = ''
    await loadAll()
  }

  // ── Invoices ──────────────────────────────────────────────────────────────
  const STATUS_LABELS = { pending: 'En attente', paid: 'Payée', overdue: 'En retard', cancelled: 'Annulée' }
  const STATUS_CLS    = { pending: 'froid', paid: 'converted', overdue: 'chaud', cancelled: 'lost' }

  function renderInvoices() {
    // summary
    const total   = state.invoices.reduce((a,i) => a + i.amount, 0)
    const paid    = state.invoices.filter(i => i.status === 'paid').reduce((a,i) => a + i.amount, 0)
    const overdue = state.invoices.filter(i => i.status === 'overdue').reduce((a,i) => a + i.amount, 0)
    document.getElementById('invoice-summary').innerHTML = [
      { label: 'Total', val: total, cls: 'froid' },
      { label: 'Payé',    val: paid,    cls: 'converted' },
      { label: 'En retard', val: overdue, cls: 'chaud' },
    ].map(x => \`
      <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:12px 20px;min-width:140px">
        <div style="font-size:.65rem;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:4px">\${x.label}</div>
        <div style="font-size:1.2rem;font-weight:700;font-family:monospace" class="sbadge sbadge-\${x.cls}" style="background:none;border:none;font-size:1.1rem">
          \${x.val.toLocaleString('fr')} €
        </div>
      </div>
    \`).join('')

    const tbody = document.getElementById('invoices-body')
    if (!state.invoices.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="td-muted" style="padding:32px;text-align:center">Aucune facture</td></tr>'
      return
    }
    tbody.innerHTML = state.invoices.map(i => \`
      <tr>
        <td style="font-family:monospace;font-size:.8rem;color:#a5f3fc">\${h(i.invoice_reference)}</td>
        <td class="td-muted">\${h(i.client_name || i.client_id || '—')}</td>
        <td class="price-val">\${Number(i.amount).toLocaleString('fr')} €</td>
        <td><span class="sbadge sbadge-\${STATUS_CLS[i.status] || 'suspect'}">\${STATUS_LABELS[i.status] || i.status}</span></td>
        <td class="td-muted">\${i.issued_at || '—'}</td>
        <td class="td-muted">\${i.due_at || '—'}</td>
        <td>\${(i.status === 'pending' || i.status === 'overdue')
          ? \`<button class="btn-action btn-pay" onclick="payInvoice('\${i.iacrm_id}')">Marquer payée</button>\`
          : ''}</td>
      </tr>
    \`).join('')
  }

  async function payInvoice(id) {
    await api(\`/invoices/\${id}/status\`, { method: 'PATCH', body: JSON.stringify({ status: 'paid' }) })
    showToast('Facture marquée payée')
    await loadAll()
  }

  async function addInvoice() {
    const client = document.getElementById('inv-client').value.trim()
    const amount = document.getElementById('inv-amount').value
    const ref    = document.getElementById('inv-ref').value.trim()
    const status = document.getElementById('inv-status').value
    if (!client || !amount) { showToast('Client et montant requis', true); return }
    const today = new Date().toISOString().substring(0, 10)
    const due   = new Date(Date.now() + 30*86400000).toISOString().substring(0, 10)
    await api('/invoices', { method: 'POST', body: JSON.stringify({ client_name: client, amount: Number(amount), invoice_reference: ref || null, status, issued_at: today, due_at: due }) })
    showToast('Facture ajoutée !')
    document.getElementById('inv-client').value = ''
    document.getElementById('inv-amount').value = ''
    document.getElementById('inv-ref').value    = ''
    await loadAll()
  }

  // Close modal on backdrop click
  document.getElementById('stage-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal() })

  // Init
  loadAll()
  setInterval(loadAll, 8000)
</script>
</body>
</html>`)
})

// ─── ROOT ─────────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  const bizList = Object.values(businessRegistry)
  res.send(`<!DOCTYPE html>
<html><head><title>IACRM Mock Server</title>
<style>body{font-family:sans-serif;max-width:700px;margin:60px auto;padding:0 20px;color:#1e293b}
h1{font-size:1.3rem;margin-bottom:4px}h2{font-size:1rem;margin:24px 0 8px;color:#475569}
table{width:100%;border-collapse:collapse;font-size:.875rem}
th{text-align:left;padding:8px 12px;background:#f1f5f9;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:#64748b}
td{padding:8px 12px;border-bottom:1px solid #e2e8f0}
code{background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:.85em;color:#0f172a}
.tag{display:inline-block;background:#dbeafe;color:#1d4ed8;font-size:.7rem;padding:1px 7px;border-radius:99px;font-weight:600}
a{color:#2563eb}</style></head><body>
<h1>✅ IACRM Simulator is running</h1>
<p style="color:#64748b;font-size:.875rem">Multi-tenant mock IACRM API. Each business has its own API key and isolated data.</p>
<p><a href="/admin">→ Open Admin Dashboard</a></p>
<h2>Business Accounts</h2>
<table>
  <tr><th>ID</th><th>Name</th><th>API Key</th><th>Prospects</th></tr>
  ${bizList.map(b => `<tr><td><code>${b.id}</code></td><td>${b.name}</td><td><code>${b.apiKey}</code></td><td>${b.prospects.length}</td></tr>`).join('')}
</table>
<h2>Configure HD Parrainage</h2>
<p>In HD Parrainage → IACRM → Settings tab:<br>
<strong>Base URL:</strong> <code>http://localhost:${PORT}</code> (or your hosted URL)<br>
<strong>API Key:</strong> pick one from the table above</p>
<h2>Key Endpoints</h2>
<table>
  <tr><th>Method</th><th>Path</th><th>Description</th></tr>
  <tr><td><span class="tag">POST</span></td><td><code>/auth/token</code></td><td>Connection test</td></tr>
  <tr><td><span class="tag">GET</span></td><td><code>/services</code></td><td>List services</td></tr>
  <tr><td><span class="tag">POST</span></td><td><code>/pipeline/prospects</code></td><td>Create prospect (from HD Parrainage)</td></tr>
  <tr><td><span class="tag">PATCH</span></td><td><code>/pipeline/prospects/:id/stage</code></td><td>Update stage (from Postman)</td></tr>
  <tr><td><span class="tag">GET</span></td><td><code>/admin</code></td><td>Admin dashboard</td></tr>
</table>
</body></html>`)
})

// ─── START ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\nIACRM Simulator running on http://localhost:${PORT}`)
  console.log(`Admin dashboard:  http://localhost:${PORT}/admin`)
  console.log(`\nBusiness accounts:`)
  Object.values(businessRegistry).forEach(b => {
    console.log(`  [${b.id}] ${b.name}`)
    console.log(`    API Key: ${b.apiKey}`)
    console.log(`    Seeded:  ${b.services.length} services, ${b.clients.length} clients, ${b.prospects.length} prospects, ${b.invoices.length} invoices`)
  })
  console.log(`\nConfigure HD Parrainage IACRM Settings:`)
  console.log(`  Base URL: http://localhost:${PORT}`)
  console.log(`  API Key:  (pick one from the list above)\n`)
})
