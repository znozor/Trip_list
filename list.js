let currentTrip = null;
let packingList = null;

function generatePackingList(trip) {
  return {
    mandatory: { title: '⭐ Mandatory', items: [
      { name: 'Passport / ID', checked: false },
      { name: 'Wallet / Cards', checked: false },
      { name: 'Phone + Charger', checked: false },
      { name: 'Prescription Meds', checked: false }
    ]},
    weather: { title: '🌤️ Weather‑Based', items: [
      { name: 'Sunscreen SPF 30+', checked: false },
      { name: 'Umbrella', checked: false }
    ]},
    activity: { title: '🎒 Activity‑Based', items: [
      { name: 'Comfortable shoes', checked: false },
      { name: 'Backpack', checked: false }
    ]}
  };
}

function renderPackingList() {
  const container = document.getElementById('packingListBody');
  container.innerHTML = '';
  let total = 0, checked = 0;
  for (let cat in packingList) {
    const items = packingList[cat].items;
    total += items.length;
    checked += items.filter(i => i.checked).length;
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `<h3>${packingList[cat].title}</h3>${items.map((item, idx) => `
      <div class="pack-item">
        <div class="item-checkbox ${item.checked ? 'checked' : ''}" data-cat="${cat}" data-idx="${idx}"></div>
        <span class="item-name">${item.name}</span>
        <a href="#" class="item-buy" onclick="event.preventDefault();showToast('Demo Amazon link')">Buy →</a>
      </div>
    `).join('')}`;
    container.appendChild(card);
  }
  document.getElementById('listProgress').innerText = `${checked}/${total} items packed`;
  document.querySelectorAll('.item-checkbox').forEach(cb => {
    cb.addEventListener('click', () => {
      const cat = cb.dataset.cat, idx = parseInt(cb.dataset.idx);
      packingList[cat].items[idx].checked = !packingList[cat].items[idx].checked;
      renderPackingList();
    });
  });
}

function addCustomItem() {
  const name = prompt('Item name:');
  if (name) { packingList.mandatory.items.push({ name, checked: false }); renderPackingList(); showToast(`"${name}" added`); }
}

async function saveCurrentTrip() {
  if (!currentTrip) { showToast('No trip to save', 'warning'); return; }
  const tripToSave = {
    id: Date.now(),
    ...currentTrip,
    list: packingList,
    savedAt: new Date().toISOString()
  };
  if (window.currentUser) {
    const result = await saveTripToSupabase({
      title: `${currentTrip.city}, ${currentTrip.country}`,
      startDate: currentTrip.startDate,
      endDate: currentTrip.endDate,
      reason: currentTrip.reason,
      style: currentTrip.style,
      luggage: currentTrip.luggage
    });
    if (result) showToast('Saved to cloud!', 'success');
  } else {
    let trips = JSON.parse(localStorage.getItem('wanderpack_trips') || '[]');
    trips.unshift(tripToSave);
    localStorage.setItem('wanderpack_trips', JSON.stringify(trips));
    showToast('Saved locally (guest)', 'success');
  }
}

const stored = sessionStorage.getItem('pendingTrip');
if (stored) {
  currentTrip = JSON.parse(stored);
  packingList = generatePackingList(currentTrip);
  document.getElementById('tripBadge').innerHTML = `${currentTrip.city}, ${currentTrip.country} • ${currentTrip.startDate} to ${currentTrip.endDate}`;
  renderPackingList();
} else {
  document.getElementById('tripBadge').innerHTML = 'No active trip. Create one first.';
}
document.getElementById('saveTripBtn').onclick = saveCurrentTrip;
document.getElementById('addCustomItemBtn').onclick = addCustomItem;
initAuth();
