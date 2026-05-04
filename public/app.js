let cooperatives = [];
let applicationData = {};
let map = null;
let markers = {};
let currentCoopId = null;
let currentStatusCoopId = null;

const STATUS_LABELS = {
  'non-soumise': 'Non soumise',
  'lettre-generee': 'Lettre générée',
  'google-docs': 'Google Docs',
  'envoyee': 'Envoyée',
  'relancee': 'Relancée',
  'reponse': 'Réponse reçue',
  'en-construction': 'En construction'
};

const STATUS_COLORS = {
  'non-soumise': '#9ca3af',
  'lettre-generee': '#8b5cf6',
  'google-docs': '#ea4335',
  'envoyee': '#2563eb',
  'relancee': '#d97706',
  'reponse': '#059669',
  'en-construction': '#0891b2'
};

// ---- Init ----

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  setupViewToggle();
  setupFilters();
  setupProfileForm();
  loadStepChecks();

  checkAuth().then(() => {
    loadNews();
    if (currentUser) {
      loadProfileFromServer();
      loadTemplate();
      loadApplicationsFromServer();
    } else {
      loadApplicationData();
      loadProfile();
    }
  });

  loadCooperatives().then(async () => {
    if (currentUser) {
      await syncGoogleDocsStatus();
    }
    renderCoops();
    initMap();
    updateStats();
  }).catch(err => {
    console.error('Erreur chargement coopératives:', err);
    document.getElementById('coops-list').innerHTML =
      '<p style="color:var(--red);padding:1rem">Erreur de chargement des coopératives.</p>';
  });
});

async function checkAuth() {
  try {
    const res = await fetch('/api/auth?action=session');
    if (res.ok) {
      currentUser = await res.json();
      document.getElementById('btn-login').style.display = 'none';
      document.getElementById('user-name').style.display = 'inline';
      document.getElementById('user-name').textContent = currentUser.name || currentUser.email;
      document.getElementById('profile-auth-wall').style.display = 'none';
      document.getElementById('profile-content').style.display = 'block';
    }
  } catch {}
}

async function loadProfileFromServer() {
  try {
    const res = await fetch('/api/user?action=profile');
    if (!res.ok) return;
    const data = await res.json();
    const p = data.profile;
    if (p.name) document.getElementById('prof-name').value = p.name;
    if (p.phone) document.getElementById('prof-phone').value = p.phone;
    if (p.email) document.getElementById('prof-email').value = p.email;
    if (p.address) document.getElementById('prof-address').value = p.address;
    if (p.household) document.getElementById('prof-household').value = p.household;
    if (p.unitType) document.getElementById('prof-unit').value = p.unitType;
    if (p.motivations) document.getElementById('prof-motivations').value = p.motivations;
    if (p.experiences) document.getElementById('prof-experiences').value = p.experiences;
  } catch {}
}

async function loadApplicationsFromServer() {
  try {
    const res = await fetch('/api/user?action=applications');
    if (!res.ok) return;
    const data = await res.json();
    applicationData = {};
    for (const app of data.applications) {
      applicationData[app.coop_id] = {
        status: app.status,
        note: app.note,
        letter: app.letter,
        googleDocUrl: app.google_doc_url
      };
    }
    renderCoops();
  } catch {}
}

async function syncGoogleDocsStatus() {
  try {
    const res = await fetch('/api/google?action=list-docs');
    if (!res.ok) return;
    const data = await res.json();

    for (const file of data.files) {
      const match = file.name.match(/^Candidature - (.+)$/);
      if (!match) continue;
      const coopName = match[1];
      const coop = cooperatives.find(c => c.name === coopName);
      if (!coop) continue;

      const current = applicationData[coop.id];
      if (!current || current.status === 'non-soumise' || current.status === 'lettre-generee') {
        applicationData[coop.id] = {
          ...current,
          status: 'google-docs',
          googleDocUrl: file.webViewLink,
          googleDocDate: file.createdTime,
          note: `Google Doc créé le ${new Date(file.createdTime).toLocaleDateString('fr-CA')}` + (current?.note && !current.note.includes('Google Doc') ? ' | ' + current.note : '')
        };
      }
    }
    saveApplicationData();
  } catch (err) {
    console.log('Sync Google Docs: pas disponible');
  }
}

