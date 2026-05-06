async function renderTrips() {
  let trips = [];
  if (window.currentUser) trips = await getTripsFromSupabase();
  else trips = JSON.parse(localStorage.getItem('wanderpack_trips') || '[]');
  const container = document.getElementById('tripsList');
  if (!trips.length) { container.innerHTML = '<div class="empty-state">No trips saved yet. Create one!</div>'; return; }
  const today = new Date();
  container.innerHTML = trips.map(trip => {
    const start = new Date(trip.start_date || trip.startDate);
    const daysLeft = Math.ceil((start - today) / (1000*60*60*24));
    const showUpdate = daysLeft <= 14 && daysLeft >= 0;
    return `
      <div class="trip-card" data-id="${trip.id}">
        <div><strong>${trip.city || trip.title}</strong><br><small>${trip.start_date || trip.startDate} → ${trip.end_date || trip.endDate}</small></div>
        <div style="margin-top: 8px;">
          <button class="btn btn-sm btn-outline view-trip">View List</button>
          ${showUpdate ? '<button class="btn btn-sm btn-primary update-weather">🌦️ Update Weather</button>' : ''}
          <button class="btn btn-sm delete-trip" style="color:red;">Delete</button>
        </div>
      </div>
    `;
  }).join('');
  document.querySelectorAll('.view-trip').forEach(btn => {
    btn.onclick = (e) => {
      const card = e.target.closest('.trip-card');
      const id = card.dataset.id;
      const trip = trips.find(t => t.id == id);
      sessionStorage.setItem('viewTrip', JSON.stringify(trip));
      window.location.href = 'list.html?view=trip';
    };
  });
  document.querySelectorAll('.delete-trip').forEach(btn => {
    btn.onclick = async (e) => {
      if (!confirm('Delete this trip?')) return;
      const card = e.target.closest('.trip-card');
      const id = card.dataset.id;
      if (window.currentUser) await supabase.from('trips').delete().eq('id', id);
      else {
        let trips = JSON.parse(localStorage.getItem('wanderpack_trips') || '[]');
        localStorage.setItem('wanderpack_trips', JSON.stringify(trips.filter(t => t.id != id)));
      }
      renderTrips();
    };
  });
  document.querySelectorAll('.update-weather').forEach(btn => {
    btn.onclick = (e) => {
      const card = e.target.closest('.trip-card');
      const id = card.dataset.id;
      const trip = trips.find(t => t.id == id);
      sessionStorage.setItem('updateTrip', JSON.stringify(trip));
      window.location.href = 'list.html?update=weather';
    };
  });
}
initAuth().then(renderTrips);
