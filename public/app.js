const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
let goal = { quantite: 600, nb_biberons: 6 };
let pin = localStorage.getItem('pin') || '';
let cur = new Date(), sel = ymd(new Date());

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}
const safe = (fn) => async (...a) => { try { await fn(...a); } catch (e) { toast(e.message); } };

async function api(path, opts = {}) {
  const res = await fetch('/api' + path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json', 'x-pin': pin },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401) {
    pin = prompt("Code d'accès ?") || '';
    if (!pin) throw new Error('Code requis');
    localStorage.setItem('pin', pin);
    return api(path, opts);
  }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Erreur réseau');
  return res.status === 204 ? null : res.json();
}

const rowHTML = (r) => `<li><span class="t">${r.heure}</span><span class="q">${r.quantite} ml</span><button class="del" data-id="${r.id}" aria-label="Supprimer">✕</button></li>`;
const sum = (rows) => rows.reduce((s, r) => s + r.quantite, 0);

/* ---------- Aujourd'hui ---------- */
async function loadToday() {
  const now = new Date();
  $('#dateLabel').textContent = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#cTime').value ||= hm(now);
  const rows = await api('/biberons?jour=' + ymd(now));
  const total = sum(rows);
  $('#level').style.transform = `translateY(${(1 - Math.min(total / goal.quantite, 1)) * 214}px)`;
  $('#total').textContent = total + ' ml';
  $('#goalTxt').textContent = `sur ${goal.quantite} ml`;
  $('#hint').textContent = total >= goal.quantite
    ? '🎉 Objectif atteint !'
    : `Encore ${goal.quantite - total} ml · environ ${Math.round(goal.quantite / goal.nb_biberons)} ml par biberon`;
  $('#list').innerHTML = rows.map(rowHTML).join('') || '<li class="empty">Aucun biberon pour le moment</li>';
}
async function add(q, h) {
  if (!(q > 0)) throw new Error('Quantité invalide');
  const now = new Date();
  await api('/biberons', { method: 'POST', body: { jour: ymd(now), heure: h || hm(now), quantite: q } });
  toast('Biberon ajouté 🍼');
  await loadToday();
}
document.querySelectorAll('[data-q]').forEach((b) => (b.onclick = safe(() => add(+b.dataset.q))));
$('#custom').onsubmit = safe(async (e) => {
  e.preventDefault();
  await add(+$('#cQty').value, $('#cTime').value);
  $('#cQty').value = '';
  $('#cTime').value = '';
});

/* ---------- Objectif ---------- */
function fillGoal() {
  $('#gQty').value = goal.quantite;
  $('#gNb').value = goal.nb_biberons;
  showPer();
}
function showPer() {
  const q = +$('#gQty').value, n = +$('#gNb').value;
  $('#perBottle').textContent = q && n ? `Soit environ ${Math.round(q / n)} ml par biberon` : '';
}
$('#gQty').oninput = $('#gNb').oninput = showPer;
$('#goalForm').onsubmit = safe(async (e) => {
  e.preventDefault();
  goal = await api('/objectif', { method: 'PUT', body: { quantite: +$('#gQty').value, nb_biberons: +$('#gNb').value } });
  toast('Objectif enregistré ✅');
});

/* ---------- Historique ---------- */
let mode = 'list';
const longDate = (k) => new Date(k + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
async function loadHistory() {
  const y = cur.getFullYear(), m = cur.getMonth(), today = ymd(new Date());
  $('#monthLabel').textContent = `${MOIS[m]} ${y}`;
  $('#mList').classList.toggle('on', mode === 'list');
  $('#mCal').classList.toggle('on', mode === 'cal');
  $('#listView').hidden = mode !== 'list';
  $('#cal').hidden = $('#detail').hidden = mode !== 'cal';
  const rows = await api(`/biberons?mois=${y}-${pad(m + 1)}`);
  const by = {};
  rows.forEach((r) => (by[r.jour] ||= []).push(r));
  const keys = Object.keys(by).sort().reverse();
  const total = sum(rows);

  $('#summary').innerHTML = `<div><b>${total} ml</b><span>ce mois-ci</span></div><div><b>${keys.length ? Math.round(total / keys.length) : 0} ml</b><span>par jour en moyenne</span></div>`;

  // Liste : un bloc par jour (du plus récent au plus ancien) avec son total
  $('#listView').innerHTML = keys.map((k) => {
    const t = sum(by[k]), ok = t >= goal.quantite;
    return `<div class="card"><div class="detail-head"><h2>${longDate(k)}</h2><b class="${ok ? 'ok' : ''}">${t} ml${ok ? ' ✅' : ''}</b></div><ul class="list">${by[k].map(rowHTML).join('')}</ul></div>`;
  }).join('') || '<div class="card"><p class="hint">Aucun biberon enregistré ce mois-ci</p></div>';

  // Calendrier
  const first = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
  let h = '<div class="dow">' + [...'LMMJVSD'].map((d) => `<b>${d}</b>`).join('') + '</div><div class="grid">' + '<i></i>'.repeat(first);
  for (let d = 1; d <= days; d++) {
    const k = `${y}-${pad(m + 1)}-${pad(d)}`, t = sum(by[k] || []);
    h += `<button class="day${t >= goal.quantite ? ' ok' : ''}${k === today ? ' today' : ''}${k === sel ? ' sel' : ''}" data-k="${k}"><span>${d}</span><small>${t || ''}</small><em style="height:${Math.min(t / goal.quantite, 1) * 100}%"></em></button>`;
  }
  $('#cal').innerHTML = h + '</div>';
  const list = by[sel] || [];
  $('#detail').innerHTML = `<div class="detail-head"><h2>${longDate(sel)}</h2><b>${sum(list)} ml</b></div><ul class="list">${list.map(rowHTML).join('') || '<li class="empty">Aucun biberon ce jour-là</li>'}</ul>`;
}
$('#mList').onclick = safe(() => { mode = 'list'; return loadHistory(); });
$('#mCal').onclick = safe(() => { mode = 'cal'; return loadHistory(); });
$('#cal').onclick = safe(async (e) => {
  const b = e.target.closest('.day');
  if (b) { sel = b.dataset.k; await loadHistory(); }
});
$('#prev').onclick = safe(() => { cur = new Date(cur.getFullYear(), cur.getMonth() - 1, 1); return loadHistory(); });
$('#next').onclick = safe(() => { cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1); return loadHistory(); });

/* ---------- Suppression (aujourd'hui + historique) ---------- */
document.addEventListener('click', safe(async (e) => {
  const b = e.target.closest('.del');
  if (!b || !confirm('Supprimer ce biberon ?')) return;
  await api('/biberons/' + b.dataset.id, { method: 'DELETE' });
  toast('Supprimé');
  await route();
}));

/* ---------- Navigation ---------- */
const views = ['today', 'objectif', 'history'];
async function route() {
  const v = views.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'today';
  views.forEach((x) => {
    $('#' + x).hidden = x !== v;
    document.querySelector(`nav a[href="#${x}"]`).classList.toggle('active', x === v);
  });
  await safe(async () => {
    goal = await api('/objectif');
    if (v === 'today') await loadToday();
    else if (v === 'history') await loadHistory();
    else fillGoal();
  })();
}
window.addEventListener('hashchange', route);
// Rafraîchit quand on revient sur l'appli (utile avec plusieurs appareils)
document.addEventListener('visibilitychange', () => !document.hidden && route());
route();