// ---- Data ----

async function loadCooperatives() {
  const res = await fetch('/api/cooperatives');
  cooperatives = await res.json();
}

function loadApplicationData() {
  const saved = localStorage.getItem('coop-applications');
  applicationData = saved ? JSON.parse(saved) : {};
}

function saveApplicationData(coopId) {
  localStorage.setItem('coop-applications', JSON.stringify(applicationData));
  if (currentUser && coopId && applicationData[coopId]) {
    fetch('/api/user?action=applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coopId, ...applicationData[coopId] })
    }).catch(() => {});
  }
}

function getAppStatus(coopId) {
  return applicationData[coopId]?.status || 'non-soumise';
}

function getAppNote(coopId) {
  return applicationData[coopId]?.note || '';
}

function getAppLetter(coopId) {
  return applicationData[coopId]?.letter || '';
}

// ---- Navigation ----

function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showSection(btn.dataset.section));
  });
}

function showSection(name) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.nav-btn[data-section="${name}"]`).classList.add('active');
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(`section-${name}`).classList.add('active');
  if (name === 'coops' && map) {
    setTimeout(() => map.invalidateSize(), 100);
  }
}

// ---- View Toggle ----

function setupViewToggle() {
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const layout = document.getElementById('coops-layout');
      layout.className = 'coops-layout view-' + btn.dataset.view;
      if (map) setTimeout(() => map.invalidateSize(), 100);
    });
  });
  document.getElementById('coops-layout').className = 'coops-layout view-split';
  document.querySelector('.toggle-btn[data-view="split"]').classList.add('active');
  document.querySelector('.toggle-btn[data-view="list"]').classList.remove('active');
}

// ---- Filters ----

function setupFilters() {
  document.getElementById('filter-status').addEventListener('change', renderCoops);
  document.getElementById('filter-size').addEventListener('change', renderCoops);
  document.getElementById('filter-contact').addEventListener('change', renderCoops);
}

function getFilteredCoops() {
  const statusFilter = document.getElementById('filter-status').value;
  const sizeFilter = document.getElementById('filter-size').value;
  const contactFilter = document.getElementById('filter-contact').value;

  return cooperatives.filter(c => {
    const effectiveStatus = c.future ? 'en-construction' : getAppStatus(c.id);
    if (statusFilter !== 'all' && effectiveStatus !== statusFilter) return false;
    if (sizeFilter === '4½+') {
      if (!c.types.some(t => ['4½','5½','6½','7½'].includes(t))) return false;
    } else if (sizeFilter !== 'all') {
      if (!c.types.includes(sizeFilter)) return false;
    }
    if (contactFilter === 'email' && (!c.email || c.postalOnly)) return false;
    if (contactFilter === 'postal' && c.email && !c.postalOnly) return false;
    return true;
  });
}

// ---- Render Coops ----

function renderCoops() {
  const filtered = getFilteredCoops();
  const list = document.getElementById('coops-list');

  list.innerHTML = filtered.map(c => {
    const status = c.future ? 'en-construction' : getAppStatus(c.id);
    const note = getAppNote(c.id);
    const hasEmail = c.email || false;
    const canEmailApply = hasEmail && !c.postalOnly;
    const hasWebsite = c.website || false;

    return `
      <div class="coop-card" data-id="${c.id}" onclick="highlightCoop('${c.id}')">
        <div class="coop-card-top">
          <span class="coop-name">${c.name}</span>
          <span class="coop-badge badge-${status}">${STATUS_LABELS[status]}</span>
        </div>
        <div class="coop-address">${c.address}</div>
        <div class="coop-meta">
          ${c.units ? `<span>${c.units} logements</span>` : ''}
          ${c.programme ? `<span>${c.programme}</span>` : ''}
          ${c.transport ? `<span>${c.transport}</span>` : ''}
          ${c.logAcc ? `<span>${c.logAcc} acc.</span>` : ''}
          ${c.applicationForm ? '<span class="contact-form">Formulaire en ligne</span>' : canEmailApply ? `<span class="contact-email">@ Candidature par email</span>` : c.postalOnly ? '<span class="contact-postal-only">Courrier postal uniquement</span>' : '<span class="contact-postal">Courrier postal</span>'}
        </div>
        <div class="coop-tags">
          ${c.types.map(t => `<span class="coop-tag ${t === '5½' ? 'tag-5half' : ''}">${t}</span>`).join('')}
          ${c.distribution && c.distribution['5½'] ? `<span class="coop-tag tag-5half">${c.distribution['5½']}x 5½</span>` : ''}
        </div>
        ${c.notes ? `<div class="coop-notes">${c.notes}</div>` : ''}
        ${note ? `<div class="coop-status-note">${note}</div>` : ''}
        <div class="coop-actions">
          ${status === 'en-construction' ? '' : status === 'non-soumise' ? `<button class="btn-sm btn-apply" onclick="event.stopPropagation(); generateLetter('${c.id}')">${canEmailApply ? 'Faire une demande' : 'Générer la lettre'}</button>` : ''}
          ${status === 'lettre-generee' ? `<button class="btn-sm btn-apply" onclick="event.stopPropagation(); openSavedLetter('${c.id}')">Voir la lettre</button>` : ''}
          <button class="btn-sm" onclick="event.stopPropagation(); openCoopDetail('${c.id}')">Détails</button>
          ${c.applicationForm ? `<button class="btn-sm" onclick="event.stopPropagation(); window.open('${c.applicationForm}', '_blank')">Formulaire</button>` : ''}
          ${hasEmail ? `<button class="btn-sm" onclick="event.stopPropagation(); window.open('mailto:${c.email}')">Email</button>` : ''}
          ${hasWebsite ? `<button class="btn-sm" onclick="event.stopPropagation(); window.open('${c.website}', '_blank')">Site web</button>` : ''}
          <button class="btn-sm" onclick="event.stopPropagation(); openStatusModal('${c.id}')">Statut</button>
        </div>
      </div>
    `;
  }).join('');

  updateStats();
  updateMapMarkers();
}

function updateStats() {
  const counts = { 'non-soumise': 0, 'envoyee': 0, 'lettre-generee': 0, 'relancee': 0, 'reponse': 0 };
  cooperatives.forEach(c => {
    const s = getAppStatus(c.id);
    counts[s] = (counts[s] || 0) + 1;
  });

  document.getElementById('stats-bar').innerHTML = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `<span class="stat-item"><span class="stat-dot" style="background:${STATUS_COLORS[k]}"></span>${v} ${STATUS_LABELS[k].toLowerCase()}</span>`)
    .join('');
}

// ---- Map ----

function initMap() {
  map = L.map('map').setView([45.5235, -73.5685], 14);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 19
  }).addTo(map);
  updateMapMarkers();
}

function updateMapMarkers() {
  if (!map) return;
  Object.values(markers).forEach(m => map.removeLayer(m));
  markers = {};

  const filtered = getFilteredCoops();
  filtered.forEach(c => {
    if (!c.lat || !c.lng) return;
    const status = c.future ? 'en-construction' : getAppStatus(c.id);
    const color = STATUS_COLORS[status] || STATUS_COLORS['non-soumise'];

    const icon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.25)"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    const marker = L.marker([c.lat, c.lng], { icon }).addTo(map);
    marker.bindPopup(`
      <div class="popup-name">${c.name}</div>
      <div class="popup-address">${c.address}</div>
      <div class="popup-status"><span class="coop-badge badge-${status}" style="font-size:0.75rem">${STATUS_LABELS[status]}</span></div>
      ${status === 'non-soumise' ? `<button class="popup-btn" onclick="generateLetter('${c.id}')">Faire une demande</button>` : ''}
    `);

    marker.on('click', () => highlightCard(c.id));
    markers[c.id] = marker;
  });
}

function highlightCoop(id) {
  const marker = markers[id];
  if (marker && map) {
    map.setView(marker.getLatLng(), 16, { animate: true });
    marker.openPopup();
  }
}

function highlightCard(id) {
  document.querySelectorAll('.coop-card').forEach(c => c.classList.remove('highlighted'));
  const card = document.querySelector(`.coop-card[data-id="${id}"]`);
  if (card) {
    card.classList.add('highlighted');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ---- Letter Generation ----

async function generateLetter(coopId) {
  currentCoopId = coopId;
  const coop = cooperatives.find(c => c.id === coopId);
  const profile = getProfile();

  const modal = document.getElementById('letter-modal');
  document.getElementById('modal-title').textContent = `Lettre - ${coop.name}`;
  document.getElementById('modal-loading').style.display = 'flex';
  document.getElementById('modal-error').style.display = 'none';
  document.getElementById('letter-editor').style.display = 'none';
  modal.classList.add('open');

  try {
    const res = await fetch('/api/generate-letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, cooperative: coop })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    document.getElementById('letter-editor').value = data.letter;
    document.getElementById('letter-editor').style.display = 'block';
    document.getElementById('modal-loading').style.display = 'none';

    applicationData[coopId] = {
      ...applicationData[coopId],
      status: applicationData[coopId]?.status === 'non-soumise' || !applicationData[coopId] ? 'lettre-generee' : applicationData[coopId].status,
      letter: data.letter,
      letterDate: new Date().toISOString()
    };
    saveApplicationData();
    renderCoops();
  } catch (err) {
    document.getElementById('modal-loading').style.display = 'none';
    document.getElementById('modal-error').style.display = 'block';
    document.getElementById('modal-error').textContent = err.message;
  }
}

function openSavedLetter(coopId) {
  currentCoopId = coopId;
  const coop = cooperatives.find(c => c.id === coopId);
  const letter = getAppLetter(coopId);

  const modal = document.getElementById('letter-modal');
  document.getElementById('modal-title').textContent = `Lettre - ${coop.name}`;
  document.getElementById('modal-loading').style.display = 'none';
  document.getElementById('modal-error').style.display = 'none';
  document.getElementById('letter-editor').style.display = 'block';
  document.getElementById('letter-editor').value = letter;
  modal.classList.add('open');
}

async function regenerateLetter() {
  if (currentCoopId) await generateLetter(currentCoopId);
}

function copyLetter() {
  const editor = document.getElementById('letter-editor');
  navigator.clipboard.writeText(editor.value);
  const btn = document.getElementById('btn-copy');
  btn.textContent = 'Copié !';
  setTimeout(() => btn.textContent = 'Copier', 2000);
}

function downloadPDF() {
  const letter = document.getElementById('letter-editor').value;
  const coop = cooperatives.find(c => c.id === currentCoopId);

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`<!DOCTYPE html><html><head><title>Lettre - ${coop.name}</title>
<style>
  body { font-family: Georgia, serif; font-size: 12pt; line-height: 1.6; max-width: 700px; margin: 40px auto; padding: 0 20px; color: #222; }
  pre { white-space: pre-wrap; word-wrap: break-word; font-family: Georgia, serif; font-size: 12pt; line-height: 1.6; }
  @media print { body { margin: 0; } }
</style></head><body><pre>${letter.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
<script>window.onload = function() { window.print(); }</script></body></html>`);
  printWindow.document.close();
}

async function openInGoogleDocs() {
  const statusRes = await fetch('/api/google?action=status');
  const status = await statusRes.json();

  if (!status.hasCredentials) {
    alert('Fichier credentials.json manquant. Place tes identifiants OAuth Google dans D:\\hlegrand\\coop-plateau\\credentials.json');
    return;
  }

  if (!status.hasToken) {
    window.open('/auth/google', '_blank');
    alert('Autorise l\'accès Google dans la fenêtre qui s\'ouvre, puis clique à nouveau sur Google Docs.');
    return;
  }

  const letter = document.getElementById('letter-editor').value;
  const coop = cooperatives.find(c => c.id === currentCoopId);

  const btn = document.getElementById('btn-gdocs');
  btn.textContent = 'Création...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/google?action=create-doc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Candidature - ${coop.name}`,
        content: letter
      })
    });

    const data = await res.json();
    if (data.error) {
      if (res.status === 401) {
        window.open('/auth/google', '_blank');
        alert('Token expiré. Autorise à nouveau l\'accès Google.');
      } else {
        alert('Erreur: ' + data.error);
      }
      return;
    }

    window.open(data.url, '_blank');

    applicationData[currentCoopId] = {
      ...applicationData[currentCoopId],
      status: 'google-docs',
      letter: document.getElementById('letter-editor').value,
      googleDocUrl: data.url,
      googleDocDate: new Date().toISOString(),
      note: `Google Doc créé le ${new Date().toLocaleDateString('fr-CA')}` + (applicationData[currentCoopId]?.note ? ' | ' + applicationData[currentCoopId].note : '')
    };
    saveApplicationData();
    renderCoops();

    btn.textContent = 'Créé !';
    setTimeout(() => { btn.textContent = 'Google Docs'; }, 3000);
  } catch (err) {
    alert('Erreur: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Google Docs';
  }
}

