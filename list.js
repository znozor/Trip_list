// list.js – displays packing list, allows editing, saving
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
    showToast(`"${name}" added to your list`, 'success');
}

async function saveTrip() {
    console.log('saveTrip called', currentTrip);
    if (!currentTrip) {
        showToast('No trip data to save', 'warning');
        return;
    }
    // Ensure trip has an id
    if (!currentTrip.id) currentTrip.id = Date.now();
    // Update packing list
    currentTrip.packingList = currentList;
    currentTrip.savedAt = new Date().toISOString();
    
    // Guest mode: save to localStorage
    let savedTrips = JSON.parse(localStorage.getItem('userTrips') || '[]');
    const existingIndex = savedTrips.findIndex(t => t.id === currentTrip.id);
    if (existingIndex !== -1) {
        savedTrips[existingIndex] = currentTrip;
        console.log('Updating existing trip', currentTrip.id);
    } else {
        savedTrips.unshift(currentTrip);
        console.log('Adding new trip', currentTrip.id);
    }
    localStorage.setItem('userTrips', JSON.stringify(savedTrips));
    
    // Also update the currentTripMetadata in localStorage for consistency
    localStorage.setItem('currentTripMetadata', JSON.stringify(currentTrip));
    localStorage.setItem('currentPackingList', JSON.stringify(currentList));
    
    showToast('Trip saved successfully!', 'success');
}

// Load data from localStorage (set by plan.js or saved trip view)
function loadData() {
    const storedList = localStorage.getItem('currentPackingList');
    const storedTrip = localStorage.getItem('currentTripMetadata');
    console.log('Loading data', { storedList, storedTrip });
    if (storedList) {
        try {
            currentList = JSON.parse(storedList);
        } catch(e) { console.error(e); }
    }
    if (storedTrip) {
        try {
            currentTrip = JSON.parse(storedTrip);
        } catch(e) { console.error(e); }
    }
    // If trip has a packing list but currentList is empty, use it
    if (currentTrip && currentTrip.packingList && currentList.length === 0) {
        currentList = currentTrip.packingList;
    }
    renderPackingList();
}

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    const addBtn = document.getElementById('addCustomItemBtn');
    const saveBtn = document.getElementById('saveTripBtn');
    if (addBtn) addBtn.addEventListener('click', addCustomItem);
    if (saveBtn) {
        saveBtn.addEventListener('click', saveTrip);
        console.log('Save button listener attached');
    } else {
        console.error('Save button not found in DOM');
    }
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
});
