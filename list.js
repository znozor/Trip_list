// list.js – simplified, with visible alerts for phone debugging
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
                    <a href="#" class="item-buy" onclick="event.preventDefault();alert('Affiliate link demo')">Buy →</a>
                </div>
            `;
        });
        html += `</div>`;
    }
    container.innerHTML = html;
    
    // Attach checkbox events
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

function saveTrip() {
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
    
    // Also keep current trip metadata for editing
    localStorage.setItem('currentTripMetadata', JSON.stringify(currentTrip));
    localStorage.setItem('currentPackingList', JSON.stringify(currentList));
    
    alert('✅ Trip saved! Go to "Trips" to see it.');
    console.log('Saved trips count:', savedTrips.length);
}

function loadData() {
    const storedList = localStorage.getItem('currentPackingList');
    const storedTrip = localStorage.getItem('currentTripMetadata');
    if (storedList) currentList = JSON.parse(storedList);
    if (storedTrip) currentTrip = JSON.parse(storedTrip);
    if (currentTrip && currentTrip.packingList && !currentList.length) {
        currentList = currentTrip.packingList;
    }
    renderPackingList();
}

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    document.getElementById('addCustomItemBtn')?.addEventListener('click', addCustomItem);
    document.getElementById('saveTripBtn')?.addEventListener('click', saveTrip);
});
