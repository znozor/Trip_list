// list.js
let currentTrip = null;
let packingList = null;

function generatePackingList(trip) {
  // Simplified – you can expand logic based on weather/activities
  return {
    mandatory: { title: '⭐ Mandatory', items: [
      { name: 'Passport / ID', checked: false },
      { name: 'Wallet / Cards', checked: false },
      { name: 'Phone + Charger', checked: false },
      { name: 'Prescription Medications', checked: false }
    ]},
    weather: { title: '🌤️ Weather‑Based', items: [
      { name: 'Sunscreen SPF 30+', checked: false },
      { name: 'Umbrella', checked: false },
      { name: 'Light Jacket', checked: false }
    ]},
    activity: { title: '🎒 Activity‑Based', items: [
      { name: 'Comfortable walking shoes', checked: false },
      { name: 'Day backpack', checked: false }
    ]}
  };
}

function renderPackingList() {
  const container = document.getElementById('packingListBody');
  container.innerHTML = '';
  let total = 0, checked = 0;
  for (const cat in packingList) {
    const items = packingList[cat].items;
    total += items.length;
    checked += items.filter(i => i.checked).length;
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<h3>${packingList[cat].title}</h3>${items.map((item, idx) => `
      <div class="pack-item">
        <div class="item-checkbox ${item.checked ? 'checked' : ''}" data-cat="${cat}" data-idx="${idx}"></div>
        <span class="item-name">${item.name}</span>
        <a href="#" class="item-buy" onclick="event.preventDefault();showToast('Demo: Amazon link')">Buy →</a>
      </div>
    `).join('')}`;
    container.appendChild(card);
  }
  document.getElementById('listProgress').innerText = `${checked}/${total} items packed`;
  // attach checkbox events
  document.querySelectorAll('.item-checkbox').forEach(cb => {
    cb.addEventListener('click', () => {
      const cat = cb.dataset.cat;
      const idx = parseInt(cb.dataset.idx);
      packingList[cat].items[idx].checked = !packingList[cat].items[idx].checked;
      renderPackingList();
    });
  });
}

function addCustomItem() {
  const name = prompt('Enter custom item name:');
  if (name) {
    packingList.mandatory.items.push({ name, checked: false });
    renderPackingList();
    showToast(`"${name}" added`, 'success');
  }
}

async function saveCurrentTrip() {
  if (!currentTrip) { showToast('No trip to save', 'warning'); return; }
  if (window.currentUser) {
    const tripData = {
      title: `${currentTrip.city}, ${currentTrip.country}`,
      startDate: currentTrip.startDate,
      endDate: currentTrip.endDate,
      reason: currentTrip.reason,
      style: currentTrip.style,
      travelersCount: 1,
      luggage: currentTrip.luggage
    };
    const saved = await saveTripToSupabase(tripData);
    if (saved) showToast('Trip saved to cloud!', 'success');
  } else {
    const trips = JSON.parse(localStorage.getItem('wanderpack_trips') || '[]');
    const newTrip = { id: Date.now(), ...currentTrip, list: packingList, savedAt: new Date().toISOString() };
    trips.unshift(newTrip);
    localStorage.setItem('wanderpack_trips', JSON.stringify(trips));
    showToast('Trip saved locally (guest mode)', 'success');
  }
}

// Load trip from sessionStorage
const stored = sessionStorage.getItem('pendingTrip');
if (stored) {
  currentTrip = JSON.parse(stored);
  packingList = generatePackingList(currentTrip);
  document.getElementById('tripBadge').innerHTML = `${currentTrip.city}, ${currentTrip.country} • ${currentTrip.startDate} to ${currentTrip.endDate}`;
  renderPackingList();
} else {
  document.getElementById('tripBadge').innerHTML = 'No trip data';
}

document.getElementById('saveTripBtn').addEventListener('click', saveCurrentTrip);
document.getElementById('addCustomItemBtn').addEventListener('click', addCustomItem);
initAuth();
