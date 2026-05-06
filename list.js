// list.js – displays list, saves to localStorage, clears after save
let currentList = [];
let currentTrip = null;

function loadData() {
  // Only load if we have a pending trip (from plan.html) or a viewed trip (from trips.html)
  const pending = sessionStorage.getItem('pendingTrip');
  const viewed = sessionStorage.getItem('viewTrip');
  if (pending) {
    currentTrip = JSON.parse(pending);
    currentList = generatePackingList(currentTrip.weather, currentTrip.preferences);
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

function renderPackingList() { /* same as before but with empty state */ }

function saveTrip() {
  if (!currentTrip) return alert('No trip to save');
  // Save to localStorage
  let saved = JSON.parse(localStorage.getItem('userTrips') || '[]');
  currentTrip.packingList = currentList;
  currentTrip.savedAt = new Date().toISOString();
  const idx = saved.findIndex(t => t.id === currentTrip.id);
  if (idx !== -1) saved[idx] = currentTrip;
  else saved.unshift(currentTrip);
  localStorage.setItem('userTrips', JSON.stringify(saved));
  // Clear current session
  currentTrip = null;
  currentList = [];
  renderPackingList();
  alert('Trip saved! View in "Trips".');
  // Optionally redirect to trips page
  window.location.href = 'trips.html';
}

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  document.getElementById('addCustomItemBtn')?.addEventListener('click', addCustomItem);
  document.getElementById('saveTripBtn')?.addEventListener('click', saveTrip);
});
