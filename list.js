// list.js – displays list only when generated or opened from trips
let currentList = [];
let currentTrip = null;

function renderPackingList() {
    const container = document.getElementById('packingListBody');
    const badge = document.getElementById('tripBadge');
    const progressSpan = document.getElementById('listProgress');
    
    if (!currentList || currentList.length === 0) {
        container.innerHTML = '<div class="card"><p>No packing list. Please plan a trip first.</p></div>';
        badge.innerHTML = '';
        progressSpan.innerHTML = '';
        return;
    }
    
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
                    <a href="#" class="item-buy" onclick="event.preventDefault();alert('Affiliate link demo')">Buy →</a>
                </div>
            `;
        });
        html += `</div>`;
    }
    container.innerHTML = html;
    
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
    return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' })[m]);
}

function addCustomItem() {
    const name = prompt('Enter custom item name:');
    if (!name) return;
    const category = prompt('Category (e.g., Accessories):') || 'Other';
    currentList.push({ name, category, checked: false });
    renderPackingList();
    alert(`"${name}" added!`);
}

async function saveTrip() {
    if (!currentTrip) {
        alert('No trip data to save. Please generate a list first.');
        return;
    }
    if (!currentTrip.id) currentTrip.id = Date.now();
    currentTrip.packingList = currentList;
    currentTrip.savedAt = new Date().toISOString();

    // Save to localStorage (guest mode)
    let savedTrips = JSON.parse(localStorage.getItem('userTrips') || '[]');
    const existingIndex = savedTrips.findIndex(t => t.id === currentTrip.id);
    if (existingIndex !== -1) savedTrips[existingIndex] = currentTrip;
    else savedTrips.unshift(currentTrip);
    localStorage.setItem('userTrips', JSON.stringify(savedTrips));
    
    // Clear current list and trip so page becomes empty
    currentTrip = null;
    currentList = [];
    renderPackingList();
    
    alert('✅ Trip saved! Redirecting to Trips page.');
    window.location.href = 'trips.html';
}

function loadData() {
    // Only load from sessionStorage if coming from plan.html or trips.html
    const pending = sessionStorage.getItem('pendingTrip');
    const viewed = sessionStorage.getItem('viewTrip');
    if (pending) {
        currentTrip = JSON.parse(pending);
        currentList = currentTrip.packingList || [];
        sessionStorage.removeItem('pendingTrip');
    } else if (viewed) {
        currentTrip = JSON.parse(viewed);
        currentList = currentTrip.packingList || [];
        sessionStorage.removeItem('viewTrip');
    } else {
        currentTrip = null;
        currentList = [];
    }
    renderPackingList();
}

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    const addBtn = document.getElementById('addCustomItemBtn');
    const saveBtn = document.getElementById('saveTripBtn');
    if (addBtn) addBtn.addEventListener('click', addCustomItem);
    if (saveBtn) saveBtn.addEventListener('click', saveTrip);
});
