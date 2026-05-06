// trips.js – load trips, show detail, update weather, notifications
let trips = [];
let currentViewTrip = null;

async function loadTrips() {
    if (window.currentUser) {
        trips = await getTripsFromSupabase();
    } else {
        trips = JSON.parse(localStorage.getItem('userTrips') || '[]');
    }
    return trips;
}

function renderTrips() {
    const container = document.getElementById('tripsList');
    if (!trips.length) {
        container.innerHTML = '<div class="empty-state">No trips saved yet. Create one!</div>';
        return;
    }
    const today = new Date();
    container.innerHTML = trips.map(trip => {
        const start = new Date(trip.dates?.start);
        const daysLeft = Math.ceil((start - today) / (1000*60*60*24));
        const showUpdate = daysLeft <= 14 && daysLeft >= 0;
        // Prepare notification if within 14 days and not yet sent (track in localStorage)
        const notifKey = `notif_${trip.id}`;
        if (showUpdate && !localStorage.getItem(notifKey) && Notification.permission === 'granted') {
            new Notification('WanderPack: Update your packing list', {
                body: `Your trip to ${trip.name} starts in ${daysLeft} days. Update your list with latest weather!`,
                icon: '/favicon.ico'
            });
            localStorage.setItem(notifKey, 'sent');
        }
        return `
            <div class="trip-card" data-id="${trip.id}">
                <div><strong>${trip.name}</strong><br>
                <small>${trip.dates?.start || '?'} → ${trip.dates?.end || '?'}</small></div>
                <div style="margin-top: 8px;">
                    <button class="btn btn-sm btn-outline view-trip">View List</button>
                    ${showUpdate ? '<button class="btn btn-sm btn-primary update-weather-btn">🌦️ Update Weather</button>' : ''}
                    <button class="btn btn-sm delete-trip" style="color:red;">Delete</button>
                </div>
            </div>
        `;
    }).join('');
    
    // Attach event listeners
    document.querySelectorAll('.view-trip').forEach((btn, idx) => {
        btn.onclick = () => openTripModal(trips[idx]);
    });
    document.querySelectorAll('.update-weather-btn').forEach((btn, idx) => {
        btn.onclick = () => openTripModal(trips[idx], true);
    });
    document.querySelectorAll('.delete-trip').forEach((btn, idx) => {
        btn.onclick = async () => {
            if (confirm('Delete this trip?')) {
                const id = trips[idx].id;
                if (window.currentUser) {
                    await supabase.from('trips').delete().eq('id', id);
                } else {
                    const newTrips = trips.filter(t => t.id !== id);
                    localStorage.setItem('userTrips', JSON.stringify(newTrips));
                }
                await loadTrips();
                renderTrips();
                showToast('Trip deleted');
            }
        };
    });
}

function openTripModal(trip, focusUpdate = false) {
    currentViewTrip = trip;
    const modal = document.getElementById('tripModal');
    const modalContent = document.getElementById('modalContent');
    const updateBtnDiv = document.getElementById('updateWeatherBtn');
    
    const listHtml = trip.packingList ? trip.packingList.map(item => 
        `<div class="pack-item"><div class="item-checkbox ${item.checked ? 'checked' : ''}"></div><span>${item.name}</span></div>`
    ).join('') : '<p>No list generated yet.</p>';
    
    modalContent.innerHTML = `
        <div><strong>Destination:</strong> ${trip.destinations?.main?.cities?.[0] || trip.name}</div>
        <div><strong>Dates:</strong> ${trip.dates?.start} to ${trip.dates?.end}</div>
        <div><strong>Weather at creation:</strong> ${trip.weather?.condition} (${trip.weather?.avgTemp}°C)</div>
        <div style="margin-top: 12px;"><strong>Packing List:</strong></div>
        <div id="modalList">${listHtml}</div>
    `;
    
    // Show update button only if within 14 days or focusUpdate flag
    const start = new Date(trip.dates?.start);
    const daysLeft = Math.ceil((start - new Date()) / (1000*60*60*24));
    if (daysLeft <= 14 || focusUpdate) {
        updateBtnDiv.style.display = 'block';
        document.getElementById('doUpdateWeather').onclick = () => updateWeatherForTrip(trip);
    } else {
        updateBtnDiv.style.display = 'none';
    }
    modal.style.display = 'flex';
}

