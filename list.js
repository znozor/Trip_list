// list.js – displays packing list, saves to localStorage (guest) or Supabase (logged-in)
let currentList = [];
let currentTrip = null;

function renderPackingList() {
    const container = document.getElementById('packingListBody');
    const badge = document.getElementById('tripBadge');
    const progressSpan = document.getElementById('listProgress');
    
    if (!currentList || currentList.length === 0) {
        container.innerHTML = '<div class="card"><p>No packing list found. Please plan a trip first.</p></div>';
        badge.innerHTML = '';
        progressSpan.innerHTML = '';
        return;
    }
    
    // Group by category
    const grouped = {};
    currentList.forEach(item => {
        if (!grouped[item.category]) grouped[item.category] = [];
        grouped[item.category].push(item);
    });
    
    let html = '';
    let total = 0, checked = 0;
    for (const [category, items] of Object.entries(grouped)) {
        total += items.length;
        checked += items.filter(i => i.checked).length;
        html += `<div class="card"><h3>${escapeHtml(category)}</h3>`;
        items.forEach((item, idx) => {
            html += `
                <div class="pack-item">
                    <div class="item-checkbox ${item.checked ? 'checked' : ''}" data-cat="${escapeHtml(category)}" data-idx="${idx}"></div>
                    <span class="item-name">${escapeHtml(item.name)}</span>
                    <a href="#" class="item-buy" onclick="event.preventDefault();showToast('Affiliate link (demo)')">Buy →</a>
                </div>
            `;
        });
        html += `</div>`;
    }
    container.innerHTML = html;
    
    // Attach checkbox toggle events
    document.querySelectorAll('.item-checkbox').forEach(cb => {
        cb.addEventListener('click', (e) => {
            const cat = cb.dataset.cat;
            const idx = parseInt(cb.dataset.idx);
            const categoryItems = currentList.filter(i => i.category === cat);
            if (categoryItems[idx]) {
                categoryItems[idx].checked = !categoryItems[idx].checked;
                cb.classList.toggle('checked');
                updateProgress();
            }
        });
    });
    
    // Trip badge
    if (currentTrip && currentTrip.name) {
        badge.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${escapeHtml(currentTrip.name)} · ${currentTrip.dates?.start || ''} to ${currentTrip.dates?.end || ''}`;
    } else {
        badge.innerHTML = 'Trip details not available';
    }
    updateProgress();
    
    function updateProgress() {
        const total = currentList.length;
        const checked = currentList.filter(i => i.checked).length;
        progressSpan.innerHTML = `${checked}/${total} items packed`;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function addCustomItem() {
    const name = prompt('Enter custom item name:');
    if (!name) return;
    const category = prompt('Enter category (e.g., Accessories, Electronics):') || 'Other';
    currentList.push({ name, category, checked: false });
    renderPackingList();
    if (typeof showToast === 'function') showToast(`"${name}" added to your list`, 'success');
    else alert('Item added');
}

async function saveTrip() {
    console.log('saveTrip called, currentUser:', window.currentUser);
    if (!currentTrip) {
        const msg = 'No trip data to save. Please generate a list first.';
        if (typeof showToast === 'function') showToast(msg, 'warning');
        else alert(msg);
        return;
    }
    if (!currentTrip.id) currentTrip.id = Date.now();
    currentTrip.packingList = currentList;
    currentTrip.savedAt = new Date().toISOString();

    const isLoggedIn = window.currentUser && window.supabase;
    console.log('isLoggedIn:', isLoggedIn);

    if (isLoggedIn) {
        const tripData = {
            title: currentTrip.name,
            start_date: currentTrip.dates?.start,
            end_date: currentTrip.dates?.end,
            travel_reason: currentTrip.preferences?.reason,
            travel_style: currentTrip.preferences?.style,
            travelers_count: currentTrip.preferences?.travelersCount || 1,
            luggage_type: currentTrip.preferences?.luggage,
            packing_list_json: currentList,
            preferences_json: currentTrip.preferences,
            weather_json: currentTrip.weather
        };
        try {
            const { data, error } = await window.supabase
                .from('trips')
                .upsert({ ...tripData, user_id: window.currentUser.id, id: currentTrip.id })
                .select();
            if (error) throw error;
            console.log('Saved to Supabase', data);
            if (typeof showToast === 'function') showToast('Trip saved to cloud!', 'success');
        } catch (err) {
            console.error('Supabase error:', err);
            if (typeof showToast === 'function') showToast('Failed to save to cloud: ' + err.message, 'danger');
        }
    } else {
        // Guest mode – unchanged
        let savedTrips = JSON.parse(localStorage.getItem('userTrips') || '[]');
        const existingIndex = savedTrips.findIndex(t => t.id === currentTrip.id);
        if (existingIndex !== -1) savedTrips[existingIndex] = currentTrip;
        else savedTrips.unshift(currentTrip);
        localStorage.setItem('userTrips', JSON.stringify(savedTrips));
        localStorage.setItem('currentTripMetadata', JSON.stringify(currentTrip));
        localStorage.setItem('currentPackingList', JSON.stringify(currentList));
        console.log('Saved to localStorage');
        if (typeof showToast === 'function') showToast('Trip saved locally (guest)', 'success');
    }
}

function loadData() {
    const storedList = localStorage.getItem('currentPackingList');
    const storedTrip = localStorage.getItem('currentTripMetadata');
    console.log('loadData: list', !!storedList, 'trip', !!storedTrip);
    if (storedList) {
        try { currentList = JSON.parse(storedList); } catch(e) { console.error(e); }
    }
    if (storedTrip) {
        try { currentTrip = JSON.parse(storedTrip); } catch(e) { console.error(e); }
    }
    if (currentTrip && currentTrip.packingList && currentList.length === 0) {
        currentList = currentTrip.packingList;
    }
    renderPackingList();
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready, initializing list page');
    loadData();
    const addBtn = document.getElementById('addCustomItemBtn');
    const saveBtn = document.getElementById('saveTripBtn');
    if (addBtn) addBtn.addEventListener('click', addCustomItem);
    if (saveBtn) {
        saveBtn.addEventListener('click', saveTrip);
        console.log('Save button listener attached');
    } else {
        console.error('Save button not found – check ID in HTML');
    }
    if (typeof showToast === 'undefined') console.warn('showToast not defined – shared.js may not be loaded');
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
});
