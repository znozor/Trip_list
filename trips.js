// trips.js – improved UI, delete feature, Supabase + localStorage support
let trips = [];
let tripToDelete = null;

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' })[m]);
}

function rowToTrip(row) {
  return {
    id: row.id,
    name: row.title,
    dates: { start: row.start_date, end: row.end_date },
    destinations: row.preferences_json?.destinations || { main: { country: '', cities: [] } },
    preferences: row.preferences_json || {},
    weather: row.weather_json || {},
    packingList: [],
    createdAt: row.created_at,
    savedAt: row.updated_at
  };
}

// ── Load ───────────────────────────────────────────────────────────────────
async function loadTrips() {
  if (window.currentUser && window.sb) {
    try {
      const { data, error } = await window.sb
        .from('trips')
        .select(`
          *,
          trip_packing_items (
            id, status,
            packing_items ( name, category )
          )
        `)
        .eq('user_id', window.currentUser.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      trips = data.map(row => ({
        ...rowToTrip(row),
        packingList: (row.trip_packing_items || []).map(tpi => ({
          name: tpi.packing_items?.name || '',
          category: tpi.packing_items?.category || '',
          checked: tpi.status === 'packed'
        }))
      }));
      console.log('Loaded from Supabase:', trips.length);
    } catch (err) {
      console.error('Supabase error:', err);
      if (window.showToast) window.showToast('Failed to load trips from cloud', 'danger');
      trips = [];
    }
  } else {
    const stored = localStorage.getItem('userTrips');
    trips = stored ? JSON.parse(stored) : [];
    console.log('Loaded from localStorage:', trips.length);
  }
}

// ── Render ─────────────────────────────────────────────────────────────────
function renderTrips() {
  const container = document.getElementById('tripsList');
  const skeleton  = document.getElementById('skeletonLoader');
  const countEl   = document.getElementById('tripsCount');

  if (skeleton) skeleton.style.display = 'none';
  if (container) container.style.display = 'flex';

  if (countEl) {
    countEl.textContent = trips.length
      ? `${trips.length} trip${trips.length > 1 ? 's' : ''} saved`
      : 'No trips yet';
  }

  if (!trips.length) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-suitcase-rolling"></i>
        <h3>No trips saved yet</h3>
        <p>Plan your first trip and save your packing list to see it here.</p>
        <button class="btn btn-primary" onclick="window.location.href='plan.html'">
          <i class="fa-solid fa-plus"></i> Plan a Trip
        </button>
      </div>`;
    return;
  }

  container.innerHTML = trips.map((trip, idx) => {
    const totalItems  = trip.packingList?.length || 0;
    const packedItems = trip.packingList?.filter(i => i.checked).length || 0;
    const progressPct = totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0;
    const country     = trip.destinations?.main?.country || '';
    const cities      = trip.destinations?.main?.cities || [];
    const weatherCond = trip.weather?.condition || '';
    const style       = trip.preferences?.style || trip.preferences?.travel_style || '';
    const startDate   = trip.dates?.start || '';
    const endDate     = trip.dates?.end   || '';

    const fmt = d => d ? new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '?';

    return `
      <div class="trip-card" data-idx="${idx}">
        <div class="trip-card-top">
          <div class="trip-card-info">
            <div class="trip-name">${escapeHtml(trip.name || 'Unnamed Trip')}</div>
            <div class="trip-dates">
              <i class="fa-solid fa-calendar"></i>
              ${fmt(startDate)} → ${fmt(endDate)}
            </div>
          </div>
        </div>

        <div class="trip-meta">
          ${country ? `<span class="trip-badge"><i class="fa-solid fa-location-dot"></i>${escapeHtml(country)}</span>` : ''}
          ${cities.length > 1 ? `<span class="trip-badge"><i class="fa-solid fa-city"></i>${cities.length} cities</span>` : ''}
          ${weatherCond ? `<span class="trip-badge weather"><i class="fa-solid fa-cloud-sun"></i>${escapeHtml(weatherCond)}</span>` : ''}
          ${style ? `<span class="trip-badge"><i class="fa-solid fa-star"></i>${escapeHtml(style)}</span>` : ''}
          ${totalItems > 0 ? `<span class="trip-badge items"><i class="fa-solid fa-list-check"></i>${totalItems} items</span>` : ''}
        </div>

        ${totalItems > 0 ? `
        <div class="trip-progress">
          <div class="progress-label">
            <span>Packed</span>
            <span>${packedItems}/${totalItems} · ${progressPct}%</span>
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" style="width:${progressPct}%"></div>
          </div>
        </div>` : ''}

        <div class="trip-card-actions">
          <button class="btn-view view-trip" data-idx="${idx}">
            <i class="fa-solid fa-eye"></i> View List
          </button>
          <button class="btn-delete delete-trip" data-idx="${idx}">
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        </div>
      </div>`;
  }).join('');

  // View button
  document.querySelectorAll('.view-trip').forEach(btn => {
    btn.addEventListener('click', () => {
      const trip = trips[parseInt(btn.dataset.idx)];
      sessionStorage.setItem('viewTrip', JSON.stringify(trip));
      window.location.href = 'list.html?view=trip';
    });
  });

  // Delete button — only set the trip reference and update the label span
  document.querySelectorAll('.delete-trip').forEach(btn => {
    btn.addEventListener('click', () => {
      tripToDelete = trips[parseInt(btn.dataset.idx)];

      const nameEl = document.getElementById('deleteModalText');
      if (nameEl) {
        let shortName = tripToDelete.name || 'This trip';
        if (shortName.length > 35) shortName = shortName.substring(0, 32) + '...';
        nameEl.textContent = `"${shortName}" will be permanently removed.`;
      }

      // Reset label and enabled state — never touch button.innerHTML or button.style
      setDeleteBtnState('idle');
      document.getElementById('deleteOverlay').style.display = 'flex';
    });
  });
}

// ── Delete button state ────────────────────────────────────────────────────
// Only the <span> label and disabled flag change — the button element is untouched.
function setDeleteBtnState(state) {
  const btn   = document.getElementById('confirmDeleteBtn');
  const label = document.getElementById('confirmDeleteLabel');
  if (!btn || !label) return;

  if (state === 'loading') {
    label.textContent = 'Deleting…';
    btn.disabled = true;
  } else {
    // 'idle' or reset
    label.textContent = 'Delete';
    btn.disabled = false;
  }
  btn.blur();
}

// ── Delete modal ───────────────────────────────────────────────────────────
window.closeDeleteModal = function () {
  document.getElementById('deleteOverlay').style.display = 'none';
  tripToDelete = null;
  setDeleteBtnState('idle');
};

// Called via onclick="confirmDelete()" on the button in HTML
window.confirmDelete = async function () {
  if (!tripToDelete) return;

  setDeleteBtnState('loading');

  if (window.currentUser && window.sb) {
    const { error } = await window.sb
      .from('trips')
      .delete()
      .eq('id', tripToDelete.id)
      .eq('user_id', window.currentUser.id);

    if (error) {
      if (window.showToast) window.showToast('Failed to delete trip', 'danger');
      setDeleteBtnState('idle'); // let user try again
      return;
    }
  } else {
    let saved = JSON.parse(localStorage.getItem('userTrips') || '[]');
    saved = saved.filter(t => t.id !== tripToDelete.id);
    localStorage.setItem('userTrips', JSON.stringify(saved));
  }

  trips = trips.filter(t => t.id !== tripToDelete.id);
  setDeleteBtnState('idle');
  closeDeleteModal();
  renderTrips();

  if (window.showToast) window.showToast('Trip deleted', 'success');
};

// Close modal on overlay click
document.getElementById('deleteOverlay')?.addEventListener('click', function (e) {
  if (e.target === this) closeDeleteModal();
});

// ── Init ───────────────────────────────────────────────────────────────────
async function init() {
  let attempts = 0;
  while (!window.sb && attempts < 30) {
    await new Promise(r => setTimeout(r, 100));
    attempts++;
  }
  if (window.sb) {
    const { data: { session } } = await window.sb.auth.getSession();
    window.currentUser = session?.user || null;
    console.log('trips.js session:', window.currentUser?.email || 'guest');
  }
  await loadTrips();
  renderTrips();
}

init();
