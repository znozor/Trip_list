// list.js
let currentTrip = null;
let packingList = null;

function generatePackingList(tripInfo) {
  // Simplified version – same logic as before
  const isHot = true; // Placeholder; replace with climate logic
  return {
    mandatory: { title: 'Mandatory', items: [{name:'Passport',checked:false},{name:'Phone charger',checked:false}] },
    weather: { title: 'Weather‑Based', items: [{name:'Sunscreen',checked:false},{name:'Umbrella',checked:false}] },
    activity: { title: 'Activity‑Based', items: [{name:'Hiking boots',checked:false}] }
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
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<h3>${packingList[cat].title}</h3>${items.map((item, idx) => `<div class="pack-item"><div class="item-checkbox" onclick="toggleItem('${cat}',${idx})"></div><span>${item.name}</span><a href="#" class="item-buy" onclick="event.preventDefault();showToast('Demo buy link')">Buy →</a></div>`).join('')}`;
    container.appendChild(card);
  }
  document.getElementById('listProgress').innerText = `${checked}/${total} items packed`;
}

function toggleItem(cat, idx) { packingList[cat].items[idx].checked = !packingList[cat].items[idx].checked; renderPackingList(); }
function addCustomItem() { const name = prompt('Item name:'); if(name) { packingList.mandatory.items.push({name, checked:false}); renderPackingList(); showToast(`Added ${name}`); } }

function saveCurrentTrip() {
  const trips = getTrips();
  const newTrip = { id: Date.now(), ...currentTrip, list: packingList, savedAt: new Date().toISOString() };
  trips.unshift(newTrip);
  saveTrips(trips);
  showToast('Trip saved to My Trips', 'success');
}

// Load trip from sessionStorage
const stored = sessionStorage.getItem('pendingTrip');
if (stored) {
  currentTrip = JSON.parse(stored);
  packingList = generatePackingList(currentTrip);
  document.getElementById('tripBadge').innerHTML = `${currentTrip.city}, ${currentTrip.country} • ${currentTrip.startDate || '?'} – ${currentTrip.endDate || '?'}`;
  renderPackingList();
} else { document.getElementById('tripBadge').innerHTML = 'No trip data'; }