async function sendLetter() {
  const coop = cooperatives.find(c => c.id === currentCoopId);
  const letter = document.getElementById('letter-editor').value;
  const profile = getProfile();

  if (!coop.email) {
    alert('Cette coopérative n\'a pas d\'adresse email connue. Utilise "Ouvrir dans email" pour envoyer manuellement.');
    return;
  }

  if (!confirm(`Envoyer la lettre à ${coop.name} (${coop.email}) depuis legrand.henri46@gmail.com ?`)) return;

  sendMailto();
}

function sendMailto() {
  const coop = cooperatives.find(c => c.id === currentCoopId);
  const letter = document.getElementById('letter-editor').value;
  const profile = getProfile();
  const email = coop.email || '';
  const subject = encodeURIComponent(`Candidature - ${profile.name} - Logement ${profile.unitType}`);
  const body = encodeURIComponent(letter);

  window.open(`mailto:${email}?subject=${subject}&body=${body}`);

  applicationData[currentCoopId] = {
    ...applicationData[currentCoopId],
    status: 'envoyee',
    letter,
    sentDate: new Date().toISOString(),
    note: `Envoyé le ${new Date().toLocaleDateString('fr-CA')} (via client email)`
  };
  saveApplicationData();
  renderCoops();
}

function closeModal() {
  document.getElementById('letter-modal').classList.remove('open');
}

