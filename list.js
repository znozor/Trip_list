// list.js – displays list with reasons, essential badges, and weather confidence
let currentList = [];
let currentTrip = null;

function renderPackingList() {
    const container = document.getElementById('packingListBody');
    const badge = document.getElementById('tripBadge');
    const progressSpan = document.getElementById('listProgress');
    const confidenceDiv = document.getElementById('weatherConfidence');
    
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
                    ? '✅ Real‑time forecast (updated within 14 days) – High confidence' 
                    : '📊 Climate averages (based on 30‑year data) – Moderate confidence'}
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
            html += `
                <div class="pack-item" data-cat="${escapeHtml(category)}" data-idx="${idx}">
                    <div class="item-checkbox ${item.checked ? 'checked' : ''}" data-cat="${escapeHtml(category)}" data-idx="${idx}"></div>
                    <div class="item-details">
                        <span class="item-name">${escapeHtml(item.name)}</span>
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
    
    // Add last‑minute reminders section (if not already present)
    if (!document.querySelector('.reminders-card')) {
        addRemindersSection();
    }
    
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

function addRemindersSection() {
    const container = document.getElementById('packingListBody');
    const reminders = [
        { text: "🛂 Check passport expiry (need 6 months validity for many countries)", checked: false },
        { text: "💳 Notify your bank of travel dates to avoid card freeze", checked: false },
        { text: "📱 Download offline maps and translation apps", checked: false },
        { text: "📸 Take photos of important documents (cloud backup)", checked: false },
        { text: "🏠 Arrange pet / plant care at home", checked: false },
        { text: "🔋 Charge all electronics and pack power bank", checked: false },
        { text: "💊 Refill prescriptions and pack a small first‑aid kit", checked: false }
    ];
    let html = `<div class="card reminders-card"><h3><i class="fa-regular fa-bell"></i> Last‑minute reminders</h3>`;
    reminders.forEach(r => {
        html += `<div class="pack-item"><div class="item-checkbox"></div><span class="item-name">${escapeHtml(r.text)}</span></div>`;
    });
    html += `</div>`;
    container.insertAdjacentHTML('beforeend', html);
    
    // Attach toggle for reminder checkboxes
    const reminderCheckboxes = container.querySelectorAll('.reminders-card .item-checkbox');
    reminderCheckboxes.forEach(cb => {
        cb.addEventListener('click', () => cb.classList.toggle('checked'));
    });
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
