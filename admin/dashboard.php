<?php
require_once __DIR__ . '/auth.php';
initAllTables();
requireAuth();

$db = getDB();
$subCount = (int)$db->query("SELECT COUNT(*) FROM subscribers")->fetchColumn();
$eventCount = (int)$db->query("SELECT COUNT(*) FROM planning")->fetchColumn();
$prizeCount = (int)$db->query("SELECT COUNT(*) FROM prizes")->fetchColumn();
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard — ChanteEnScène</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root { --pink: #e91e8c; --green: #7ec850; --dark: #0d0b1a; --card: #161228; --border: #2a2545; --blue: #00b4d8; --orange: #fbbf24; }
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Inter',sans-serif; background:var(--dark); color:#fff; min-height:100vh; }

        /* ============ TOPBAR ============ */
        .topbar {
            display:flex; align-items:center; justify-content:space-between; padding:1rem 1.5rem;
            background:var(--card); border-bottom:1px solid var(--border); position:sticky; top:0; z-index:100;
        }
        .topbar .brand { font-weight:800; font-size:1.1rem; }
        .topbar .brand span { color:var(--pink); }
        .topbar-right { display:flex; align-items:center; gap:1rem; }
        .topbar-user { font-size:0.8rem; color:rgba(255,255,255,0.5); }
        .topbar-user strong { color:#fff; }
        .btn-logout { padding:0.4rem 1rem; background:rgba(255,255,255,0.06); border:1px solid var(--border); border-radius:8px; color:rgba(255,255,255,0.6); font-size:0.8rem; text-decoration:none; transition:all 0.2s; }
        .btn-logout:hover { background:rgba(255,80,80,0.1); border-color:rgba(255,80,80,0.3); color:#ff6b6b; }

        /* ============ NAV TABS ============ */
        .nav-tabs {
            display:flex; gap:0; background:var(--card); border-bottom:1px solid var(--border);
            overflow-x:auto; -webkit-overflow-scrolling:touch;
        }
        .nav-tab {
            padding:0.9rem 1.5rem; font-size:0.85rem; font-weight:600; color:rgba(255,255,255,0.4);
            cursor:pointer; border-bottom:2px solid transparent; white-space:nowrap; transition:all 0.2s; user-select:none;
        }
        .nav-tab:hover { color:rgba(255,255,255,0.7); }
        .nav-tab.active { color:var(--pink); border-bottom-color:var(--pink); }

        /* ============ CONTENT ============ */
        .content { padding:1.5rem; max-width:1000px; margin:0 auto; }

        /* Stats cards */
        .stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:1rem; margin-bottom:2rem; }
        .stat-card {
            background:var(--card); border:1px solid var(--border); border-radius:12px; padding:1.2rem;
            text-align:center; transition:transform 0.2s;
        }
        .stat-card:hover { transform:translateY(-2px); }
        .stat-num { font-size:2rem; font-weight:800; }
        .stat-num.pink { color:var(--pink); }
        .stat-num.green { color:var(--green); }
        .stat-num.orange { color:var(--orange); }
        .stat-label { font-size:0.75rem; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:1px; margin-top:0.3rem; }

        /* Section panels */
        .panel { display:none; }
        .panel.active { display:block; }

        .section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:1.2rem; flex-wrap:wrap; gap:0.8rem; }
        .section-title { font-size:1.2rem; font-weight:700; }
        .btn-add {
            padding:0.5rem 1.2rem; background:linear-gradient(135deg,var(--pink),#c4157a); border:none;
            border-radius:8px; color:#fff; font-family:'Inter',sans-serif; font-weight:600; font-size:0.85rem; cursor:pointer; transition:transform 0.2s;
        }
        .btn-add:hover { transform:translateY(-1px); }

        /* Table */
        .table-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }
        table { width:100%; border-collapse:collapse; }
        th { text-align:left; padding:0.7rem 0.8rem; font-size:0.7rem; text-transform:uppercase; letter-spacing:1px; color:rgba(255,255,255,0.35); border-bottom:1px solid var(--border); }
        td { padding:0.7rem 0.8rem; font-size:0.88rem; border-bottom:1px solid rgba(255,255,255,0.04); }
        tr:hover td { background:rgba(255,255,255,0.02); }
        .badge { display:inline-block; padding:0.2rem 0.6rem; border-radius:20px; font-size:0.7rem; font-weight:600; }
        .badge-green { background:rgba(126,200,80,0.12); color:var(--green); }
        .badge-pink { background:rgba(233,30,140,0.12); color:var(--pink); }

        /* Action buttons */
        .btn-sm { padding:0.3rem 0.7rem; border-radius:6px; font-size:0.75rem; font-weight:600; border:none; cursor:pointer; font-family:'Inter',sans-serif; transition:all 0.2s; }
        .btn-edit { background:rgba(0,180,216,0.12); color:var(--blue); }
        .btn-edit:hover { background:rgba(0,180,216,0.25); }
        .btn-del { background:rgba(255,80,80,0.1); color:#ff6b6b; }
        .btn-del:hover { background:rgba(255,80,80,0.25); }
        .btn-export { padding:0.5rem 1.2rem; background:rgba(126,200,80,0.1); border:1px solid rgba(126,200,80,0.25); border-radius:8px; color:var(--green); font-family:'Inter',sans-serif; font-weight:600; font-size:0.85rem; cursor:pointer; transition:all 0.2s; }
        .btn-export:hover { background:rgba(126,200,80,0.2); }

        /* Modal */
        .modal-overlay {
            position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7);
            display:none; align-items:center; justify-content:center; z-index:200; padding:1rem;
        }
        .modal-overlay.show { display:flex; }
        .modal {
            background:var(--card); border:1px solid var(--border); border-radius:16px; padding:2rem;
            width:100%; max-width:480px; max-height:90vh; overflow-y:auto;
        }
        .modal h3 { font-size:1.1rem; font-weight:700; margin-bottom:1.5rem; }
        .modal label { display:block; font-size:0.75rem; font-weight:600; color:rgba(255,255,255,0.5); text-transform:uppercase; letter-spacing:1px; margin-bottom:0.3rem; }
        .modal input, .modal textarea, .modal select {
            width:100%; padding:0.7rem 0.9rem; background:rgba(255,255,255,0.05); border:1px solid var(--border);
            border-radius:8px; color:#fff; font-family:'Inter',sans-serif; font-size:0.9rem; outline:none; margin-bottom:1rem; transition:border-color 0.2s;
        }
        .modal input:focus, .modal textarea:focus { border-color:var(--pink); }
        .modal textarea { resize:vertical; min-height:80px; }
        .modal-actions { display:flex; gap:0.8rem; justify-content:flex-end; margin-top:0.5rem; }
        .btn-cancel { padding:0.6rem 1.2rem; background:rgba(255,255,255,0.06); border:1px solid var(--border); border-radius:8px; color:rgba(255,255,255,0.6); font-family:'Inter',sans-serif; font-weight:600; font-size:0.85rem; cursor:pointer; }
        .btn-save { padding:0.6rem 1.2rem; background:linear-gradient(135deg,var(--green),#5ea63a); border:none; border-radius:8px; color:#fff; font-family:'Inter',sans-serif; font-weight:600; font-size:0.85rem; cursor:pointer; }

        .empty-state { text-align:center; padding:3rem 1rem; color:rgba(255,255,255,0.3); }
        .empty-state .icon { font-size:2.5rem; margin-bottom:0.8rem; }

        @media(max-width:600px) {
            .topbar { padding:0.8rem 1rem; }
            .topbar-user { display:none; }
            .content { padding:1rem; }
            .stats { grid-template-columns:repeat(3,1fr); gap:0.6rem; }
            .stat-card { padding:0.8rem 0.5rem; }
            .stat-num { font-size:1.4rem; }
            .nav-tab { padding:0.7rem 1rem; font-size:0.8rem; }
            .modal { padding:1.5rem; }
        }
    </style>
</head>
<body>

<div class="topbar">
    <div class="brand">Chant<span>En</span>Scène</div>
    <div class="topbar-right">
        <span class="topbar-user">Connecté : <strong><?= htmlspecialchars($_SESSION['admin_user']) ?></strong></span>
        <a href="logout.php" class="btn-logout">Déconnexion</a>
    </div>
</div>

<div class="nav-tabs">
    <div class="nav-tab active" data-tab="overview">Vue d'ensemble</div>
    <div class="nav-tab" data-tab="subscribers">Inscrits</div>
    <div class="nav-tab" data-tab="planning">Planning</div>
    <div class="nav-tab" data-tab="prizes">Prix à gagner</div>
</div>

<div class="content">

    <!-- ============ OVERVIEW ============ -->
    <div class="panel active" id="panel-overview">
        <div class="stats">
            <div class="stat-card">
                <div class="stat-num pink"><?= $subCount ?></div>
                <div class="stat-label">Inscrits</div>
            </div>
            <div class="stat-card">
                <div class="stat-num green"><?= $eventCount ?></div>
                <div class="stat-label">Événements</div>
            </div>
            <div class="stat-card">
                <div class="stat-num orange"><?= $prizeCount ?></div>
                <div class="stat-label">Prix</div>
            </div>
        </div>
        <div class="empty-state" style="color:rgba(255,255,255,0.25)">
            <div class="icon">🎤</div>
            <p>Bienvenue dans votre espace d'administration.<br>Utilisez les onglets pour gérer votre concours.</p>
        </div>
    </div>

    <!-- ============ SUBSCRIBERS ============ -->
    <div class="panel" id="panel-subscribers">
        <div class="section-header">
            <h2 class="section-title">Emails inscrits</h2>
            <button class="btn-export" onclick="exportEmails()">Exporter CSV</button>
        </div>
        <div class="table-wrap">
            <table id="subscribers-table">
                <thead><tr><th>Email</th><th>Date</th><th></th></tr></thead>
                <tbody id="subscribers-body"></tbody>
            </table>
        </div>
        <div class="empty-state" id="sub-empty" style="display:none"><div class="icon">📭</div><p>Aucun inscrit pour le moment</p></div>
    </div>

    <!-- ============ PLANNING ============ -->
    <div class="panel" id="panel-planning">
        <div class="section-header">
            <h2 class="section-title">Planning</h2>
            <button class="btn-add" onclick="openModal('planning')">+ Ajouter</button>
        </div>
        <div class="table-wrap">
            <table id="planning-table">
                <thead><tr><th>Date</th><th>Titre</th><th>Lieu</th><th>Statut</th><th></th></tr></thead>
                <tbody id="planning-body"></tbody>
            </table>
        </div>
        <div class="empty-state" id="plan-empty" style="display:none"><div class="icon">📅</div><p>Aucun événement planifié</p></div>
    </div>

    <!-- ============ PRIZES ============ -->
    <div class="panel" id="panel-prizes">
        <div class="section-header">
            <h2 class="section-title">Prix à gagner</h2>
            <button class="btn-add" onclick="openModal('prizes')">+ Ajouter</button>
        </div>
        <div class="table-wrap">
            <table id="prizes-table">
                <thead><tr><th>Position</th><th>Titre</th><th>Valeur</th><th></th></tr></thead>
                <tbody id="prizes-body"></tbody>
            </table>
        </div>
        <div class="empty-state" id="prize-empty" style="display:none"><div class="icon">🏆</div><p>Aucun prix défini</p></div>
    </div>
</div>

<!-- ============ MODAL PLANNING ============ -->
<div class="modal-overlay" id="modal-planning">
    <div class="modal">
        <h3 id="modal-planning-title">Ajouter un événement</h3>
        <form id="form-planning" onsubmit="return savePlanning(event)">
            <input type="hidden" name="id" id="planning-id">
            <label>Titre</label>
            <input type="text" name="title" id="planning-title" required placeholder="Ex: Auditions Paris">
            <label>Date</label>
            <input type="date" name="event_date" id="planning-date" required>
            <label>Heure</label>
            <input type="time" name="event_time" id="planning-time">
            <label>Lieu</label>
            <input type="text" name="location" id="planning-location" placeholder="Ex: Salle Pleyel, Paris">
            <label>Description</label>
            <textarea name="description" id="planning-desc" placeholder="Détails de l'événement..."></textarea>
            <label>Visibilité</label>
            <select name="is_public" id="planning-public">
                <option value="1">Public</option>
                <option value="0">Brouillon</option>
            </select>
            <div class="modal-actions">
                <button type="button" class="btn-cancel" onclick="closeModal('planning')">Annuler</button>
                <button type="submit" class="btn-save">Enregistrer</button>
            </div>
        </form>
    </div>
</div>

<!-- ============ MODAL PRIZES ============ -->
<div class="modal-overlay" id="modal-prizes">
    <div class="modal">
        <h3 id="modal-prizes-title">Ajouter un prix</h3>
        <form id="form-prizes" onsubmit="return savePrize(event)">
            <input type="hidden" name="id" id="prize-id">
            <label>Position (1er, 2e, 3e...)</label>
            <input type="number" name="rank_position" id="prize-rank" required min="1" placeholder="1">
            <label>Titre du prix</label>
            <input type="text" name="title" id="prize-title" required placeholder="Ex: Grand Prix du Jury">
            <label>Valeur</label>
            <input type="text" name="value" id="prize-value" placeholder="Ex: 5000€ + Studio">
            <label>Description</label>
            <textarea name="description" id="prize-desc" placeholder="Détails du prix..."></textarea>
            <div class="modal-actions">
                <button type="button" class="btn-cancel" onclick="closeModal('prizes')">Annuler</button>
                <button type="submit" class="btn-save">Enregistrer</button>
            </div>
        </form>
    </div>
</div>

<script>
// ============ TABS ============
document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('panel-' + tab.dataset.tab).classList.add('active');

        if (tab.dataset.tab === 'subscribers') loadSubscribers();
        if (tab.dataset.tab === 'planning') loadPlanning();
        if (tab.dataset.tab === 'prizes') loadPrizes();
    });
});

