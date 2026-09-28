const express = require('express');
const path = require('path');
const { BASEROW_URL = 'https://api.baserow.io', BASEROW_TOKEN = 'RBwZ37mSZvoekzRkN0hnwipiylUZossP', TABLE_BIBERONS = '1226156', TABLE_OBJECTIF = '1226160', APP_PIN = '3219', PORT = 3000 } = process.env;

if (!BASEROW_TOKEN || !TABLE_BIBERONS || !TABLE_OBJECTIF) {
  console.error('Variables manquantes : BASEROW_TOKEN, TABLE_BIBERONS, TABLE_OBJECTIF');
  process.exit(1);
}

const app = express();
app.use(express.json());
app.get('/healthz', (_, res) => res.send('ok'));

// Code d'accès optionnel (le token Baserow reste toujours côté serveur)
app.use('/api', (req, res, next) => {
  if (APP_PIN && req.get('x-pin') !== APP_PIN) return res.status(401).json({ error: 'Code incorrect' });
  next();
});

const base = (t) => `${BASEROW_URL}/api/database/rows/table/${t}/`;
async function br(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { Authorization: `Token ${BASEROW_TOKEN}`, 'Content-Type': 'application/json' } });
  if (!r.ok) throw new Error(`Baserow ${r.status}: ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}
async function listAll(table, query) {
  let next = `${base(table)}?user_field_names=true&size=200&${query}`;
  const out = [];
  while (next) {
    const d = await br(next);
    out.push(...d.results);
    next = d.next;
  }
  return out;
}
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => { console.error(e.message); res.status(500).json({ error: 'Erreur serveur ou Baserow' }); });
const clean = (r) => ({ id: r.id, jour: r.jour, heure: r.heure, quantite: Number(r.quantite) });

app.get('/api/biberons', wrap(async (req, res) => {
  const { jour, mois } = req.query;
  let filter;
  if (/^\d{4}-\d{2}-\d{2}$/.test(jour || '')) filter = `filter__jour__equal=${jour}`;
  else if (/^\d{4}-\d{2}$/.test(mois || '')) filter = `filter__jour__contains=${mois}`;
  else return res.status(400).json({ error: 'Paramètre jour ou mois invalide' });
  const rows = await listAll(TABLE_BIBERONS, `${filter}&order_by=heure`);
  res.json(rows.map(clean));
}));

app.post('/api/biberons', wrap(async (req, res) => {
  const { jour, heure, quantite } = req.body;
  const q = Number(quantite);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jour) || !/^\d{2}:\d{2}$/.test(heure) || !Number.isInteger(q) || q < 1 || q > 1000)
    return res.status(400).json({ error: 'Données invalides' });
  const row = await br(`${base(TABLE_BIBERONS)}?user_field_names=true`, {
    method: 'POST',
    body: JSON.stringify({ nom: `${jour} ${heure}`, jour, heure, quantite: q }),
  });
  res.status(201).json(clean(row));
}));

app.delete('/api/biberons/:id', wrap(async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'Id invalide' });
  await br(`${base(TABLE_BIBERONS)}${req.params.id}/`, { method: 'DELETE' });
  res.status(204).end();
}));

app.get('/api/objectif', wrap(async (_, res) => {
  const [row] = await listAll(TABLE_OBJECTIF, '');
  res.json({ quantite: Number(row?.quantite) || 600, nb_biberons: Number(row?.nb_biberons) || 6 });
}));

app.put('/api/objectif', wrap(async (req, res) => {
  const quantite = Number(req.body.quantite), nb = Number(req.body.nb_biberons);
  if (!Number.isInteger(quantite) || quantite < 1 || quantite > 3000 || !Number.isInteger(nb) || nb < 1 || nb > 20)
    return res.status(400).json({ error: 'Données invalides' });
  const [row] = await listAll(TABLE_OBJECTIF, '');
  const body = JSON.stringify({ nom: 'objectif', quantite, nb_biberons: nb });
  if (row) await br(`${base(TABLE_OBJECTIF)}${row.id}/?user_field_names=true`, { method: 'PATCH', body });
  else await br(`${base(TABLE_OBJECTIF)}?user_field_names=true`, { method: 'POST', body });
  res.json({ quantite, nb_biberons: nb });
}));

app.use(express.static(path.join(__dirname, 'public')));
app.listen(PORT, () => console.log(`Serveur prêt sur le port ${PORT}`));
