// trips.js – loads trips from Supabase if logged in, otherwise from localStorage
let trips = [];

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
            console.log('Loaded trips from Supabase:', trips.length);
        } catch (err) {
            console.error('Supabase error:', err);
            window.showToast('Failed to load trips from cloud', 'danger');
            trips = [];
        }
    } else {
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
        <div class="trip-card" data-id="${escapeHtml(String(trip.id))}">
            <div><strong>${escapeHtml(trip.name)}</strong><br>
            <small>${trip.dates?.start || '?'} → ${trip.dates?.end || '?'}</small></div>
            <button class="btn btn-sm btn-outline view-trip" style="margin-top: 8px;">View List</button>
        </div>
    `).join('');

    document.querySelectorAll('.view-trip').forEach((btn, idx) => {
        btn.onclick = () => {
            const trip = trips[idx];
            sessionStorage.setItem('viewTrip', JSON.stringify(trip));
            window.location.href = 'list.html?view=trip';
        };
    });
}

async function init() {
    // Wait for sb to be ready
    let attempts = 0;
    while (!window.sb && attempts < 30) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
    }

    // Get session directly — don't rely on window.currentUser timing
    if (window.sb) {
        const { data: { session } } = await window.sb.auth.getSession();
        window.currentUser = session?.user || null;
        console.log('trips.js session:', window.currentUser?.email || 'guest');
    }

    await loadTrips();
    renderTrips();
}

init();