// ---- Status Modal ----

function openCoopDetail(coopId) {
  const c = cooperatives.find(co => co.id === coopId);
  const status = getAppStatus(coopId);
  const note = getAppNote(coopId);

  const distLines = c.distribution && Object.keys(c.distribution).length
    ? Object.entries(c.distribution).map(([k, v]) => `${v} x ${k}`).join(', ')
    : 'Non détaillée';

  const modal = document.getElementById('detail-modal');
  document.getElementById('detail-modal-title').textContent = c.name;
  document.getElementById('detail-modal-body').innerHTML = `
    <div class="detail-grid">
      <div class="detail-section">
        <h3>Informations générales</h3>
        <div class="detail-row"><span class="detail-label">Adresse</span><span>${c.address}</span></div>
        ${c.postalCode ? `<div class="detail-row"><span class="detail-label">Code postal</span><span>${c.postalCode}</span></div>` : ''}
        ${c.units ? `<div class="detail-row"><span class="detail-label">Nombre de logements</span><span>${c.units}</span></div>` : ''}
        ${c.programme ? `<div class="detail-row"><span class="detail-label">Programme</span><span>${c.programme}</span></div>` : ''}
        ${c.transport ? `<div class="detail-row"><span class="detail-label">Transport</span><span>${c.transport}</span></div>` : ''}
        ${c.logAcc ? `<div class="detail-row"><span class="detail-label">Logements accessibles</span><span>${c.logAcc}</span></div>` : ''}
        ${c.clientele ? `<div class="detail-row"><span class="detail-label">Clientèle</span><span>${c.clientele}</span></div>` : ''}
      </div>
      <div class="detail-section">
        <h3>Distribution des logements</h3>
        <div class="detail-row"><span>${distLines}</span></div>
        ${c.types.length ? `<div class="detail-row"><span class="detail-label">Types disponibles</span><span>${c.types.join(', ')}</span></div>` : ''}
      </div>
      <div class="detail-section">
        <h3>Contact</h3>
        ${c.email ? `<div class="detail-row"><span class="detail-label">Email${c.postalOnly ? ' (contact)' : ' (candidature)'}</span><a href="mailto:${c.email}">${c.email}</a></div>` : '<div class="detail-row"><span class="detail-label">Email</span><span>Non disponible</span></div>'}
        <div class="detail-row"><span class="detail-label">Candidature par</span><span>${c.applicationForm ? 'Formulaire en ligne' : c.email && !c.postalOnly ? 'Email' : 'Courrier postal'}</span></div>
        ${c.applicationForm ? `<div class="detail-row"><span class="detail-label">Formulaire</span><a href="${c.applicationForm}" target="_blank">${c.applicationForm.includes('forms.gle') ? 'Google Form' : 'PDF'}</a></div>` : ''}
        ${c.website ? `<div class="detail-row"><span class="detail-label">Site web</span><a href="${c.website}" target="_blank">${c.website}</a></div>` : ''}
      </div>
      ${c.notes ? `<div class="detail-section"><h3>Remarques</h3><p>${c.notes}</p></div>` : ''}
      <div class="detail-section">
        <h3>Ma candidature</h3>
        <div class="detail-row"><span class="detail-label">Statut</span><span class="coop-badge badge-${status}">${STATUS_LABELS[status]}</span></div>
        ${note ? `<div class="detail-row"><span class="detail-label">Note</span><span>${note}</span></div>` : ''}
      </div>
    </div>
  `;
  modal.classList.add('open');
}

