// trips.js
async function renderTrips() {
  let trips = [];
  if (window.currentUser) {
    trips = await getTripsFromSupabase();
  } else {
    trips = JSON.parse(localStorage.getItem('wanderpack_trips') || '[]');
  }
  const container = document.getElementById('tripsList');
  if (!trips.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🗺️</div><p>No trips saved yet. Create your first packing list!</p></div>';
    return;
  }
  container.innerHTML = trips.map(t => `
    <div class="trip-card">
      <div><strong>${t.title || t.city}</strong><br><small>${t.start_date || t.startDate} → ${t.end_date || t.endDate}</small></div>
      <div class="trip-actions" style="margin-top: 12px;">
        <button class="btn btn-sm btn-outline" onclick="deleteTrip('${t.id}')">Delete</button>
        <button class="btn btn-sm" onclick="alert('View trip (demo)')">View</button>
      </div>
    </div>
  `).join('');
}

window.deleteTrip = async (id) => {
  if (!confirm('Delete this trip?')) return;
  if (window.currentUser) {
    await supabase.from('trips').delete().eq('id', id);
    showToast('Deleted from cloud', 'success');
  } else {
    let trips = JSON.parse(localStorage.getItem('wanderpack_trips') || '[]');
    trips = trips.filter(t => t.id != id);
    localStorage.setItem('wanderpack_trips', JSON.stringify(trips));
    showToast('Deleted locally', 'success');
  }
  renderTrips();
};

initAuth().then(renderTrips);