// ============ MODALS ============
function openModal(type, data = null) {
    const modal = document.getElementById('modal-' + type);
    modal.classList.add('show');
    if (type === 'planning') {
        document.getElementById('modal-planning-title').textContent = data ? 'Modifier l\'événement' : 'Ajouter un événement';
        document.getElementById('planning-id').value = data ? data.id : '';
        document.getElementById('planning-title').value = data ? data.title : '';
        document.getElementById('planning-date').value = data ? data.event_date : '';
        document.getElementById('planning-time').value = data ? (data.event_time || '') : '';
        document.getElementById('planning-location').value = data ? (data.location || '') : '';
        document.getElementById('planning-desc').value = data ? (data.description || '') : '';
        document.getElementById('planning-public').value = data ? data.is_public : '1';
    } else if (type === 'prizes') {
        document.getElementById('modal-prizes-title').textContent = data ? 'Modifier le prix' : 'Ajouter un prix';
        document.getElementById('prize-id').value = data ? data.id : '';
        document.getElementById('prize-rank').value = data ? data.rank_position : '';
        document.getElementById('prize-title').value = data ? data.title : '';
        document.getElementById('prize-value').value = data ? (data.value || '') : '';
        document.getElementById('prize-desc').value = data ? (data.description || '') : '';
    }
}