function closeDetailModal() {
  document.getElementById('detail-modal').classList.remove('open');
}

function openStatusModal(coopId) {
  currentStatusCoopId = coopId;
  const coop = cooperatives.find(c => c.id === coopId);
  const status = getAppStatus(coopId);

  document.getElementById('status-modal-title').textContent = coop.name;
  document.getElementById('status-note').value = getAppNote(coopId);

  document.querySelectorAll('.status-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.status === status);
  });

  document.querySelectorAll('.status-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
  });

  document.getElementById('status-modal').classList.add('open');
}

function saveStatus() {
  const status = document.querySelector('.status-btn.active')?.dataset.status || 'non-soumise';
  const note = document.getElementById('status-note').value;

  applicationData[currentStatusCoopId] = {
    ...applicationData[currentStatusCoopId],
    status,
    note
  };
  saveApplicationData();
  renderCoops();
  closeStatusModal();
}

function closeStatusModal() {
  document.getElementById('status-modal').classList.remove('open');
}

// ---- Profile ----

function setupProfileForm() {
  document.getElementById('profile-form').addEventListener('submit', e => {
    e.preventDefault();
    saveProfile();
    const msg = document.getElementById('profile-saved');
    msg.textContent = 'Profil sauvegardé !';
    msg.classList.add('show');
    setTimeout(() => msg.classList.remove('show'), 3000);
  });
}

