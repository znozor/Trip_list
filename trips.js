// trips.js – loads trips from Supabase if logged in, otherwise from localStorage
let trips = [];

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' })[m]);
}

// Convert a Supabase row to the same object structure used by guest mode
function rowToTrip(row) {
    return {
        id: row.id,
        name: row.title,
        dates: { start: row.start_date, end: row.end_date },
        destinations: row.preferences_json?.destinations || { main: { country: '', cities: [] } },
        preferences: row.preferences_json || {},
        weather: row.weather_json || {},
        packingList: row.packing_list_json || [],
        createdAt: row.created_at,
        savedAt: row.updated_at
    };
}

async function loadTrips() {
    // If logged in and Supabase client is ready, fetch from cloud
    if (window.currentUser && window.sb) {
        try {
            const { data, error } = await window.sb
                .from('trips')
                .select('*')
                .eq('user_id', window.currentUser.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            trips = data.map(rowToTrip);
            console.log('Loaded trips from Supabase:', trips.length);
        } catch (err) {
            console.error('Supabase error:', err);
            window.showToast('Failed to load trips from cloud', 'danger');
            trips = [];
        }
    } else {
        // Guest mode: load from localStorage
        const stored = localStorage.getItem('userTrips');
        trips = stored ? JSON.parse(stored) : [];
        console.log('Loaded trips from localStorage:', trips.length);
    }
    return trips;
}

function renderTrips() {
    const container = document.getElementById('tripsList');
    if (!container) return;
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

    // Attach view events
    document.querySelectorAll('.view-trip').forEach((btn, idx) => {
        btn.onclick = () => {
            const trip = trips[idx];
            sessionStorage.setItem('viewTrip', JSON.stringify(trip));
            window.location.href = 'list.html?view=trip';
        };
    });
}

// Wait for session to be ready (currentUser may not be set immediately when script loads)
async function init() {
    // Poll until window.currentUser is defined (shared.js sets it)
    let attempts = 0;
    while (window.currentUser === undefined && attempts < 30) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
    }
    await loadTrips();
    renderTrips();
}

init();
