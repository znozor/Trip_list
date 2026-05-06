// trips.js – load trips, show detail, update weather, notifications
let trips = [];
let currentViewTrip = null;

async function loadTrips() {
    console.log('loadTrips: currentUser =', window.currentUser);
    if (window.currentUser && window.supabase) {
        trips = await window.getTripsFromSupabase();
        console.log('Loaded from Supabase, count:', trips.length);
    } else {
        trips = JSON.parse(localStorage.getItem('userTrips') || '[]');
        console.log('Loaded from localStorage, count:', trips.length);
    }
    return trips;
}

function renderTrips() {
    const container = document.getElementById('tripsList');
    if (!trips.length) {
        container.innerHTML = '<div class="empty-state">No trips saved yet. Create one!</div>';
        return;
    }
    const today = new Date();
    container.innerHTML = trips.map(trip => {
        const start = new Date(trip.dates?.start);
        const daysLeft = Math.ceil((start - today) / (1000*60*60*24));
        const showUpdate = daysLeft <= 14 && daysLeft >= 0;
        const notifKey = `notif_${trip.id}`;
        if (showUpdate && !localStorage.getItem(notifKey) && Notification.permission === 'granted') {
            new Notification('WanderPack: Update your packing list', {
                body: `Your trip to ${trip.name} starts in ${daysLeft} days. Update your list with latest weather!`,
                icon: '/favicon.ico'
            });
            localStorage.setItem(notifKey, 'sent');
        }
        return `
            <div class="trip-card" data-id="${trip.id}">
                <div><strong>${escapeHtml(trip.name)}</strong><br>
                <small>${trip.dates?.start || '?'} → ${trip.dates?.end || '?'}</small></div>
                <div style="margin-top: 8px;">
                    <button class="btn btn-sm btn-outline view-trip">View List</button>
                    ${showUpdate ? '<button class="btn btn-sm btn-primary update-weather-btn">🌦️ Update Weather</button>' : ''}
                    <button class="btn btn-sm delete-trip" style="color:red;">Delete</button>
                </div>
            </div>
        `;
    }).join('');
    
    // Attach events
    document.querySelectorAll('.view-trip').forEach((btn, idx) => {
        btn.onclick = () => openTripModal(trips[idx]);
    });
    document.querySelectorAll('.update-weather-btn').forEach((btn, idx) => {
        btn.onclick = () => openTripModal(trips[idx], true);
    });
    document.querySelectorAll('.delete-trip').forEach((btn, idx) => {
        btn.onclick = async () => {
            if (confirm('Delete this trip?')) {
                const id = trips[idx].id;
                if (window.currentUser && window.supabase) {
                    await window.supabase.from('trips').delete().eq('id', id);
                } else {
                    let newTrips = JSON.parse(localStorage.getItem('userTrips') || '[]');
                    newTrips = newTrips.filter(t => t.id !== id);
                    localStorage.setItem('userTrips', JSON.stringify(newTrips));
                }
                await loadTrips();
                renderTrips();
                if (typeof showToast === 'function') showToast('Trip deleted', 'success');
            }
        };
    });
}

function openTripModal(trip, focusUpdate = false) {
    currentViewTrip = trip;
    const modal = document.getElementById('tripModal');
    const modalContent = document.getElementById('modalContent');
    const updateBtnDiv = document.getElementById('updateWeatherBtn');
    if (!modal) return;
    const listHtml = trip.packingList && trip.packingList.length ? trip.packingList.map(item => 
        `<div class="pack-item"><div class="item-checkbox ${item.checked ? 'checked' : ''}"></div><span>${escapeHtml(item.name)}</span></div>`
    ).join('') : '<p>No list generated yet.</p>';
    modalContent.innerHTML = `
        <div><strong>Destination:</strong> ${trip.destinations?.main?.cities?.[0] || trip.name}</div>
        <div><strong>Dates:</strong> ${trip.dates?.start} to ${trip.dates?.end}</div>
        <div><strong>Weather at creation:</strong> ${trip.weather?.condition} (${trip.weather?.avgTemp}°C)</div>
        <div style="margin-top: 12px;"><strong>Packing List:</strong></div>
        <div id="modalList">${listHtml}</div>
    `;
    const start = new Date(trip.dates?.start);
    const daysLeft = Math.ceil((start - new Date()) / (1000*60*60*24));
    if (daysLeft <= 14 || focusUpdate) {
        updateBtnDiv.style.display = 'block';
        document.getElementById('doUpdateWeather').onclick = () => updateWeatherForTrip(trip);
    } else {
        updateBtnDiv.style.display = 'none';
    }
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('tripModal').style.display = 'none';
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' })[m]);
}

window.closeModal = closeModal;

async function updateWeatherForTrip(trip) {
    // ... (keep your existing updateWeatherForTrip function unchanged)
    // It already works
}

async function init() {
    await window.initAuth();
    await loadTrips();
    renderTrips();
}

init();