function getProfile() {
  return {
    name: document.getElementById('prof-name').value,
    phone: document.getElementById('prof-phone').value,
    email: document.getElementById('prof-email').value,
    address: document.getElementById('prof-address').value,
    household: document.getElementById('prof-household').value,
    unitType: document.getElementById('prof-unit').value,
    motivations: document.getElementById('prof-motivations').value,
    experiences: document.getElementById('prof-experiences').value,
  };
}

function saveProfile() {
  localStorage.setItem('coop-profile', JSON.stringify(getProfile()));
}

function loadProfile() {
  const saved = localStorage.getItem('coop-profile');
  if (!saved) return;
  const p = JSON.parse(saved);
  if (p.name) document.getElementById('prof-name').value = p.name;
  if (p.phone) document.getElementById('prof-phone').value = p.phone;
  if (p.email) document.getElementById('prof-email').value = p.email;
  if (p.address) document.getElementById('prof-address').value = p.address;
  if (p.household) document.getElementById('prof-household').value = p.household;
  if (p.unitType) document.getElementById('prof-unit').value = p.unitType;
  if (p.motivations) document.getElementById('prof-motivations').value = p.motivations;
  if (p.experiences) document.getElementById('prof-experiences').value = p.experiences;
}

// ---- Template ----

async function loadTemplate() {
  try {
    const res = await fetch('/api/template?action=get');
    const data = await res.json();
    document.getElementById('template-editor').value = data.template;
  } catch (err) {
    console.log('Template: pas disponible');
  }
}