function closeModal(type) {
    document.getElementById('modal-' + type).classList.remove('show');
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('show'); });
});

// ============ API CALLS ============
async function api(endpoint, method = 'GET', body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch('api/' + endpoint, opts);
    return res.json();
}

// ============ SUBSCRIBERS ============
async function loadSubscribers() {
    const data = await api('subscribers.php');
    const body = document.getElementById('subscribers-body');
    const empty = document.getElementById('sub-empty');
    if (!data.length) { body.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    body.innerHTML = data.map(s => `
        <tr>
            <td>${esc(s.email)}</td>
            <td style="color:rgba(255,255,255,0.4);font-size:0.8rem">${formatDate(s.created_at)}</td>
            <td><button class="btn-sm btn-del" onclick="delSubscriber(${s.id})">Suppr.</button></td>
        </tr>
    `).join('');
}

async function delSubscriber(id) {
    if (!confirm('Supprimer cet inscrit ?')) return;
    await api('subscribers.php', 'DELETE', { id });
    loadSubscribers();
}

function exportEmails() {
    window.location.href = 'api/subscribers.php?export=csv';
}

// ============ PLANNING ============
async function loadPlanning() {
    const data = await api('planning.php');
    const body = document.getElementById('planning-body');
    const empty = document.getElementById('plan-empty');
    if (!data.length) { body.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    body.innerHTML = data.map(p => `
        <tr>
            <td style="white-space:nowrap">${formatDate(p.event_date)}${p.event_time ? ' ' + p.event_time.substring(0,5) : ''}</td>
            <td><strong>${esc(p.title)}</strong></td>
            <td style="color:rgba(255,255,255,0.5)">${esc(p.location || '-')}</td>
            <td><span class="badge ${p.is_public == 1 ? 'badge-green' : 'badge-pink'}">${p.is_public == 1 ? 'Public' : 'Brouillon'}</span></td>
            <td style="white-space:nowrap">
                <button class="btn-sm btn-edit" onclick='openModal("planning",${JSON.stringify(p)})'>Modifier</button>
                <button class="btn-sm btn-del" onclick="delPlanning(${p.id})">Suppr.</button>
            </td>
        </tr>
    `).join('');
}

async function savePlanning(e) {
    e.preventDefault();
    const f = document.getElementById('form-planning');
    const body = {
        id: f.querySelector('#planning-id').value || null,
        title: f.querySelector('#planning-title').value,
        event_date: f.querySelector('#planning-date').value,
        event_time: f.querySelector('#planning-time').value || null,
        location: f.querySelector('#planning-location').value,
        description: f.querySelector('#planning-desc').value,
        is_public: parseInt(f.querySelector('#planning-public').value)
    };
    await api('planning.php', body.id ? 'PUT' : 'POST', body);
    closeModal('planning');
    loadPlanning();
    return false;
}

async function delPlanning(id) {
    if (!confirm('Supprimer cet événement ?')) return;
    await api('planning.php', 'DELETE', { id });
    loadPlanning();
}

// ============ PRIZES ============
async function loadPrizes() {
    const data = await api('prizes.php');
    const body = document.getElementById('prizes-body');
    const empty = document.getElementById('prize-empty');
    if (!data.length) { body.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    body.innerHTML = data.map(p => `
        <tr>
            <td><span class="badge badge-pink">${ordinal(p.rank_position)}</span></td>
            <td><strong>${esc(p.title)}</strong></td>
            <td style="color:var(--orange)">${esc(p.value || '-')}</td>
            <td style="white-space:nowrap">
                <button class="btn-sm btn-edit" onclick='openModal("prizes",${JSON.stringify(p)})'>Modifier</button>
                <button class="btn-sm btn-del" onclick="delPrize(${p.id})">Suppr.</button>
            </td>
        </tr>
    `).join('');
}

async function savePrize(e) {
    e.preventDefault();
    const f = document.getElementById('form-prizes');
    const body = {
        id: f.querySelector('#prize-id').value || null,
        rank_position: parseInt(f.querySelector('#prize-rank').value),
        title: f.querySelector('#prize-title').value,
        value: f.querySelector('#prize-value').value,
        description: f.querySelector('#prize-desc').value
    };
    await api('prizes.php', body.id ? 'PUT' : 'POST', body);
    closeModal('prizes');
    loadPrizes();
    return false;
}

async function delPrize(id) {
    if (!confirm('Supprimer ce prix ?')) return;
    await api('prizes.php', 'DELETE', { id });
    loadPrizes();
}

// ============ HELPERS ============
function esc(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
function ordinal(n) { return n === 1 ? '1er' : n + 'e'; }
function formatDate(d) {
    if (!d) return '-';
    const date = new Date(d);
    return date.toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
}
</script>
</body>
</html>
