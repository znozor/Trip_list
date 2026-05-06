// list.js – displays list with reasons, essential badges, weather confidence, and back button
let currentList = [];
let currentTrip = null;
let cameFromTrips = false;

function renderPackingList() {
    const container = document.getElementById('packingListBody');
    const badge = document.getElementById('tripBadge');
    const progressSpan = document.getElementById('listProgress');
    const confidenceDiv = document.getElementById('weatherConfidence');
    const backBtn = document.getElementById('backButton');
    
    // Show/hide back button based on whether we came from trips
    if (backBtn) {
        backBtn.style.display = cameFromTrips ? 'inline-flex' : 'none';
        if (cameFromTrips) {
            backBtn.onclick = () => { window.location.href = 'trips.html'; };
        }
    }
    
    if (!currentList || currentList.length === 0) {
        container.innerHTML = '<div class="card"><p>No packing list. Please plan a trip first.</p></div>';
        if (badge) badge.innerHTML = '';
        if (progressSpan) progressSpan.innerHTML = '';
        if (confidenceDiv) confidenceDiv.innerHTML = '';
        return;
    }
    
    // Show weather confidence
    if (confidenceDiv && currentTrip?.weather?.forecastType) {
        const isReal = currentTrip.weather.forecastType === 'real';
        confidenceDiv.innerHTML = `
            <div class="confidence-card">
                <i class="fa-solid ${isReal ? 'fa-cloud-sun' : 'fa-chart-line'}"></i>
                ${isReal 
                    ${isReal 
    ? '✅ Real‑time forecast – High confidence' 
    : '📊 Climate averages – Moderate confidence'}
            </div>
        `;
    } else if (confidenceDiv) {
        confidenceDiv.innerHTML = '';
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
            const checkedClass = item.checked ? 'checked' : '';
            const textDecor = item.checked ? 'checked-text' : '';
            html += `
                <div class="pack-item" data-cat="${escapeHtml(category)}" data-idx="${idx}">
                    <div class="item-checkbox ${checkedClass}" data-cat="${escapeHtml(category)}" data-idx="${idx}"></div>
                    <div class="item-details">
                        <span class="item-name ${textDecor}">${escapeHtml(item.name)}</span>
                        ${item.reason ? `<span class="item-reason">${escapeHtml(item.reason)}</span>` : ''}
                        ${item.essential !== undefined 
                            ? `<span class="${item.essential ? 'essential-badge' : 'optional-badge'}">${item.essential ? 'Essential' : 'Optional'}</span>`
                            : ''}
                    </div>
                    <a href="#" class="item-buy" onclick="event.preventDefault();alert('Affiliate link demo')">Buy →</a>
                </div>
            `;
        });
        html += `</div>`;
    }
    container.innerHTML = html;
    
    // Attach checkbox events with strike‑through animation
    document.querySelectorAll('.item-checkbox').forEach(cb => {
        cb.addEventListener('click', (e) => {
            const cat = cb.dataset.cat;
            const idx = parseInt(cb.dataset.idx);
            const categoryItems = currentList.filter(i => i.category === cat);
            if (categoryItems[idx]) {
                categoryItems[idx].checked = !categoryItems[idx].checked;
                cb.classList.toggle('checked');
                // Toggle the name span's class for line‑through
                const nameSpan = cb.closest('.pack-item').querySelector('.item-name');
                if (nameSpan) nameSpan.classList.toggle('checked-text');
                updateProgress();
            }
        });
    });
    
    if (currentTrip && currentTrip.name) {
        const country = currentTrip.destinations?.main?.country || '';
const cities = currentTrip.destinations?.main?.cities || [];
const cityNames = cities.join(', ');
badge.innerHTML = `
    <div><strong>${escapeHtml(country)}</strong></div>
    <div style="font-size: 13px; margin-top: 4px;">${escapeHtml(cityNames)}</div>
    <div style="font-size: 12px; margin-top: 2px; color: var(--text-secondary);">${currentTrip.dates?.start || ''} to ${currentTrip.dates?.end || ''}</div>
`;} else {
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
    currentList.push({ 
        name, 
        category, 
        reason: 'Custom item', 
        essential: false, 
        checked: false 
    });
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
    
    if (Notification.permission === 'granted') {
    new Notification('WanderPack', { body: 'Trip saved successfully! Redirecting to Trips page.' });
} else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
            new Notification('WanderPack', { body: 'Trip saved successfully! Redirecting to Trips page.' });
        }
    });
}
    window.location.href = 'trips.html';
}

function loadData() {
    const pending = sessionStorage.getItem('pendingTrip');
    const viewed = sessionStorage.getItem('viewTrip');
    if (pending) {
        currentTrip = JSON.parse(pending);
        currentList = currentTrip.packingList || [];
        sessionStorage.removeItem('pendingTrip');
        cameFromTrips = false;
    } else if (viewed) {
        currentTrip = JSON.parse(viewed);
        currentList = currentTrip.packingList || [];
        sessionStorage.removeItem('viewTrip');
        cameFromTrips = true;
    } else {
        currentTrip = null;
        currentList = [];
        cameFromTrips = false;
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
