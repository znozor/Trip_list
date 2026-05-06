// shared.js – common utilities
function showToast(msg, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) { container = document.createElement('div'); container.id = 'toastContainer'; container.className = 'toast-container'; document.body.appendChild(container); }
  const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.innerHTML = `<i class="fa-solid ${type==='success'?'fa-circle-check':'fa-circle-info'}"></i> ${msg}`;
  container.appendChild(toast); setTimeout(() => toast.remove(), 3000);
}
function getTrips() { return JSON.parse(localStorage.getItem('wanderpack_trips') || '[]'); }
function saveTrips(trips) { localStorage.setItem('wanderpack_trips', JSON.stringify(trips)); }
