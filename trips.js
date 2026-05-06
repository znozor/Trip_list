// trips.js – simplified, shows saved trips
let trips = [];

function loadTrips() {
    // Always load from localStorage (guest mode) – we'll add Supabase later
    const stored = localStorage.getItem('userTrips');
    if (stored) {
        trips = JSON.parse(stored);
        console.log('Loaded trips:', trips.length);
    } else {
        trips = [];
    }
    return trips;
}

function renderTrips() {
    const container = document.getElementById('tripsList');
    if (!trips.length) {
        container.innerHTML = '<div class="empty-state">No trips saved yet. Create one!</div>';
        return;
    }
    container.innerHTML = trips.map(trip => `
        <div class="trip-card" data-id="${trip.id}">
            <div><strong>${escapeHtml(trip.name)}</strong><br>
            <small>${trip.dates?.start || '?'} → ${trip.dates?.end || '?'}</small></div>
            <button class="btn btn-sm btn-outline view-trip" style="margin-top: 8px;">View List</button>
        </div>
    `).join('');
    
    // Attach view event
    document.querySelectorAll('.view-trip').forEach((btn, idx) => {
        btn.onclick = () => {
            const trip = trips[idx];
            // Save the selected trip to sessionStorage so list.html can load it
            sessionStorage.setItem('viewTrip', JSON.stringify(trip));
            window.location.href = 'list.html?view=trip';
        };
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' })[m]);
}

async function init() {
    loadTrips();
    renderTrips();
}

init();
