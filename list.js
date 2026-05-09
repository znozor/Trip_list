// list.js – Complete working version with centered popup
let currentList = [];
let currentTrip = null;
let cameFromTrips = false;

function renderPackingList() {
    const container = document.getElementById('packingListBody');
    const badge = document.getElementById('tripBadge');
    const progressSpan = document.getElementById('listProgress');
    const confidenceDiv = document.getElementById('weatherConfidence');
    const backBtn = document.getElementById('backButton');
    
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
    
    // Weather confidence
    if (confidenceDiv && currentTrip?.weather?.forecastType) {
        const isReal = currentTrip.weather.forecastType === 'real';
        confidenceDiv.innerHTML = `
            <div class="confidence-card">
                <i class="fa-solid ${isReal ? 'fa-cloud-sun' : 'fa-chart-line'}"></i>
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
                    <a href="#" class="item-buy" onclick="event.preventDefault();showCustomPopup('Affiliate link demo', 'info')">Buy →</a>
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
                const nameSpan = cb.closest('.pack-item').querySelector('.item-name');
                if (nameSpan) nameSpan.classList.toggle('checked-text');
                updateProgress();
            }
        });
    });
    
    // Trip badge – country above, full city names below
    if (currentTrip && currentTrip.destinations) {
        const country = currentTrip.destinations.main?.country || '';
        const cities = currentTrip.destinations.main?.cities || [];
        const cityNames = cities.join(', ');
        badge.innerHTML = `
            <div><strong>${escapeHtml(country)}</strong></div>
            <div style="font-size: 13px; margin-top: 4px;">${escapeHtml(cityNames)}</div>
            <div style="font-size: 12px; margin-top: 2px; color: var(--text-secondary);">${currentTrip.dates?.start || ''} to ${currentTrip.dates?.end || ''}</div>
        `;
    } else if (currentTrip && currentTrip.name) {
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

// ========== CENTERED POPUP (no CSS dependencies, no browser notification) ==========
function showCustomPopup(message, type = 'success') {
    console.log('📢 showCustomPopup:', message, type);
    
    // Remove any existing popup
    const existing = document.querySelector('.custom-popup-fixed');
    if (existing) existing.remove();
    
    const popup = document.createElement('div');
    popup.className = 'custom-popup-fixed';
    
    // Hardcoded inline styles – guarantees centering
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.zIndex = '100000';
    popup.style.backgroundColor = '#FFFFFF';
    popup.style.borderRadius = '28px';
    popup.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';
    popup.style.padding = '24px 32px';
    popup.style.minWidth = '280px';
    popup.style.maxWidth = '90%';
    popup.style.textAlign = 'center';
    
    let borderColor = '#2E9C6E';
    let iconClass = 'fa-circle-check';
    let iconColor = '#2E9C6E';
    if (type === 'error') {
        borderColor = '#e74c3c';
        iconClass = 'fa-circle-exclamation';
        iconColor = '#e74c3c';
    } else if (type === 'info') {
        borderColor = '#06A77D';
        iconClass = 'fa-circle-info';
        iconColor = '#06A77D';
    }
    popup.style.borderTop = `4px solid ${borderColor}`;
    
    popup.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 16px; font-size: 16px; font-weight: 500; color: #1e2b2c;">
            <i class="fa-solid ${iconClass}" style="font-size: 48px; color: ${iconColor};"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // Auto-remove after 2.5 seconds
    setTimeout(() => {
        if (popup.parentNode) popup.remove();
    }, 2500);
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
    showCustomPopup(`"${name}" added!`, 'success');
}

// ========== UPDATED saveTrip with session refresh ==========
async function saveTrip() {
    console.log('💾 saveTrip called');

    // Disable button immediately to prevent multiple saves
    const saveBtn = document.getElementById('saveTripBtn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';
    }

    if (window.sb) {
        const { data: { session } } = await window.sb.auth.getSession();
        window.currentUser = session?.user || null;
        console.log('Session check:', window.currentUser?.email || 'not logged in');
    }

    if (!currentTrip) {
        showCustomPopup('No trip data to save. Please generate a list first.', 'error');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 Save Trip'; }
        return;
    }

    if (!currentTrip.id) currentTrip.id = Date.now();
    currentTrip.packingList = currentList;
    currentTrip.savedAt = new Date().toISOString();

    const isLoggedIn = !!(window.currentUser && window.sb && typeof window.saveTripToSupabase === 'function');
    console.log('isLoggedIn:', isLoggedIn, '| user:', window.currentUser?.email);

    if (isLoggedIn) {
        const tripData = {
            title: currentTrip.name,
            startDate: currentTrip.dates?.start,
            endDate: currentTrip.dates?.end,
            reason: currentTrip.preferences?.reason,
            style: currentTrip.preferences?.style,
            travelersCount: currentTrip.preferences?.travelersCount || 1,
            luggage: currentTrip.preferences?.luggage,
            packingList: currentList,
            preferences: { ...currentTrip.preferences, destinations: currentTrip.destinations },
            weather: currentTrip.weather
        };

        const result = await window.saveTripToSupabase(tripData);
        if (result) {
            showCustomPopup('✅ Trip saved to cloud!', 'success');
            console.log('Saved to Supabase', result);
        } else {
            showCustomPopup('⚠️ Trip saved but items may be incomplete.', 'success');
        }
    } else {
        let savedTrips = JSON.parse(localStorage.getItem('userTrips') || '[]');
        const existingIndex = savedTrips.findIndex(t => t.id === currentTrip.id);
        if (existingIndex !== -1) savedTrips[existingIndex] = currentTrip;
        else savedTrips.unshift(currentTrip);
        localStorage.setItem('userTrips', JSON.stringify(savedTrips));
        showCustomPopup('✅ Trip saved locally (guest)', 'success');
    }

    // Clear and redirect
    currentTrip = null;
    currentList = [];
    renderPackingList();

    setTimeout(() => {
        window.location.href = 'trips.html';
    }, 1500);
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
    console.log('✅ list.js initialized, save button ready');
});