async function saveTemplate() {
  const template = document.getElementById('template-editor').value;
  try {
    await fetch('/api/template?action=save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template })
    });
    const msg = document.getElementById('template-saved');
    msg.textContent = 'Template sauvegardé !';
    msg.classList.add('show');
    setTimeout(() => msg.classList.remove('show'), 3000);
  } catch (err) {
    alert('Erreur: ' + err.message);
  }
}

async function regenerateTemplate() {
  const userPrompt = document.getElementById('template-prompt').value.trim();
  if (!userPrompt) { alert('Écris une instruction de modification.'); return; }

  const currentTemplate = document.getElementById('template-editor').value;
  const btn = document.querySelector('.template-prompt-bar .btn-secondary');
  btn.textContent = 'Modification en cours...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/template?action=regenerate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: userPrompt, currentTemplate })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    document.getElementById('template-editor').value = data.template;
    document.getElementById('template-prompt').value = '';
  } catch (err) {
    alert('Erreur: ' + err.message);
  } finally {
    btn.textContent = 'Modifier par IA';
    btn.disabled = false;
  }
}

// ---- News ----

async function loadNews() {
  try {
    const res = await fetch('/api/news');
    const data = await res.json();
    renderNews(data);
  } catch (err) {
    console.log('News: pas disponible');
  }
}

function renderNews(data) {
  const list = document.getElementById('news-list');
  const timestamp = document.getElementById('news-last-update');

  if (data.lastUpdated) {
    timestamp.textContent = `Dernière mise à jour : ${new Date(data.lastUpdated).toLocaleString('fr-CA')}`;
  }

  if (!data.articles || data.articles.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted)">Aucune actualité. Clique sur "Actualiser" pour lancer une recherche.</p>';
    return;
  }

  list.innerHTML = data.articles.map(a => `
    <div class="news-card">
      <div class="news-card-title"><a href="${a.url}" target="_blank">${a.title}</a></div>
      <div class="news-card-meta">
        <span class="news-card-source">${a.source}</span>
      </div>
      ${a.description ? `<div class="news-card-desc">${a.description}</div>` : ''}
    </div>
  `).join('');
}

async function refreshNews() {
  const btn = document.getElementById('btn-refresh-news');
  btn.textContent = 'Recherche en cours...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/news', { method: 'POST' });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    renderNews(data);
  } catch (err) {
    alert('Erreur actualisation: ' + err.message);
  } finally {
    btn.textContent = 'Actualiser';
    btn.disabled = false;
  }
}

// ---- Step Checks ----

function loadStepChecks() {
  const saved = localStorage.getItem('coop-steps');
  const checks = saved ? JSON.parse(saved) : {};
  document.querySelectorAll('[data-check]').forEach(cb => {
    cb.checked = !!checks[cb.dataset.check];
    cb.addEventListener('change', () => {
      checks[cb.dataset.check] = cb.checked;
      localStorage.setItem('coop-steps', JSON.stringify(checks));
    });
  });
}