async function updateWeatherForTrip(trip) {
    showToast('Fetching latest weather...', 'info');
    // Use the same weather API as in plan.js (Open-Meteo)
    const city = trip.destinations?.main?.cities?.[0];
    const country = trip.destinations?.main?.country;
    const startDate = trip.dates?.start;
    if (!city || !startDate) {
        showToast('Missing destination or date', 'danger');
        return;
    }
    try {
        // Geocode
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
        const geoData = await geoRes.json();
        if (!geoData.results || !geoData.results.length) throw new Error('City not found');
        const { latitude, longitude } = geoData.results[0];
        // Fetch forecast for the start date (up to 7 days)
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&timezone=auto&forecast_days=7`;
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();
        if (!weatherData.daily) throw new Error('No forecast');
        
        // Compute weather summary (same logic as plan.js)
        const maxTemp = weatherData.daily.temperature_2m_max[0];
        const minTemp = weatherData.daily.temperature_2m_min[0];
        const avgTemp = (maxTemp + minTemp) / 2;
        const hasRain = weatherData.daily.weathercode[0] >= 51 && weatherData.daily.weathercode[0] <= 67;
        const hasSnow = weatherData.daily.weathercode[0] >= 71 && weatherData.daily.weathercode[0] <= 77;
        let condition = 'Mild';
        if (hasSnow) condition = 'Snowy';
        else if (hasRain) condition = 'Rainy';
        else if (avgTemp > 25) condition = 'Hot';
        else if (avgTemp < 10) condition = 'Cold';
        
        const newWeather = { avgTemp, condition, rainy: hasRain, snowy: hasSnow };
        
        // Regenerate packing list based on new weather + existing preferences
        const activities = trip.preferences?.activities || [];
        const style = trip.preferences?.style || 'Standard';
        const who = trip.preferences?.who || 'Solo';
        const luggage = trip.preferences?.luggage || 'Checked';
        
        let newItems = [];
        // Clothing logic (same as in plan.js)
        if (condition === 'Hot') {
            newItems.push({ name: 'T-shirts (3-4)', category: 'Clothing', checked: false });
            newItems.push({ name: 'Shorts (2-3)', category: 'Clothing', checked: false });
            if (activities.includes('Beach')) newItems.push({ name: 'Swimwear', category: 'Clothing', checked: false });
        } else if (condition === 'Cold') {
            newItems.push({ name: 'Thermal base layers', category: 'Clothing', checked: false });
            newItems.push({ name: 'Sweaters / fleece', category: 'Clothing', checked: false });
            newItems.push({ name: 'Heavy jacket / coat', category: 'Clothing', checked: false });
            newItems.push({ name: 'Gloves, scarf, beanie', category: 'Accessories', checked: false });
        } else {
            newItems.push({ name: 'Long-sleeve shirts', category: 'Clothing', checked: false });
            newItems.push({ name: 'T-shirts', category: 'Clothing', checked: false });
            newItems.push({ name: 'Jeans / trousers', category: 'Clothing', checked: false });
            newItems.push({ name: 'Light jacket or cardigan', category: 'Clothing', checked: false });
        }
        if (hasRain) newItems.push({ name: 'Rain jacket / umbrella', category: 'Gear', checked: false });
        if (hasSnow) newItems.push({ name: 'Waterproof boots', category: 'Footwear', checked: false });
        newItems.push({ name: 'Comfortable walking shoes', category: 'Footwear', checked: false });
        if (activities.includes('Hiking')) newItems.push({ name: 'Hiking boots', category: 'Footwear', checked: false });
        if (style === 'Luxury' || activities.includes('Shopping')) newItems.push({ name: 'Dress shoes / sandals', category: 'Footwear', checked: false });
        if (activities.includes('Beach')) newItems.push({ name: 'Beach towel', category: 'Accessories', checked: false });
        if (activities.includes('Hiking')) newItems.push({ name: 'Day backpack', category: 'Gear', checked: false });
        if (activities.includes('City Tours')) newItems.push({ name: 'Portable charger', category: 'Electronics', checked: false });
        if (who === 'Family') newItems.push({ name: 'First-aid kit', category: 'Health', checked: false });
        if (luggage === 'Carry-on') newItems = newItems.slice(0, 12);
        newItems.push({ name: 'Toothbrush & toothpaste', category: 'Toiletries', checked: false });
        newItems.push({ name: 'Shampoo & soap', category: 'Toiletries', checked: false });
        if (condition === 'Hot') newItems.push({ name: 'Sunscreen', category: 'Health', checked: false });
        
        // Update trip object
        trip.weather = newWeather;
        trip.packingList = newItems;
        // Update in localStorage / Supabase
        const tripsArray = JSON.parse(localStorage.getItem('userTrips') || '[]');
        const idx = tripsArray.findIndex(t => t.id === trip.id);
        if (idx !== -1) tripsArray[idx] = trip;
        localStorage.setItem('userTrips', JSON.stringify(tripsArray));
        // Also update the current view if we're in list.html later
        showToast('List updated with latest weather!', 'success');
        // Refresh modal display
        openTripModal(trip, false);
    } catch (err) {
        console.error(err);
        showToast('Failed to update weather', 'danger');
    }
}

function closeModal() {
    document.getElementById('tripModal').style.display = 'none';
}

async function init() {
    await loadTrips();
    renderTrips();
}

initAuth().then(init);
